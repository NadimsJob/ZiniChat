import { Injectable, Logger, OnModuleInit, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InboxGateway } from '../../inbox/inbox.gateway';
import { InboxService } from '../../inbox/inbox.service';
import { BillingService } from '../../billing/billing.service';
import { NotificationsService } from '../../notifications/notifications.service';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { resolveLocalMediaPath } from '../../storage/storage.service';
function unwrapBaileysMessage(raw: any): any {
  if (!raw || typeof raw !== 'object') return null;
  let current = raw;
  let depth = 0;
  while (current && typeof current === 'object' && depth < 15) {
    depth++;
    if (current.ephemeralMessage?.message) { current = current.ephemeralMessage.message; continue; }
    if (current.viewOnceMessage?.message) { current = current.viewOnceMessage.message; continue; }
    if (current.viewOnceMessageV2?.message) { current = current.viewOnceMessageV2.message; continue; }
    if (current.viewOnceMessageV2Extension?.message) { current = current.viewOnceMessageV2Extension.message; continue; }
    if (current.documentWithCaptionMessage?.message) { current = current.documentWithCaptionMessage.message; continue; }
    if (current.deviceSentMessage?.message) { current = current.deviceSentMessage.message; continue; }
    if (current.botInvokeMessage?.message) { current = current.botInvokeMessage.message; continue; }
    if (current.associatedChildMessage?.message) { current = current.associatedChildMessage.message; continue; }
    if (current.keepInChatMessage?.message) { current = current.keepInChatMessage.message; continue; }
    if (current.statusQuotedMessage?.message) { current = current.statusQuotedMessage.message; continue; }
    if (current.editedMessage?.message?.protocolMessage?.editedMessage) {
      current = current.editedMessage.message.protocolMessage.editedMessage;
      continue;
    }
    if (current.editedMessage?.message) { current = current.editedMessage.message; continue; }
    if (current.protocolMessage?.editedMessage) { current = current.protocolMessage.editedMessage; continue; }
    break;
  }
  return current;
}

function extractAnyTextFromPayload(obj: any, maxDepth = 4): string {
  if (!obj || typeof obj !== 'object' || maxDepth <= 0) return '';
  const priorityKeys = [
    'conversation', 'text', 'caption', 'body', 'title', 'selectedDisplayText',
    'selectedButtonId', 'selectedRowId', 'displayName', 'description', 'contentText',
    'name', 'vcard', 'message', 'paramsJson'
  ];
  for (const k of priorityKeys) {
    if (typeof obj[k] === 'string' && obj[k].trim()) {
      if (k === 'paramsJson') {
        try {
          const parsed = JSON.parse(obj[k]);
          const innerText = parsed.title || parsed.display_text || parsed.id || parsed.name;
          if (innerText) return String(innerText).trim();
        } catch {}
      } else {
        return obj[k].trim();
      }
    }
  }
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const found = extractAnyTextFromPayload(obj[key], maxDepth - 1);
      if (found) return found;
    }
  }
  return '';
}

@Injectable()
export class WhatsappWebService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappWebService.name);
  private sockets: Map<string, any> = new Map();
  // Cache connectionId per tenant to avoid race condition on first message
  private connectionIds: Map<string, string> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private lidToPnMap: Map<string, Map<string, string>> = new Map();

  loadLidMappingsForTenant(tenantId: string): Map<string, string> {
    let tenantMap = this.lidToPnMap.get(tenantId);
    if (!tenantMap) {
      tenantMap = new Map<string, string>();
      this.lidToPnMap.set(tenantId, tenantMap);
    }
    try {
      const sessionDir = path.join(process.cwd(), 'sessions', 'whatsapp_web', tenantId);
      if (fs.existsSync(sessionDir)) {
        const files = fs.readdirSync(sessionDir);
        for (const file of files) {
          if (file.startsWith('lid-mapping-') && file.endsWith('.json')) {
            try {
              const filePath = path.join(sessionDir, file);
              const content = fs.readFileSync(filePath, 'utf8').trim();
              const rawVal = JSON.parse(content);
              if (file.endsWith('_reverse.json')) {
                const lid = file.replace('lid-mapping-', '').replace('_reverse.json', '').replace(/\D/g, '');
                const pn = String(rawVal).replace(/\D/g, '');
                if (lid && pn) tenantMap.set(lid, pn);
              } else {
                const pn = file.replace('lid-mapping-', '').replace('.json', '').replace(/\D/g, '');
                const lid = String(rawVal).replace(/\D/g, '');
                if (lid && pn) tenantMap.set(lid, pn);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to scan lid-mapping files for ${tenantId}: ${err.message}`);
    }
    return tenantMap;
  }

  async resolvePnFromLid(tenantId: string, lid: string, sock?: any): Promise<string | null> {
    const cleanLid = (lid || '').replace(/\D/g, '');
    if (!cleanLid) return null;

    let tenantMap = this.lidToPnMap.get(tenantId);
    if (!tenantMap || tenantMap.size === 0) {
      tenantMap = this.loadLidMappingsForTenant(tenantId);
    }
    if (tenantMap.has(cleanLid)) {
      return tenantMap.get(cleanLid)!;
    }

    if (sock?.signalRepository?.lidMapping) {
      try {
        const lidJid = `${cleanLid}@lid`;
        const pnJid = await sock.signalRepository.lidMapping.getPNForLID(lidJid);
        if (pnJid) {
          const pn = pnJid.split('@')[0].split(':')[0].replace(/\D/g, '');
          if (pn) {
            tenantMap.set(cleanLid, pn);
            return pn;
          }
        }
      } catch {}
    }

    tenantMap = this.loadLidMappingsForTenant(tenantId);
    return tenantMap.get(cleanLid) || null;
  }

  async healLidContact(tenantId: string, lid: string, pn: string) {
    try {
      const cleanLid = lid.replace(/\D/g, '');
      const cleanPn = pn.replace(/\D/g, '');
      if (!cleanLid || !cleanPn) return;

      const contact = await this.prisma.contact.findFirst({
        where: {
          tenantId,
          channel: 'whatsapp',
          OR: [
            { externalContactId: cleanLid },
            { phone: cleanLid },
            { tags: { has: `lid:${cleanLid}` } }
          ]
        }
      });

      if (contact && (!contact.phone || contact.phone === cleanLid || contact.phone.length > 14)) {
        const isLidName = !contact.name || contact.name === cleanLid || contact.name === 'WhatsApp User' || /^\d{15,}$/.test(contact.name);
        const updated = await this.prisma.contact.update({
          where: { id: contact.id },
          data: {
            phone: cleanPn,
            externalContactId: cleanPn,
            name: isLidName ? `+${cleanPn}` : contact.name,
            tags: contact.tags.includes(`lid:${cleanLid}`) ? contact.tags : [...contact.tags, `lid:${cleanLid}`]
          }
        });
        this.inboxGateway.broadcastToTenant(tenantId, 'contact:updated', updated);
        this.logger.log(`[LID Resolution] Auto-healed contact ${contact.id}: LID ${cleanLid} -> Phone ${cleanPn}`);
      }
    } catch (e: any) {
      this.logger.debug(`Failed to heal LID contact for ${lid}: ${e.message}`);
    }
  }

  private debugLog(msg: string) {
    fs.appendFileSync('wa-debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    this.logger.log(msg);
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxGateway: InboxGateway,
    private readonly inboxService: InboxService,
    private readonly billingService: BillingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleDisconnectionAlert(tenantId: string) {
    this.inboxGateway.broadcastToTenant(tenantId, 'whatsapp:disconnected', {
      tenantId,
      status: 'disconnected',
      message: 'Your WhatsApp Web session has disconnected. Please rescan the QR code to resume auto-replies.'
    });

    await this.notificationsService.createNotificationForTenantAdmins(
      tenantId,
      '🚨 WhatsApp Web Disconnected',
      'Your WhatsApp Web session has disconnected. Please rescan the QR code to resume auto-replies.',
      'info'
    ).catch(err => this.logger.error(`Failed to create disconnect notification for ${tenantId}: ${err.message}`));
  }

  isSocketConnected(tenantId: string): boolean {
    const sock = this.sockets.get(tenantId);
    if (!sock) return false;
    const isWsOpen = sock.ws?.readyState === 1;
    const hasUser = !!(sock.user || sock.authState?.creds?.me);
    return isWsOpen && hasUser;
  }

  async destroySocket(tenantId: string) {
    if (this.sockets.has(tenantId)) {
      const oldSock = this.sockets.get(tenantId);
      this.sockets.delete(tenantId);
      if (oldSock) {
        try {
          if (oldSock.ev && typeof oldSock.ev.removeAllListeners === 'function') {
            oldSock.ev.removeAllListeners('connection.update');
            oldSock.ev.removeAllListeners('creds.update');
            oldSock.ev.removeAllListeners('messages.upsert');
          }
          if (oldSock.ws && typeof oldSock.ws.close === 'function') {
            oldSock.ws.close();
          }
          if (typeof oldSock.end === 'function') {
            oldSock.end();
          }
        } catch (e) {}
      }
    }
  }

  async onModuleInit() {
    this.debugLog('Initializing WhatsappWebService...');
    const activeConnections = await this.prisma.channelConnection.findMany({
      where: { provider: 'WEB_QR', status: 'active' }
    });
    this.debugLog(`Found ${activeConnections.length} active connections to restore.`);
    for (const conn of activeConnections) {
      this.debugLog(`Restoring WhatsApp Web session for tenant ${conn.tenantId}`);
      // Pre-cache the known connectionId so first messages work immediately
      this.connectionIds.set(conn.tenantId, conn.id);
      await this.initSocket(conn.tenantId).catch(err => {
        this.debugLog(`Failed to restore session for ${conn.tenantId}: ${err.message}`);
      });
    }
  }


  // =========================================================
  // Quota + duplicate guard — called before startQr/startPairing
  // =========================================================
  private async checkWhatsappWebQuota(tenantId: string): Promise<void> {
    const quotas = await this.billingService.getTenantQuotas(tenantId);

    if (quotas.currentWhatsapp >= quotas.whatsappLimit) {
      throw new ForbiddenException(
        `WhatsApp limit reached (${quotas.currentWhatsapp}/${quotas.whatsappLimit}). ` +
        `Please upgrade your plan to connect more WhatsApp numbers.`
      );
    }

    // Block if a WEB_QR connection exists and socket is connected, or fallback to blocking if DB record exists
    const existingWebQr = await this.prisma.channelConnection.findFirst({
      where: { tenantId, provider: 'WEB_QR' }
    });

    if (existingWebQr) {
      const isLiveSocket = this.isSocketConnected(tenantId);
      if (isLiveSocket || existingWebQr.status !== 'disconnected') {
        throw new ForbiddenException(
          'A WhatsApp Web (QR) session already exists for this account. Please disconnect the existing session before connecting a new one.'
        );
      } else {
        // Clean up stale DB record so a fresh QR can be scanned
        if (this.prisma.channelConnection?.delete) {
          await this.prisma.channelConnection.delete({ where: { id: existingWebQr.id } }).catch(() => {});
        }
        await this.logout(tenantId).catch(() => {});
      }
    }
  }

  async initSocket(tenantId: string) {
    if (this.isSocketConnected(tenantId)) {
      return this.sockets.get(tenantId);
    }
    await this.destroySocket(tenantId);

    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/whatsapp_web/${tenantId}`);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      syncFullHistory: false,
      keepAliveIntervalMs: 25000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    this.sockets.set(tenantId, sock);
    this.loadLidMappingsForTenant(tenantId);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('lid-mapping.update' as any, async (mapping: any) => {
      try {
        const pairs = Array.isArray(mapping) ? mapping : [mapping];
        const tenantMap = this.lidToPnMap.get(tenantId) || this.loadLidMappingsForTenant(tenantId);
        for (const pair of pairs) {
          if (!pair?.lid || !pair?.pn) continue;
          const cleanLid = String(pair.lid).split('@')[0].split(':')[0].replace(/\D/g, '');
          const cleanPn = String(pair.pn).split('@')[0].split(':')[0].replace(/\D/g, '');
          if (cleanLid && cleanPn) {
            tenantMap.set(cleanLid, cleanPn);
            this.healLidContact(tenantId, cleanLid, cleanPn).catch(() => {});
          }
        }
      } catch (err: any) {
        this.logger.debug(`Error handling lid-mapping.update for ${tenantId}: ${err.message}`);
      }
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      this.debugLog(`Connection update for ${tenantId}: ${connection} ${lastDisconnect ? lastDisconnect.error : ''}`);

      if (qr) {
        this.debugLog(`Got QR code for tenant ${tenantId}`);
        this.inboxGateway.broadcastToTenant(tenantId, 'whatsapp_qr_code', { qr });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isReplaced = statusCode === (DisconnectReason as any)?.connectionReplaced || statusCode === 440 || statusCode === 409;
        this.debugLog(`Connection closed for ${tenantId}. Error: ${lastDisconnect?.error}, statusCode: ${statusCode}`);

        if (isLoggedOut) {
          this.debugLog(`Logged out by WhatsApp for tenant ${tenantId}. Cleaning up session.`);
          this.logout(tenantId).catch(() => {});
          this.prisma.channelConnection.updateMany({
            where: { tenantId, provider: 'WEB_QR' },
            data: { status: 'disconnected', qrStatus: 'DISCONNECTED' }
          }).catch(() => {});

          this.handleDisconnectionAlert(tenantId);
        } else if (isReplaced) {
          this.debugLog(`Connection replaced/conflict (${statusCode}) for tenant ${tenantId}. Halting automatic reconnect loop.`);
          this.handleDisconnectionAlert(tenantId);
        } else {
          const currentAttempts = (this.reconnectAttempts.get(tenantId) || 0) + 1;
          this.reconnectAttempts.set(tenantId, currentAttempts);

          if (currentAttempts <= 5) {
            const delayMs = 3000 * Math.pow(2, currentAttempts - 1);
            this.debugLog(`Connection closed for tenant ${tenantId}, scheduling automatic reconnect attempt ${currentAttempts}/5 in ${delayMs}ms...`);
            
            setTimeout(() => {
              if (this.sockets.get(tenantId) === sock && !this.isSocketConnected(tenantId)) {
                this.initSocket(tenantId).catch(err => {
                  this.debugLog(`Reconnect attempt ${currentAttempts} failed for ${tenantId}: ${err.message}`);
                });
              }
            }, delayMs);
          } else {
            this.debugLog(`Max reconnect attempts (5) reached for tenant ${tenantId}. Marking status as disconnected.`);
            this.prisma.channelConnection.updateMany({
              where: { tenantId, provider: 'WEB_QR' },
              data: { status: 'disconnected', qrStatus: 'DISCONNECTED' }
            }).catch(() => {});
            this.handleDisconnectionAlert(tenantId);
            this.reconnectAttempts.delete(tenantId);
          }
        }
      } else if (connection === 'open') {
        this.reconnectAttempts.delete(tenantId);
        this.debugLog(`Opened connection for tenant ${tenantId}`);
        this.sockets.set(tenantId, sock);
        
        // Extract phone number from JID (e.g., 8801791894967:44@s.whatsapp.net)
        let phoneNumber = null;
        const meId = sock.authState?.creds?.me?.id || sock.user?.id;
        if (meId) {
          const jid = meId.split(':')[0];
          if (jid && !jid.includes('@')) {
            phoneNumber = jid;
          } else {
            phoneNumber = meId.split('@')[0].split(':')[0];
          }
        }

        this.prisma.channelConnection.findFirst({
          where: { tenantId, provider: 'WEB_QR' }
        }).then(async (existing) => {
          if (existing) {
            await this.prisma.channelConnection.update({
              where: { id: existing.id },
              data: { status: 'active', qrStatus: 'CONNECTED', phoneNumber }
            });
            // Cache the connectionId immediately after DB update so first messages work
            this.connectionIds.set(tenantId, existing.id);
            this.debugLog(`Cached connectionId ${existing.id} for tenant ${tenantId}`);
          } else {
            const created = await this.prisma.channelConnection.create({
              data: {
                tenantId,
                channelType: 'whatsapp',
                provider: 'WEB_QR',
                status: 'active',
                qrStatus: 'CONNECTED',
                displayName: 'WhatsApp Web',
                externalAccountId: `wa_web_${tenantId.substring(0, 8)}`,
                accessTokenEncrypted: 'baileys_local_session',
                phoneNumber
              }
            });
            // Cache the newly created connectionId
            this.connectionIds.set(tenantId, created.id);
            this.debugLog(`Created & cached connectionId ${created.id} for tenant ${tenantId}`);
          }
          // Emit success AFTER database is updated (both event names for full compatibility)
          this.inboxGateway.broadcastToTenant(tenantId, 'whatsapp_qr_connected', { success: true });
          this.inboxGateway.broadcastToTenant(tenantId, 'whatsapp_connected', { success: true });
        }).catch(err => {
          this.debugLog(`Failed to save connection for ${tenantId}: ${err.message}`);
        });

      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      this.debugLog(`Got messages for ${tenantId}: type=${m.type}, count=${m.messages.length}`);
      if (m.type !== 'notify') return;
      
      for (const msg of m.messages) {
        if (!msg.message) continue;

        const isFromMe = !!msg.key.fromMe;

        let remoteJid = msg.key.remoteJid;
        // If the primary JID is a LID (Linked Device format), use the alternate standard phone JID if available
        if (remoteJid?.includes('@lid') && msg.key.remoteJidAlt) {
          remoteJid = msg.key.remoteJidAlt;
        }

        if (!remoteJid || remoteJid.includes('@status') || remoteJid === 'status@broadcast') continue;

        // If sent from owner's phone (fromMe), check if already saved in DB to prevent duplicate records
        if (isFromMe) {
          if (msg.key.id) {
            const existingMsg = await this.prisma.message.findFirst({
              where: { externalMessageId: msg.key.id }
            });
            if (existingMsg) continue;
          }
        }

        const isGroup = remoteJid.includes('@g.us');

        // Fetch connection settings to check ignoreGroupMessages
        let channelConnectionId: string | undefined = this.connectionIds.get(tenantId);
        let connection = await this.prisma.channelConnection.findFirst({
          where: channelConnectionId 
            ? { id: channelConnectionId }
            : { tenantId, provider: 'WEB_QR', status: { in: ['active', 'connected'] } },
          select: { id: true, ignoreGroupMessages: true }
        });

        if (connection?.id) {
          this.connectionIds.set(tenantId, connection.id);
          channelConnectionId = connection.id;
        }

        // If ignoreGroupMessages is true (default), ignore group messages completely
        if (isGroup && (connection?.ignoreGroupMessages ?? true)) {
          this.debugLog(`Skipping group message from ${remoteJid} for tenant ${tenantId} (ignoreGroupMessages=true)`);
          continue;
        }

        if (!msg.message) continue;

        const messageContent = unwrapBaileysMessage(msg.message);
        if (!messageContent) continue;

        // Skip completely empty message payload stubs to avoid phantom [Message] records
        if (typeof messageContent === 'object' && Object.keys(messageContent).length === 0) {
          this.debugLog(`Skipping empty message object for msg ${msg.key.id}`);
          continue;
        }

        // Ignore protocol control messages (e.g. revokes, key syncs, ephemeral timer updates)
        if (messageContent.protocolMessage && !messageContent.protocolMessage.editedMessage) {
          continue;
        }

        // Ignore standalone emoji reaction messages to avoid conversation list spam
        if (messageContent.reactionMessage) {
          continue;
        }

        // ── Robust WhatsApp LID & Phone Number Identity Resolution ────────────────
        const isLid = !isGroup && (remoteJid.includes('@lid') || /^\d{15,}$/.test(remoteJid.split('@')[0]));
        const rawUser = isGroup ? remoteJid : remoteJid.split('@')[0].split(':')[0];

        let resolvedPhone: string | undefined = undefined;
        let lidNumber: string | undefined = undefined;

        if (isLid) {
          lidNumber = rawUser.replace(/\D/g, '');
          // 1. Check alternate standard phone JID if provided by Baileys
          const alt = msg.key.remoteJidAlt || msg.key.participantAlt;
          if (alt && (alt.includes('@s.whatsapp.net') || alt.includes('@c.us'))) {
            resolvedPhone = alt.split('@')[0].split(':')[0].replace(/\D/g, '');
          }
          // 2. Query in-memory session cache & SignalRepository LID store
          if (!resolvedPhone) {
            resolvedPhone = (await this.resolvePnFromLid(tenantId, lidNumber, sock)) || undefined;
          }
        } else if (!isGroup) {
          resolvedPhone = rawUser.replace(/\D/g, '');
        }

        const externalContactId = isGroup 
          ? remoteJid 
          : (resolvedPhone || (lidNumber ? `lid:${lidNumber}` : rawUser));

        // Contact Name resolution:
        // 1. msg.pushName if valid and not equal to raw LID digits
        // 2. msg.verifiedBizName
        // 3. Formatted phone number (+880...) if resolved
        // 4. Fallback 'WhatsApp User' (never raw 15-digit internal LID)
        let contactName = '';
        const rawPushName = msg.pushName?.trim();
        const isPushNameValid = rawPushName && rawPushName !== lidNumber && rawPushName !== rawUser && !/^\d{15,}$/.test(rawPushName);

        if (isPushNameValid) {
          contactName = rawPushName;
        } else if ((msg as any).verifiedBizName) {
          contactName = (msg as any).verifiedBizName;
        } else if (resolvedPhone) {
          contactName = `+${resolvedPhone}`;
        } else {
          contactName = isGroup ? 'WhatsApp Group' : 'WhatsApp User';
        }
        
        let messageType = 'text';
        let contentStr = '';
        let thumbnail = '';
        let quotedMsg: any = null;
        let mediaUrl = '';
        
        const effectiveMsg = { key: msg.key, message: messageContent };

        if (messageContent.conversation) {
          contentStr = messageContent.conversation;
        } else if (messageContent.extendedTextMessage) {
          contentStr = messageContent.extendedTextMessage.text || '';
          const contextInfo = messageContent.extendedTextMessage.contextInfo;
          if (contextInfo) {
            quotedMsg = await this.resolveQuotedMessage(contextInfo);
            if (!contentStr && contextInfo.externalAdReply) {
              const ad = contextInfo.externalAdReply;
              contentStr = `📢 [Ad Inquiry]: ${ad.title || ad.body || 'Meta Ad'}`;
            }
          }
        } else if (messageContent.imageMessage) {
          messageType = 'image';
          contentStr = messageContent.imageMessage.caption || '[Photo]';
          if (messageContent.imageMessage.contextInfo) {
            quotedMsg = await this.resolveQuotedMessage(messageContent.imageMessage.contextInfo);
          }
          if (messageContent.imageMessage.jpegThumbnail) {
            try {
              thumbnail = Buffer.from(messageContent.imageMessage.jpegThumbnail).toString('base64');
            } catch (tErr) {}
          }
          try {
            let buffer: Buffer | null = null;
            try {
              buffer = await downloadMediaMessage(effectiveMsg as any, 'buffer', {});
            } catch (e1) {
              buffer = await downloadMediaMessage(msg as any, 'buffer', {});
            }

            if (buffer && buffer.length > 0) {
              thumbnail = buffer.toString('base64');

              const uploadPath = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
              if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
              const fileName = `wa_${Date.now()}_${Math.round(Math.random() * 1E6)}.webp`;
              const filePath = path.join(uploadPath, fileName);

              let compressedBuffer = buffer;
              try {
                let sharpInstance = sharp(buffer)
                  .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true });

                compressedBuffer = await sharpInstance
                  .webp({ quality: 42, effort: 6, smartSubsample: true })
                  .toBuffer();

                if (compressedBuffer.length > 25 * 1024) {
                  let quality = 35;
                  while (compressedBuffer.length > 20 * 1024 && quality >= 20) {
                    compressedBuffer = await sharp(buffer)
                      .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
                      .webp({ quality, effort: 6, smartSubsample: true })
                      .toBuffer();
                    quality -= 5;
                  }
                }

                this.logger.log(`Image compressed: ${buffer.length} → ${compressedBuffer.length} bytes (${Math.round(compressedBuffer.length / 1024)}KB)`);
              } catch (cErr) {
                this.logger.warn(`Image compression skipped, saving raw buffer: ${cErr.message}`);
              }

              fs.writeFileSync(filePath, compressedBuffer);
              mediaUrl = `/uploads/tenants/${tenantId}/${fileName}`;
            }
          } catch (err) {
            this.logger.error(`Failed to download image media for ${tenantId}: ${err.message}`);
          }
        } else if (messageContent.videoMessage || messageContent.ptvMessage) {
          messageType = 'video';
          const isPtv = !!messageContent.ptvMessage;
          const vidObj = messageContent.videoMessage || messageContent.ptvMessage;
          contentStr = vidObj.caption || (isPtv ? '🎥 [Video Note]' : '[Video]');
          try {
            const buffer = await downloadMediaMessage(effectiveMsg as any, 'buffer', {});
            const uploadPath = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
            const fileName = `wa_${Date.now()}_${Math.round(Math.random() * 1E6)}.mp4`;
            const filePath = path.join(uploadPath, fileName);
            fs.writeFileSync(filePath, buffer);
            mediaUrl = `/uploads/tenants/${tenantId}/${fileName}`;
          } catch (err) {
            this.logger.error(`Failed to download video media for ${tenantId}: ${err.message}`);
          }
        } else if (messageContent.documentMessage) {
          messageType = 'document';
          contentStr = messageContent.documentMessage.fileName || messageContent.documentMessage.caption || '[Document]';
          try {
            const buffer = await downloadMediaMessage(effectiveMsg as any, 'buffer', {});
            const uploadPath = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
            const fileName = messageContent.documentMessage.fileName || `wa_${Date.now()}_doc.pdf`;
            const filePath = path.join(uploadPath, fileName);
            fs.writeFileSync(filePath, buffer);
            mediaUrl = `/uploads/tenants/${tenantId}/${fileName}`;
          } catch (err) {
            this.logger.error(`Failed to download document media for ${tenantId}: ${err.message}`);
          }
        } else if (messageContent.audioMessage) {
          messageType = 'audio';
          contentStr = messageContent.audioMessage.ptt ? '🎤 [Voice Message]' : '🎵 [Audio]';
          try {
            const buffer = await downloadMediaMessage(effectiveMsg as any, 'buffer', {});
            const uploadPath = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
            const fileName = `wa_${Date.now()}_${Math.round(Math.random() * 1E6)}.ogg`;
            const filePath = path.join(uploadPath, fileName);
            fs.writeFileSync(filePath, buffer);
            mediaUrl = `/uploads/tenants/${tenantId}/${fileName}`;
            this.logger.log(`Saved audio media: ${buffer.length} bytes`);
          } catch (err) {
            this.logger.error(`Failed to download audio media for ${tenantId}: ${err.message}`);
          }
        } else if (messageContent.stickerMessage || messageContent.lottieStickerMessage) {
          messageType = 'image';
          contentStr = '🏷️ [Sticker]';
          try {
            const buffer = await downloadMediaMessage(effectiveMsg as any, 'buffer', {});
            const uploadPath = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
            const fileName = `wa_${Date.now()}_${Math.round(Math.random() * 1E6)}.webp`;
            const filePath = path.join(uploadPath, fileName);
            fs.writeFileSync(filePath, buffer);
            mediaUrl = `/uploads/tenants/${tenantId}/${fileName}`;
          } catch (err) {
            this.logger.warn(`Sticker download skipped for ${tenantId}: ${err.message}`);
          }
        } else if (messageContent.locationMessage || messageContent.liveLocationMessage) {
          messageType = 'text';
          const loc = messageContent.locationMessage || messageContent.liveLocationMessage;
          const locName = loc.name || loc.address || (loc.degreesLatitude ? `${loc.degreesLatitude}, ${loc.degreesLongitude}` : '');
          contentStr = locName ? `📍 Location: ${locName}` : '📍 [Location Shared]';
        } else if (messageContent.contactMessage || messageContent.contactsArrayMessage) {
          messageType = 'text';
          const contact = messageContent.contactMessage || messageContent.contactsArrayMessage?.contacts?.[0];
          const cName = contact?.displayName || 'Contact Card';
          contentStr = `👤 Contact: ${cName}`;
        } else if (messageContent.buttonsResponseMessage) {
          messageType = 'text';
          contentStr = messageContent.buttonsResponseMessage.selectedDisplayText || messageContent.buttonsResponseMessage.selectedButtonId || '[Button Clicked]';
        } else if (messageContent.templateButtonReplyMessage) {
          messageType = 'text';
          contentStr = messageContent.templateButtonReplyMessage.selectedDisplayText || messageContent.templateButtonReplyMessage.selectedId || '[Button Clicked]';
        } else if (messageContent.listResponseMessage) {
          messageType = 'text';
          contentStr = messageContent.listResponseMessage.title || messageContent.listResponseMessage.singleSelectReply?.selectedRowId || '[Option Selected]';
        } else if (messageContent.interactiveResponseMessage) {
          messageType = 'text';
          let buttonText = messageContent.interactiveResponseMessage.body?.text;
          const nativeFlow = messageContent.interactiveResponseMessage.nativeFlowResponseMessage;
          if (!buttonText && nativeFlow) {
            if (nativeFlow.paramsJson) {
              try {
                const parsed = JSON.parse(nativeFlow.paramsJson);
                buttonText = parsed.title || parsed.display_text || parsed.id || parsed.name;
              } catch {
                buttonText = nativeFlow.paramsJson;
              }
            }
            if (!buttonText && nativeFlow.name) {
              buttonText = nativeFlow.name;
            }
          }
          contentStr = buttonText || '[Interactive Response]';
        } else if (messageContent.templateMessage || messageContent.buttonsMessage || messageContent.listMessage || messageContent.interactiveMessage) {
          messageType = 'text';
          contentStr = messageContent.templateMessage?.hydratedTemplate?.hydratedContentText ||
            messageContent.templateMessage?.hydratedFourRowTemplate?.hydratedContentText ||
            messageContent.buttonsMessage?.contentText ||
            messageContent.listMessage?.description ||
            messageContent.interactiveMessage?.body?.text ||
            messageContent.interactiveMessage?.header?.title ||
            messageContent.interactiveMessage?.footer?.text ||
            '[Interactive Message]';
        } else if (messageContent.productMessage) {
          messageType = 'text';
          const prod = messageContent.productMessage.product;
          const title = prod?.title || prod?.productName || 'Catalog Product';
          const price = prod?.priceAmount1000 ? `${(prod.priceAmount1000 / 1000).toFixed(2)} ${prod.currencyCode || 'BDT'}` : '';
          contentStr = `🛍️ [Product Inquiry]: ${title}${price ? ` (${price})` : ''}`;
        } else if (messageContent.orderMessage) {
          messageType = 'text';
          const order = messageContent.orderMessage;
          const title = order.orderTitle || order.title || 'Catalog Order';
          const count = order.itemCount ? ` (${order.itemCount} items)` : '';
          contentStr = `🛒 [Order]: ${title}${count}`;
        } else if (messageContent.pollCreationMessage || messageContent.pollCreationMessageV2 || messageContent.pollCreationMessageV3 || messageContent.pollCreationMessageV4 || messageContent.pollCreationMessageV5 || messageContent.pollUpdateMessage) {
          messageType = 'text';
          const poll = messageContent.pollCreationMessage || messageContent.pollCreationMessageV2 || messageContent.pollCreationMessageV3 || messageContent.pollCreationMessageV4 || messageContent.pollCreationMessageV5;
          contentStr = `📊 Poll: ${poll?.name || 'Poll'}`;
        } else if (messageContent.groupInviteMessage) {
          messageType = 'text';
          contentStr = `👥 [Group Invite]: ${messageContent.groupInviteMessage.groupName || 'WhatsApp Group'}`;
        } else if (messageContent.eventMessage) {
          messageType = 'text';
          contentStr = `📅 [Event]: ${messageContent.eventMessage.name || 'Event'}`;
        } else if (messageContent.requestPhoneNumberMessage) {
          messageType = 'text';
          contentStr = '📱 [Phone Number Shared]';
        } else {
          const extracted = extractAnyTextFromPayload(messageContent);
          if (extracted) {
            contentStr = extracted;
          } else {
            const payloadKeys = Object.keys(messageContent).filter(k => k !== 'messageContextInfo');
            if (payloadKeys.length > 0) {
              const topKey = payloadKeys[0].replace(/Message$/, '');
              contentStr = `[${topKey.charAt(0).toUpperCase() + topKey.slice(1)}]`;
            } else {
              this.debugLog(`Skipping unhandled empty message payload: ${msg.key.id}`);
              continue;
            }
          }
        }

        try {
          const savedData = await this.inboxService.handleIncomingMessage({
            tenantId,
            channel: 'whatsapp',
            channelConnectionId,
            externalContactId,
            contactName,
            phone: resolvedPhone,
            lid: lidNumber,
            messageType,
            direction: isFromMe ? 'outbound' : 'inbound',
            content: { 
              body: contentStr, 
              ...(thumbnail ? { thumbnail } : {}),
              ...(quotedMsg ? { quotedMsg } : {}),
              // Audio: use localUrl so inbox.service.ts triggers Whisper transcription
              // Non-audio: use mediaUrl as before
              ...(mediaUrl && messageType === 'audio' ? { localUrl: mediaUrl, mediaUrl } : {}),
              ...(mediaUrl && messageType !== 'audio' ? { mediaUrl } : {})
            },
            externalMessageId: msg.key.id || `msg_${Date.now()}`,
            timestamp: new Date()
          });

          if ((savedData as any).dropped) return;

          this.inboxGateway.broadcastToTenant(tenantId, 'new_message', {
            message: (savedData as any).message,
            conversation: (savedData as any).conversation,
            contact: (savedData as any).contact,
            conversationId: (savedData as any).conversation.id
          });
        } catch (error) {
          this.logger.error(`Failed to process incoming message: ${error.message}`);
        }
      }
    });

    return sock;
  }

  async startPairing(tenantId: string, phoneNumber: string): Promise<string> {
    // Enforce quota + duplicate guard
    await this.checkWhatsappWebQuota(tenantId);
    await this.destroySocket(tenantId);

    let cleanPhone = (phoneNumber || '').replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('01')) {
      cleanPhone = `88${cleanPhone}`;
    }
    if (!cleanPhone) {
      throw new BadRequestException('A valid phone number is required for pairing code generation');
    }

    const sock = await this.initSocket(tenantId);
    await new Promise(resolve => setTimeout(resolve, 3000));
    return await sock.requestPairingCode(cleanPhone);
  }

  async startQr(tenantId: string): Promise<void> {
    // Enforce quota + duplicate guard
    await this.checkWhatsappWebQuota(tenantId);
    await this.destroySocket(tenantId);

    await this.initSocket(tenantId);
    // The QR will be emitted via connection.update event
  }

  async logout(tenantId: string) {
    await this.destroySocket(tenantId);

    // Clear cached connectionId
    this.connectionIds.delete(tenantId);

    const sessionDir = `./sessions/whatsapp_web/${tenantId}`;
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }

  async sendMessage(tenantId: string, to: string, content: string, mediaPath?: string, messageType?: string): Promise<string> {
    let sock = this.sockets.get(tenantId);
    if (!sock || !this.isSocketConnected(tenantId)) {
      this.debugLog(`Socket for tenant ${tenantId} not ready, initializing socket connection...`);
      await this.destroySocket(tenantId);
      sock = await this.initSocket(tenantId);
      let waits = 0;
      while (!this.isSocketConnected(tenantId) && waits < 10) {
        await new Promise(r => setTimeout(r, 500));
        waits++;
      }
    }
    // Clean recipient identifier (strip device suffix :1, @s.whatsapp.net, +, etc.)
    const cleanNumber = to.split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!cleanNumber) {
      throw new Error(`Invalid WhatsApp recipient number: ${to}`);
    }

    let jid: string;
    if (to.includes('@g.us')) {
      jid = to;
    } else if (to.includes('@lid') || /^\d{15,}$/.test(cleanNumber)) {
      const mappedPn = await this.resolvePnFromLid(tenantId, cleanNumber, sock);
      jid = mappedPn ? `${mappedPn}@s.whatsapp.net` : `${cleanNumber}@lid`;
    } else {
      jid = `${cleanNumber}@s.whatsapp.net`;
    }
    this.debugLog(`Sending WhatsApp message via Baileys to ${jid}`);
    
    const doSend = async (targetSock: any) => {
      let resolvedBuffer: Buffer | null = null;
      let resolvedFileName = '';

      if (mediaPath) {
        const resolvedPath = resolveLocalMediaPath(mediaPath, tenantId);
        if (resolvedPath && fs.existsSync(resolvedPath)) {
          resolvedBuffer = fs.readFileSync(resolvedPath);
          resolvedFileName = path.basename(resolvedPath);
        } else if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
          try {
            const resp = await fetch(mediaPath);
            if (resp.ok) {
              resolvedBuffer = Buffer.from(await resp.arrayBuffer());
              try {
                resolvedFileName = path.basename(new URL(mediaPath).pathname) || 'file';
              } catch {
                resolvedFileName = 'file';
              }
            }
          } catch (err: any) {
            this.debugLog(`Failed to fetch remote media from ${mediaPath}: ${err.message}`);
          }
        }
      }

      const isMediaMessage = ['image', 'video', 'document', 'audio', 'voice'].includes(messageType || '') || (!!mediaPath && messageType !== 'text');

      if (resolvedBuffer) {
        if (messageType === 'video') {
          return await targetSock.sendMessage(jid, { video: resolvedBuffer, caption: content || undefined });
        } else if (messageType === 'audio' || messageType === 'voice') {
          return await targetSock.sendMessage(jid, { audio: resolvedBuffer, mimetype: 'audio/mp4', ptt: messageType === 'voice' });
        } else if (messageType === 'document') {
          return await targetSock.sendMessage(jid, { 
            document: resolvedBuffer, 
            mimetype: 'application/octet-stream', 
            fileName: resolvedFileName || 'document', 
            caption: content || undefined 
          });
        } else {
          // Default media type is image
          return await targetSock.sendMessage(jid, { image: resolvedBuffer, caption: content || undefined });
        }
      } else if (isMediaMessage) {
        this.logger.error(`Cannot send ${messageType || 'media'} to ${jid}: media file could not be resolved from '${mediaPath}'`);
        throw new Error(`Media file not found or unreadable for ${messageType || 'media'}: ${mediaPath}`);
      } else {
        return await targetSock.sendMessage(jid, { text: content });
      }
    };

    let result;
    try {
      result = await doSend(sock);
    } catch (err: any) {
      this.debugLog(`sendMessage initial attempt failed for ${tenantId}: ${err.message}. Retrying with fresh socket...`);
      await this.destroySocket(tenantId);
      sock = await this.initSocket(tenantId);
      let waits = 0;
      while (!this.isSocketConnected(tenantId) && waits < 10) {
        await new Promise(r => setTimeout(r, 500));
        waits++;
      }
      result = await doSend(sock);
    }

    this.debugLog(`Message sent to ${jid}, result: ${JSON.stringify(result)}`);
    return result?.key?.id || `msg_${Date.now()}`;
  }

  async markRead(tenantId: string, jid: string, messageIds: string[]) {
    const sock = this.sockets.get(tenantId);
    if (!sock || !this.isSocketConnected(tenantId)) {
      this.debugLog(`markRead skipped for ${tenantId}: socket not ready`);
      return;
    }
    
    // Clean recipient phone number
    const cleanNumber = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!cleanNumber) return;
    let remoteJid: string;
    if (jid.includes('@g.us')) {
      remoteJid = jid;
    } else if (jid.includes('@lid') || /^\d{15,}$/.test(cleanNumber)) {
      const mappedPn = await this.resolvePnFromLid(tenantId, cleanNumber, sock);
      remoteJid = mappedPn ? `${mappedPn}@s.whatsapp.net` : `${cleanNumber}@lid`;
    } else {
      remoteJid = `${cleanNumber}@s.whatsapp.net`;
    }
    
    const keys = messageIds.map(id => ({
      remoteJid,
      id,
      participant: undefined
    }));
    
    try {
      await sock.readMessages(keys);
      this.debugLog(`Sent read receipt for ${keys.length} messages to ${remoteJid}`);
    } catch (err: any) {
      this.debugLog(`Failed to send read receipt to ${remoteJid}: ${err.message}`);
    }
  }

  private async resolveQuotedMessage(contextInfo: any): Promise<any> {
    if (!contextInfo?.quotedMessage && !contextInfo?.stanzaId) return null;
    let qText = '';
    let qMediaUrl: string | undefined = undefined;
    let qType: string | undefined = undefined;

    if (contextInfo.quotedMessage) {
      const qMsg = unwrapBaileysMessage(contextInfo.quotedMessage);
      if (qMsg.conversation) qText = qMsg.conversation;
      else if (qMsg.extendedTextMessage?.text) qText = qMsg.extendedTextMessage.text;
      else if (qMsg.imageMessage) {
        qType = 'image';
        if (qMsg.imageMessage.caption) qText = qMsg.imageMessage.caption;
        if (qMsg.imageMessage.jpegThumbnail) {
          try {
            qMediaUrl = `data:image/jpeg;base64,${Buffer.from(qMsg.imageMessage.jpegThumbnail).toString('base64')}`;
          } catch (tErr) {}
        }
      } else if (qMsg.videoMessage) {
        qType = 'video';
        if (qMsg.videoMessage.caption) qText = qMsg.videoMessage.caption;
      }
    }

    const stanzaId = contextInfo.stanzaId;
    let referencedProductId: string | undefined = undefined;
    let referencedProductName: string | undefined = undefined;
    let referencedProductPrice: number | undefined = undefined;
    let senderName: string | undefined = undefined;

    if (stanzaId) {
      try {
        const origDbMsg: any = await this.prisma.message.findFirst({
          where: { externalMessageId: stanzaId },
          include: {
            senderUser: { select: { name: true } },
            aiAssistant: { select: { agentName: true } }
          } as any
        });
        if (origDbMsg) {
          if (origDbMsg.senderType === 'ai') {
            senderName = origDbMsg.aiAssistant?.agentName || 'AI Assistant';
          } else if (origDbMsg.senderType === 'agent' && origDbMsg.senderUser?.name) {
            senderName = origDbMsg.senderUser.name;
          } else if (origDbMsg.direction === 'outbound') {
            senderName = 'Agent';
          } else {
            senderName = 'Customer';
          }

          if (origDbMsg.type) qType = origDbMsg.type;

          if (origDbMsg.content) {
            let parsedContent: any = origDbMsg.content;
            if (typeof origDbMsg.content === 'string') {
              try { parsedContent = JSON.parse(origDbMsg.content); } catch { parsedContent = { text: origDbMsg.content }; }
            }
            if (parsedContent && typeof parsedContent === 'object') {
              if (parsedContent.body && (!qText || qText === '[Media message]')) qText = parsedContent.body;
              else if (parsedContent.text && (!qText || qText === '[Media message]')) qText = parsedContent.text;
              else if (parsedContent.caption && (!qText || qText === '[Media message]')) qText = parsedContent.caption;

              if (parsedContent.mediaUrl) qMediaUrl = parsedContent.mediaUrl;
              else if (parsedContent.url) qMediaUrl = parsedContent.url;
              else if (parsedContent.imageUrl) qMediaUrl = parsedContent.imageUrl;

              if (parsedContent.productId) referencedProductId = parsedContent.productId;
              if (parsedContent.productName) referencedProductName = parsedContent.productName;
              if (parsedContent.productPrice) referencedProductPrice = parsedContent.productPrice;
            }
          }
        }
      } catch (dbErr: any) {
        this.logger.debug(`Quoted message DB lookup failed for stanza ${stanzaId}: ${dbErr.message}`);
      }
    }

    if (referencedProductId && !qMediaUrl) {
      try {
        const prod = await this.prisma.product.findUnique({
          where: { id: referencedProductId },
          select: { imageUrl: true, name: true, price: true }
        });
        if (prod?.imageUrl) qMediaUrl = prod.imageUrl;
        if (!referencedProductName && prod?.name) referencedProductName = prod.name;
      } catch (pErr) {}
    }

    if (!qText) qText = qType === 'image' ? '📷 Photo' : '[Media message]';
    return {
      text: qText,
      participant: contextInfo.participant,
      stanzaId,
      ...(qMediaUrl ? { mediaUrl: qMediaUrl, imageUrl: qMediaUrl } : {}),
      ...(qType ? { type: qType } : {}),
      ...(senderName ? { senderName } : {}),
      ...(referencedProductId ? { productId: referencedProductId } : {}),
      ...(referencedProductName ? { productName: referencedProductName } : {}),
      ...(referencedProductPrice ? { productPrice: referencedProductPrice } : {})
    };
  }
}

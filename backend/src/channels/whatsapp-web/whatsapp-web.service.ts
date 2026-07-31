import { Injectable, Logger, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InboxGateway } from '../../inbox/inbox.gateway';
import { InboxService } from '../../inbox/inbox.service';
import { BillingService } from '../../billing/billing.service';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsappWebService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappWebService.name);
  private sockets: Map<string, any> = new Map();
  // Cache connectionId per tenant to avoid race condition on first message
  private connectionIds: Map<string, string> = new Map();

  private debugLog(msg: string) {
    fs.appendFileSync('wa-debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    this.logger.log(msg);
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxGateway: InboxGateway,
    private readonly inboxService: InboxService,
    private readonly billingService: BillingService,
  ) {}

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

    sock.ev.on('creds.update', saveCreds);

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
        } else if (isReplaced) {
          this.debugLog(`Connection replaced/conflict (${statusCode}) for tenant ${tenantId}. Halting automatic reconnect loop.`);
          // Do NOT schedule reconnect on replaced/conflict sockets to prevent endless ping-pong duplicate connection loop
        } else {
          if (this.sockets.get(tenantId) === sock) {
            this.debugLog(`Connection closed for tenant ${tenantId}, scheduling automatic reconnect...`);
            setTimeout(() => {
              if (this.sockets.get(tenantId) === sock && !this.isSocketConnected(tenantId)) {
                this.initSocket(tenantId).catch(err => {
                  this.debugLog(`Reconnect attempt failed for ${tenantId}: ${err.message}`);
                });
              }
            }, 3000);
          }
        }
      } else if (connection === 'open') {
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

        const externalContactId = isGroup ? remoteJid : remoteJid.split('@')[0];
        const contactName = msg.pushName || externalContactId;
        
        let messageType = 'text';
        let contentStr = '';
        let thumbnail = '';
        let quotedMsg: any = null;
        let mediaUrl = '';
        
        if (msg.message.conversation) {
          contentStr = msg.message.conversation;
        } else if (msg.message.extendedTextMessage?.text) {
          contentStr = msg.message.extendedTextMessage.text;
          const contextInfo = msg.message.extendedTextMessage.contextInfo;
          if (contextInfo?.quotedMessage) {
            const qMsg = contextInfo.quotedMessage;
            let qText = '[Media message]';
            if (qMsg.conversation) qText = qMsg.conversation;
            else if (qMsg.extendedTextMessage?.text) qText = qMsg.extendedTextMessage.text;
            else if (qMsg.imageMessage?.caption) qText = qMsg.imageMessage.caption;
            else if (qMsg.videoMessage?.caption) qText = qMsg.videoMessage.caption;
            quotedMsg = { text: qText, participant: contextInfo.participant };
          }
        } else if (msg.message.imageMessage) {
          messageType = 'image';
          contentStr = msg.message.imageMessage.caption || '[Photo]';
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            thumbnail = buffer.toString('base64');

            // Save high-resolution media file to disk
            const uploadPath = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
            const fileName = `wa_${Date.now()}_${Math.round(Math.random() * 1E6)}.jpg`;
            const filePath = path.join(uploadPath, fileName);
            fs.writeFileSync(filePath, buffer);
            mediaUrl = `/uploads/${fileName}`;
          } catch (err) {
            this.logger.error(`Failed to download image media for ${tenantId}: ${err.message}`);
          }
        } else if (msg.message.videoMessage) {
          messageType = 'video';
          contentStr = msg.message.videoMessage.caption || '[Video]';
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const uploadPath = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
            const fileName = `wa_${Date.now()}_${Math.round(Math.random() * 1E6)}.mp4`;
            const filePath = path.join(uploadPath, fileName);
            fs.writeFileSync(filePath, buffer);
            mediaUrl = `/uploads/${fileName}`;
          } catch (err) {
            this.logger.error(`Failed to download video media for ${tenantId}: ${err.message}`);
          }
        } else if (msg.message.documentMessage) {
          messageType = 'document';
          contentStr = msg.message.documentMessage.fileName || msg.message.documentMessage.caption || '[Document]';
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const uploadPath = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
            const fileName = msg.message.documentMessage.fileName || `wa_${Date.now()}_doc.pdf`;
            const filePath = path.join(uploadPath, fileName);
            fs.writeFileSync(filePath, buffer);
            mediaUrl = `/uploads/${fileName}`;
          } catch (err) {
            this.logger.error(`Failed to download document media for ${tenantId}: ${err.message}`);
          }
        } else {
          contentStr = '[Unsupported Message Type]';
        }

        try {
          const savedData = await this.inboxService.handleIncomingMessage({
            tenantId,
            channel: 'whatsapp',
            channelConnectionId,
            externalContactId,
            contactName,
            messageType,
            direction: isFromMe ? 'outbound' : 'inbound',
            content: { 
              body: contentStr, 
              ...(thumbnail ? { thumbnail } : {}),
              ...(quotedMsg ? { quotedMsg } : {}),
              ...(mediaUrl ? { mediaUrl } : {})
            },
            externalMessageId: msg.key.id || `msg_${Date.now()}`,
            timestamp: new Date()
          });

          this.inboxGateway.broadcastToTenant(tenantId, 'new_message', {
            message: savedData.message,
            conversation: savedData.conversation,
            contact: savedData.contact,
            conversationId: savedData.conversation.id
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

    const sock = await this.initSocket(tenantId);
    await new Promise(resolve => setTimeout(resolve, 3000));
    return await sock.requestPairingCode(phoneNumber);
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
    // Clean recipient phone number (strip LID, device suffix :1, @s.whatsapp.net, +, etc.)
    const cleanNumber = to.split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!cleanNumber) {
      throw new Error(`Invalid WhatsApp recipient number: ${to}`);
    }
    const jid = `${cleanNumber}@s.whatsapp.net`;
    this.debugLog(`Sending WhatsApp message via Baileys to ${jid}`);
    
    const doSend = async (targetSock: any) => {
      if (mediaPath && fs.existsSync(mediaPath)) {
        const buffer = fs.readFileSync(mediaPath);
        if (messageType === 'video') {
          return await targetSock.sendMessage(jid, { video: buffer, caption: content || undefined });
        } else if (messageType === 'document') {
          const fileName = path.basename(mediaPath);
          return await targetSock.sendMessage(jid, { document: buffer, mimetype: 'application/octet-stream', fileName, caption: content || undefined });
        } else {
          return await targetSock.sendMessage(jid, { image: buffer, caption: content || undefined });
        }
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
    const remoteJid = `${cleanNumber}@s.whatsapp.net`;
    
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
}

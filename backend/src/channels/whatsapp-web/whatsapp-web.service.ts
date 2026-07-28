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
    return !!(sock && (sock.user || sock.ws?.readyState === 1));
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

    // Also block a second WEB_QR connection specifically (one QR session per tenant)
    const existingWebQr = await this.prisma.channelConnection.findFirst({
      where: { tenantId, provider: 'WEB_QR', status: { in: ['active', 'pending', 'connected'] } }
    });

    if (existingWebQr) {
      throw new ForbiddenException(
        'A WhatsApp Web (QR) session already exists for this account. ' +
        'Please disconnect the existing session before connecting a new one.'
      );
    }
  }

  async initSocket(tenantId: string) {
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/whatsapp_web/${tenantId}`);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      syncFullHistory: false,
    });

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
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 409;
        this.debugLog(`Connection closed due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`);
        if (shouldReconnect) {
          setTimeout(() => {
            this.initSocket(tenantId).catch(err => {
              this.debugLog(`Reconnect failed for ${tenantId}: ${err.message}`);
            });
          }, 3000);
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
          // Emit success AFTER database is updated
          this.inboxGateway.broadcastToTenant(tenantId, 'whatsapp_qr_connected', { success: true });
        }).catch(err => {
          this.debugLog(`Failed to save connection for ${tenantId}: ${err.message}`);
        });
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      this.debugLog(`Got messages for ${tenantId}: type=${m.type}, count=${m.messages.length}`);
      if (m.type !== 'notify') return;
      
      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        let remoteJid = msg.key.remoteJid;
        // If the primary JID is a LID (Linked Device format), use the alternate standard phone JID if available
        if (remoteJid?.includes('@lid') && msg.key.remoteJidAlt) {
          remoteJid = msg.key.remoteJidAlt;
        }

        if (!remoteJid || remoteJid.includes('@g.us')) continue;

        const externalContactId = remoteJid.split('@')[0];
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
          contentStr = msg.message.imageMessage.caption || '[Image received]';
          const thumbBytes = msg.message.imageMessage.jpegThumbnail;
          if (thumbBytes) thumbnail = Buffer.from(thumbBytes).toString('base64');
        } else if (msg.message.documentMessage) {
          messageType = 'document';
          contentStr = msg.message.documentMessage.fileName || '[Document received]';
        } else if (msg.message.videoMessage) {
          messageType = 'video';
          contentStr = msg.message.videoMessage.caption || '[Video received]';
          const thumbBytes = msg.message.videoMessage.jpegThumbnail;
          if (thumbBytes) thumbnail = Buffer.from(thumbBytes).toString('base64');
        } else {
          messageType = 'other';
          contentStr = '[Media or Unsupported Message]';
        }

        if (messageType === 'image' || messageType === 'video' || messageType === 'document') {
          try {
            this.debugLog(`Attempting to download media for msg ${msg.key.id}`);
            const buffer = await downloadMediaMessage(msg, 'buffer', {}, { 
              reuploadRequest: sock.updateMediaMessage,
              logger: this.logger as any
            });
            this.debugLog(`Downloaded media buffer of size ${buffer.length}`);
            const ext = messageType === 'image' ? 'jpg' : (messageType === 'video' ? 'mp4' : 'bin');
            const filename = `wa_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const uploadsDir = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            const filepath = path.join(uploadsDir, filename);
            fs.writeFileSync(filepath, buffer);
            mediaUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/uploads/${filename}`;
            this.debugLog(`Saved media to ${mediaUrl}`);
          } catch (e) {
            this.logger.error('Failed to download media: ' + e.message);
            this.debugLog(`Failed to download media: ${e.message} ${e.stack}`);
          }
        }

        try {
          // Use cached connectionId first (avoids race condition on first message after reconnect)
          let channelConnectionId: string | undefined = this.connectionIds.get(tenantId);

          if (!channelConnectionId) {
            // Fallback: query DB (handles edge cases where cache was lost after restart)
            const connection = await this.prisma.channelConnection.findFirst({
              where: { tenantId, provider: 'WEB_QR', status: { in: ['active', 'connected'] } }
            });
            channelConnectionId = connection?.id;
            if (channelConnectionId) {
              this.connectionIds.set(tenantId, channelConnectionId);
            }
          }

          this.debugLog(`Using channelConnectionId=${channelConnectionId} for incoming message`);

          const savedData = await this.inboxService.handleIncomingMessage({
            tenantId,
            channel: 'whatsapp',
            channelConnectionId,
            externalContactId,
            contactName,
            messageType,
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

    if (this.sockets.has(tenantId)) {
      this.sockets.get(tenantId).ws?.close();
      this.sockets.delete(tenantId);
    }
    const sock = await this.initSocket(tenantId);
    await new Promise(resolve => setTimeout(resolve, 3000));
    return await sock.requestPairingCode(phoneNumber);
  }

  async startQr(tenantId: string): Promise<void> {
    // Enforce quota + duplicate guard
    await this.checkWhatsappWebQuota(tenantId);

    if (this.sockets.has(tenantId)) {
      this.sockets.get(tenantId).ws?.close();
      this.sockets.delete(tenantId);
    }
    await this.initSocket(tenantId);
    // The QR will be emitted via connection.update event
  }

  async logout(tenantId: string) {
    if (this.sockets.has(tenantId)) {
      try {
        await this.sockets.get(tenantId).logout();
      } catch (e) {}
      this.sockets.get(tenantId).ws?.close();
      this.sockets.delete(tenantId);
    }
    // Clear cached connectionId
    this.connectionIds.delete(tenantId);

    const sessionDir = `./sessions/whatsapp_web/${tenantId}`;
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }

  async sendMessage(tenantId: string, to: string, content: string, mediaPath?: string, messageType?: string): Promise<string> {
    const sock = this.sockets.get(tenantId);
    if (!sock) {
      throw new Error(`No active Baileys socket found for tenant ${tenantId}`);
    }
    const jid = `${to}@s.whatsapp.net`;
    
    let result;
    if (mediaPath && fs.existsSync(mediaPath)) {
      const buffer = fs.readFileSync(mediaPath);
      if (messageType === 'video') {
        result = await sock.sendMessage(jid, { video: buffer, caption: content || undefined });
      } else if (messageType === 'document') {
        const fileName = path.basename(mediaPath);
        result = await sock.sendMessage(jid, { document: buffer, mimetype: 'application/octet-stream', fileName, caption: content || undefined });
      } else {
        result = await sock.sendMessage(jid, { image: buffer, caption: content || undefined });
      }
    } else {
      result = await sock.sendMessage(jid, { text: content });
    }
    
    return result?.key?.id || `baileys_${Date.now()}`;
  }
}

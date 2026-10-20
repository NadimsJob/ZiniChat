import { Injectable, Logger } from '@nestjs/common';
import { IChannelAdapter, UnifiedMessage } from '../interfaces/channel-adapter.interface';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class MessengerService implements IChannelAdapter {
  private readonly logger = new Logger(MessengerService.name);

  constructor(private prisma: PrismaService) {}

  private profileCache = new Map<string, { name: string; avatarUrl?: string; timestamp: number }>();

  async fetchSenderProfile(
    senderId: string, 
    channel: string, 
    connection: any
  ): Promise<{ name: string; avatarUrl?: string } | null> {
    const pageToken = connection.accessTokenEncrypted;
    const pageId = connection.externalAccountId;
    if (!pageToken) return null;

    if (channel === 'messenger') {
      // Strategy 1: Direct PSID query with first_name,last_name,profile_pic
      // NOTE: Do NOT include 'name' field as Meta Graph API rejects it with error 100 on PSID
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${senderId}?fields=first_name,last_name,profile_pic&access_token=${pageToken}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const data = await res.json();
          const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
          if (fullName) {
            return { name: fullName, avatarUrl: data.profile_pic };
          }
        }
      } catch (err: any) {
        this.logger.debug(`Messenger direct profile fetch error: ${err.message}`);
      }

      // Strategy 2: Query conversation thread participants via t_<PSID>
      try {
        const threadRes = await fetch(`https://graph.facebook.com/v21.0/t_${senderId}?fields=participants,senders&access_token=${pageToken}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (threadRes.ok) {
          const threadData = await threadRes.json();
          const parts = threadData.participants?.data || threadData.senders?.data || [];
          const userPart = parts.find((p: any) => p.id === senderId) || 
                           parts.find((p: any) => p.id !== pageId && p.name && p.name !== 'Facebook User');
          if (userPart?.name) {
            return { name: userPart.name.trim() };
          }
        }
      } catch (err: any) {
        this.logger.debug(`Messenger thread lookup error: ${err.message}`);
      }

      // Strategy 3: Query Page's recent conversations list
      if (pageId) {
        try {
          const convRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/conversations?fields=participants,senders&limit=25&access_token=${pageToken}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000)
          });
          if (convRes.ok) {
            const convData = await convRes.json();
            for (const conv of convData.data || []) {
              const parts = conv.participants?.data || conv.senders?.data || [];
              const match = parts.find((p: any) => p.id === senderId);
              if (match?.name) {
                return { name: match.name.trim() };
              }
            }
          }
        } catch (err: any) {
          this.logger.debug(`Messenger conversations list error: ${err.message}`);
        }
      }

      // Strategy 4: Check if user previously interacted or commented on this tenant's page
      try {
        const commentLog = await this.prisma.facebookCommentLog.findFirst({
          where: {
            tenantId: connection.tenantId,
            userExternalId: senderId,
            userName: { notIn: ['Facebook User', 'Messenger User', 'Instagram User', ''] }
          },
          select: { userName: true }
        });
        if (commentLog?.userName) {
          return { name: commentLog.userName.trim() };
        }
      } catch (err: any) {
        // ignore
      }
    } else if (channel === 'instagram') {
      // Instagram Strategy 1: Direct PSID query
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${senderId}?fields=name,username,profile_pic&access_token=${pageToken}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const data = await res.json();
          const name = data.name || data.username;
          if (name) {
            return { name: name.trim(), avatarUrl: data.profile_pic };
          }
        }
      } catch (err: any) {
        this.logger.debug(`Instagram profile fetch error: ${err.message}`);
      }

      // Instagram Strategy 2: Thread lookup
      try {
        const threadRes = await fetch(`https://graph.facebook.com/v21.0/t_${senderId}?fields=participants&access_token=${pageToken}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (threadRes.ok) {
          const threadData = await threadRes.json();
          const parts = threadData.participants?.data || [];
          const userPart = parts.find((p: any) => p.id === senderId) || 
                           parts.find((p: any) => p.id !== pageId && (p.name || p.username));
          const name = userPart?.name || userPart?.username;
          if (name) {
            return { name: name.trim() };
          }
        }
      } catch (err: any) {
        this.logger.debug(`Instagram thread lookup error: ${err.message}`);
      }
    }

    return null;
  }

  getChannelType(): string {
    return 'messenger';
  }

  async parseWebhookPayload(payload: any): Promise<UnifiedMessage[]> {
    const messages: UnifiedMessage[] = [];

    const objectType = payload.object; // 'page' for Messenger, 'instagram' for Instagram DM

    if (objectType !== 'page' && objectType !== 'instagram') {
      this.logger.debug(`Ignoring webhook with object type: ${objectType}`);
      return messages;
    }

    for (const entry of payload.entry || []) {
      const entryId = entry.id;

      for (const messaging of entry.messaging || []) {
        if (!messaging.message) continue;

        const senderId = messaging.sender?.id;
        const recipientId = messaging.recipient?.id;
        const msg = messaging.message;

        // Skip echo messages (bot's own messages sent back)
        if (msg.is_echo) {
          this.logger.debug(`Skipping echo message for entry ${entryId}`);
          continue;
        }

        // 1. Try finding an Instagram channel connection matching recipientId, senderId, or entryId
        let connection: any = await this.prisma.channelConnection.findFirst({
          where: {
            channelType: 'instagram',
            status: { in: ['active', 'connected'] },
            OR: [
              { externalAccountId: recipientId },
              { externalAccountId: senderId },
              { externalAccountId: entryId },
              { verifyToken: entryId }
            ]
          }
        });

        let channel = 'instagram';

        if (!connection && objectType === 'instagram') {
          connection = await this.prisma.channelConnection.findFirst({
            where: { channelType: 'instagram', externalAccountId: entryId }
          });
        }

        // 2. If no Instagram connection matched, try finding a Messenger channel connection
        if (!connection) {
          connection = await this.prisma.channelConnection.findFirst({
            where: {
              channelType: 'messenger',
              status: { in: ['active', 'connected'] },
              OR: [
                { externalAccountId: recipientId },
                { externalAccountId: entryId }
              ]
            }
          });
          channel = 'messenger';
        }

        if (!connection && objectType === 'page') {
          connection = await this.prisma.channelConnection.findFirst({
            where: { channelType: 'messenger', externalAccountId: entryId }
          });
          channel = 'messenger';
        }

        if (!connection) {
          this.logger.warn(`Received ${objectType} webhook for unknown entryId: ${entryId}, recipientId: ${recipientId}`);
          continue;
        }

        // Final channel type confirmation
        channel = connection.channelType === 'instagram' ? 'instagram' : 'messenger';

        // Skip if sender is the page/account itself
        if (senderId === connection.externalAccountId || senderId === entryId) {
          this.logger.debug(`Skipping self-message from ${channel} account ${senderId}`);
          continue;
        }

        const tenantId = connection.tenantId;
        this.logger.log(`Received ${channel} DM from ${senderId} to ${recipientId || entryId} (tenant: ${tenantId})`);

        // Handle attachments
        let type = 'text';
        let finalContent: any = { text: msg.text };

        if (msg.attachments && msg.attachments.length > 0) {
          const attachment = msg.attachments[0];
          type = attachment.type; // image, video, audio, file
          const remoteUrl = attachment.payload?.url;
          let localUrl: string | undefined = undefined;

          if (remoteUrl) {
            try {
              localUrl = await this.downloadAndSaveMedia(remoteUrl, tenantId, type);
            } catch (dlErr: any) {
              this.logger.warn(`Failed to download Messenger media (${remoteUrl}): ${dlErr.message}`);
            }
          }

          finalContent = {
            url: remoteUrl,
            mediaUrl: localUrl || remoteUrl,
            localUrl: localUrl,
            id: attachment.payload?.sticker_id || null,
            text: msg.text || ''
          };
        }

        // Resolve Quoted Message if user replied to a previous message (reply_to.mid)
        if (msg.reply_to?.mid) {
          const mid = msg.reply_to.mid;
          let qText = '';
          let qMediaUrl: string | undefined = undefined;
          let qType: string | undefined = undefined;
          let referencedProductId: string | undefined = undefined;
          let referencedProductName: string | undefined = undefined;
          let referencedProductPrice: number | undefined = undefined;
          let senderName: string | undefined = undefined;

          try {
            const origDbMsg: any = await this.prisma.message.findFirst({
              where: { externalMessageId: mid },
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
                  qText = parsedContent.body || parsedContent.text || parsedContent.caption || '';
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
            this.logger.debug(`Messenger quoted message DB lookup failed for mid ${mid}: ${dbErr.message}`);
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

          if (!qText && (qType === 'image' || qMediaUrl)) qText = '📷 Photo';

          if (qText || qMediaUrl) {
            const quotedMsg = {
              id: mid,
              text: qText || 'Message',
              mid,
              ...(qMediaUrl ? { mediaUrl: qMediaUrl, imageUrl: qMediaUrl } : {}),
              ...(qType ? { type: qType } : {}),
              ...(senderName ? { senderName } : {}),
              ...(referencedProductId ? { productId: referencedProductId } : {}),
              ...(referencedProductName ? { productName: referencedProductName } : {}),
              ...(referencedProductPrice ? { productPrice: referencedProductPrice } : {})
            };
            finalContent = { ...finalContent, quotedMsg };
          }
        }

        // Resolve Real Sender Profile Name & Avatar
        let resolvedName: string | undefined = undefined;
        let resolvedAvatar: string | undefined = undefined;

        // 1. Check in-memory cache (valid for 24 hours)
        const cached = this.profileCache.get(senderId);
        if (cached && (Date.now() - cached.timestamp < 86400000)) {
          resolvedName = cached.name;
          resolvedAvatar = cached.avatarUrl;
        }

        // 2. Check if contact already exists in database with a non-generic name
        if (!resolvedName) {
          try {
            const existingContact = await this.prisma.contact.findFirst({
              where: {
                tenantId,
                channel,
                externalContactId: senderId,
                name: { notIn: ['Messenger User', 'Instagram User', senderId] }
              },
              select: { name: true }
            });
            if (existingContact?.name) {
              resolvedName = existingContact.name;
              this.profileCache.set(senderId, { name: resolvedName, avatarUrl: resolvedAvatar, timestamp: Date.now() });
            }
          } catch (err: any) {
            // ignore
          }
        }

        // 3. Query Meta Graph API if not yet resolved
        if (!resolvedName && connection.accessTokenEncrypted) {
          try {
            const fetchedProfile = await this.fetchSenderProfile(senderId, channel, connection);
            if (fetchedProfile?.name) {
              resolvedName = fetchedProfile.name;
              resolvedAvatar = fetchedProfile.avatarUrl;
              this.profileCache.set(senderId, { name: resolvedName, avatarUrl: resolvedAvatar, timestamp: Date.now() });
            }
          } catch (err: any) {
            this.logger.debug(`Failed inline profile fetch for ${senderId}: ${err.message}`);
          }
        }

        const fallbackName = channel === 'instagram' ? 'Instagram User' : 'Messenger User';
        const contactName = resolvedName || fallbackName;

        messages.push({
          tenantId,
          channel,
          channelConnectionId: connection.id,
          externalContactId: senderId,
          contactName,
          avatarUrl: resolvedAvatar,
          direction: 'inbound',
          type,
          content: finalContent,
          messageId: msg.mid,
          timestamp: new Date(messaging.timestamp || Date.now()),
        } as any);
      }
    }
    return messages;
  }

  async sendMessage(tenantId: string, to: string, content: any): Promise<boolean> {
    this.logger.log(`Mock Sending Messenger to ${to} for tenant ${tenantId}`);
    return true;
  }

  private async downloadAndSaveMedia(mediaUrl: string, tenantId: string, type: string): Promise<string> {
    const res = await fetch(mediaUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadDir = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let ext = 'jpg';
    if (type === 'audio') ext = 'mp3';
    else if (type === 'video') ext = 'mp4';
    else if (type === 'file') ext = 'bin';

    let fileName = `fb_${Date.now()}_${Math.round(Math.random() * 1e6)}.${ext}`;
    let filePath = path.join(uploadDir, fileName);

    if (type === 'image') {
      try {
        fileName = `fb_${Date.now()}_${Math.round(Math.random() * 1e6)}.webp`;
        filePath = path.join(uploadDir, fileName);

        let compressedBuffer = await sharp(buffer)
          .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
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
        fs.writeFileSync(filePath, compressedBuffer);
      } catch (cErr: any) {
        this.logger.warn(`Messenger image compression failed, writing raw: ${cErr.message}`);
        fs.writeFileSync(filePath, buffer);
      }
    } else {
      fs.writeFileSync(filePath, buffer);
    }

    return `/uploads/tenants/${tenantId}/${fileName}`;
  }
}

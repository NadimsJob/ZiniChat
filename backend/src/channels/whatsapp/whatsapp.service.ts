import { Injectable, Logger } from '@nestjs/common';
import { IChannelAdapter, UnifiedMessage } from '../interfaces/channel-adapter.interface';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

@Injectable()
export class WhatsappService implements IChannelAdapter {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private prisma: PrismaService) {}

  getChannelType(): string {
    return 'whatsapp';
  }

  async parseWebhookPayload(payload: any): Promise<UnifiedMessage[]> {
    const messages: UnifiedMessage[] = [];

    if (payload.object !== 'whatsapp_business_account') {
      return messages;
    }

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.value && change.value.messages) {
          const phoneNumberId = change.value.metadata.phone_number_id;

          // Lookup Tenant ID from the DB
          const connection = await this.prisma.channelConnection.findFirst({
            where: { phoneNumberId, channelType: 'whatsapp', status: 'active' }
          });

          if (!connection) {
            this.logger.warn(`Received webhook for unknown phoneNumberId: ${phoneNumberId}`);
            continue; // Skip if we don't own this number
          }

          const tenantId = connection.tenantId;
          const contacts = change.value.contacts || [];

          for (const msg of change.value.messages) {
            this.logger.log(`Received message: ${JSON.stringify(msg)}`);

            const isGroup = msg.from?.includes('@g.us') || msg.group_id || false;
            if (isGroup && (connection.ignoreGroupMessages ?? true)) {
              this.logger.log(`Skipping group message from ${msg.from} as ignoreGroupMessages=true`);
              continue;
            }
            
            // Extract contact name if available
            const contactInfo = contacts.find((c: any) => c.wa_id === msg.from);
            const contactName = contactInfo?.profile?.name;

            let finalContent = msg[msg.type] || msg.text;

            // Automatically download media (image, audio, video, document) for Cloud API
            if (['image', 'video', 'audio', 'document'].includes(msg.type) && msg[msg.type]?.id) {
              const accessToken = connection.accessTokenEncrypted || 
                                  (connection as any)?.pageAccessToken || 
                                  process.env.META_ACCESS_TOKEN;
              if (accessToken && !accessToken.startsWith('mock_')) {
                try {
                  const mediaId = msg[msg.type].id;
                  const mimeType = msg[msg.type].mime_type || (msg.type === 'image' ? 'image/jpeg' : '');
                  const localUrl = await this.downloadMedia(mediaId, accessToken, msg.type, mimeType);
                  if (localUrl) {
                    if (typeof finalContent === 'object' && finalContent !== null) {
                      finalContent = { ...finalContent, mediaUrl: localUrl, url: localUrl, localUrl };
                    } else {
                      finalContent = { body: finalContent, mediaUrl: localUrl, url: localUrl, localUrl };
                    }
                  }
                } catch (dErr: any) {
                  this.logger.warn(`Failed to download Cloud API media ${msg[msg.type]?.id}: ${dErr.message}`);
                }
              }
            }

            // Resolve Quoted Message if user replied to a previous message
            if (msg.context?.id) {
              const stanzaId = msg.context.id;
              let qText = '';
              let qMediaUrl: string | undefined = undefined;
              let qType: string | undefined = undefined;
              let referencedProductId: string | undefined = undefined;
              let referencedProductName: string | undefined = undefined;
              let referencedProductPrice: number | undefined = undefined;
              let senderName: string | undefined = undefined;

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
                this.logger.debug(`Cloud API quoted message DB lookup failed for stanza ${stanzaId}: ${dbErr.message}`);
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
                  id: stanzaId,
                  text: qText || 'Message',
                  stanzaId,
                  ...(qMediaUrl ? { mediaUrl: qMediaUrl, imageUrl: qMediaUrl } : {}),
                  ...(qType ? { type: qType } : {}),
                  ...(senderName ? { senderName } : {}),
                  ...(referencedProductId ? { productId: referencedProductId } : {}),
                  ...(referencedProductName ? { productName: referencedProductName } : {}),
                  ...(referencedProductPrice ? { productPrice: referencedProductPrice } : {})
                };
                if (typeof finalContent === 'object' && finalContent !== null) {
                  finalContent = { ...finalContent, quotedMsg };
                } else {
                  finalContent = { body: finalContent, quotedMsg };
                }
              }
            }

            messages.push({
              tenantId,
              channel: 'whatsapp',
              channelConnectionId: connection.id,
              externalContactId: msg.from,
              contactName, // custom property if we extend UnifiedMessage
              direction: 'inbound',
              type: msg.type === 'voice' ? 'audio' : msg.type, // Map voice to audio
              content: finalContent,
              messageId: msg.id,
              timestamp: new Date(parseInt(msg.timestamp) * 1000),
            } as any); // Cast as any if contactName is not in interface
          }
        }
      }
    }
    return messages;
  }

  async sendMessage(tenantId: string, to: string, content: any): Promise<boolean> {
    this.logger.log(`Mock Sending WhatsApp to ${to} for tenant ${tenantId}`);
    // TODO: Implement actual axios/fetch call to Meta Graph API
    return true;
  }

  private async downloadMedia(mediaId: string, accessToken: string, type: string, mimeType: string): Promise<string> {
    // 1. Get media URL
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!metaRes.ok) {
      throw new Error(`Failed to fetch media metadata from Meta: ${await metaRes.text()}`);
    }
    
    const mediaData = await metaRes.json();
    const mediaUrl = mediaData.url;
    
    if (!mediaUrl) {
      throw new Error('No media URL returned by Meta');
    }
    
    // 2. Download binary
    const downloadRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!downloadRes.ok) {
      throw new Error(`Failed to download media binary from Meta: ${await downloadRes.text()}`);
    }
    
    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 3. Save to disk
    let extension = mimeType ? mimeType.split('/')[1]?.split(';')[0] : 'bin';
    if (extension === 'jpeg') extension = 'jpg';
    if (extension === 'vnd.openxmlformats-officedocument.wordprocessingml.document') extension = 'docx';

    const uploadsDir = path.join(process.cwd(), 'uploads', 'media');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let fileName = `${mediaId}_${Date.now()}.${extension}`;
    let filePath = path.join(uploadsDir, fileName);

    if (mimeType && mimeType.startsWith('image/') && mimeType !== 'image/svg+xml') {
      try {
        fileName = `${mediaId}_${Date.now()}.webp`;
        filePath = path.join(uploadsDir, fileName);

        // Stage 1: Resize to max 720px
        let compressedBuffer = await sharp(buffer)
          .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 42, effort: 6, smartSubsample: true })
          .toBuffer();

        // Stage 2: Adaptive reduction if still over 25KB
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
        fs.writeFileSync(filePath, compressedBuffer);
      } catch (cErr) {
        this.logger.warn(`Image compression skipped, saving raw buffer: ${cErr.message}`);
        fs.writeFileSync(filePath, buffer);
      }

    } else {
      fs.writeFileSync(filePath, buffer);
    }
    
    return `/uploads/media/${fileName}`;
  }
}

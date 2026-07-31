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

            // If it's a media message, download the media
            if (['image', 'audio', 'document', 'video', 'voice'].includes(msg.type) && finalContent?.id) {
              try {
                const localUrl = await this.downloadMedia(finalContent.id, connection.accessTokenEncrypted, msg.type, finalContent.mime_type);
                finalContent = { ...finalContent, localUrl };
              } catch (err) {
                this.logger.error(`Failed to download media ${finalContent.id}: ${err.message}`);
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

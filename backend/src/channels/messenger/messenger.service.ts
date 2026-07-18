import { Injectable, Logger } from '@nestjs/common';
import { IChannelAdapter, UnifiedMessage } from '../interfaces/channel-adapter.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MessengerService implements IChannelAdapter {
  private readonly logger = new Logger(MessengerService.name);

  constructor(private prisma: PrismaService) {}

  getChannelType(): string {
    return 'messenger';
  }

  async parseWebhookPayload(payload: any): Promise<UnifiedMessage[]> {
    const messages: UnifiedMessage[] = [];

    if (payload.object !== 'page') {
      return messages;
    }

    for (const entry of payload.entry || []) {
      const pageId = entry.id;

      // Lookup Tenant ID from the DB
      const connection = await this.prisma.channelConnection.findFirst({
        where: { externalAccountId: pageId, channelType: 'messenger', status: 'active' }
      });

      if (!connection) {
        this.logger.warn(`Received webhook for unknown pageId: ${pageId}`);
        continue; 
      }

      const tenantId = connection.tenantId;

      for (const messaging of entry.messaging || []) {
        if (messaging.message) {
          const senderId = messaging.sender.id;
          const msg = messaging.message;

          this.logger.log(`Received messenger message: ${JSON.stringify(msg)}`);
          
          // Meta Messenger attachments
          let type = 'text';
          let finalContent: any = { text: msg.text };

          if (msg.attachments && msg.attachments.length > 0) {
            const attachment = msg.attachments[0];
            type = attachment.type; // image, video, audio, file
            finalContent = { 
              url: attachment.payload?.url,
              id: attachment.payload?.sticker_id || null, // Optional sticker tracking
              text: msg.text || '' // Sometimes images come with text
            };
          }

          messages.push({
            tenantId,
            channel: 'messenger',
            externalContactId: senderId,
            contactName: 'Messenger User', // Fetching actual profile requires Graph API call, placeholder for now
            direction: 'inbound',
            type, 
            content: finalContent,
            messageId: msg.mid,
            timestamp: new Date(messaging.timestamp),
          } as any);
        }
      }
    }
    return messages;
  }

  async sendMessage(tenantId: string, to: string, content: any): Promise<boolean> {
    this.logger.log(`Mock Sending Messenger to ${to} for tenant ${tenantId}`);
    return true;
  }
}

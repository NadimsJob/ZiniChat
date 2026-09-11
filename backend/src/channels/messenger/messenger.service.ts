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
          finalContent = {
            url: attachment.payload?.url,
            id: attachment.payload?.sticker_id || null,
            text: msg.text || ''
          };
        }

        messages.push({
          tenantId,
          channel,
          externalContactId: senderId,
          contactName: channel === 'instagram' ? 'Instagram User' : 'Messenger User',
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
}

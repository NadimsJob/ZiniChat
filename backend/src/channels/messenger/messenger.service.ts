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
      const accountId = entry.id;

      let connection: any = null;

      if (objectType === 'page') {
        // Messenger DM: lookup by page ID with channelType messenger
        connection = await this.prisma.channelConnection.findFirst({
          where: { externalAccountId: accountId, channelType: 'messenger', status: { in: ['active', 'connected'] } }
        });

        if (!connection) {
          connection = await this.prisma.channelConnection.findFirst({
            where: { externalAccountId: accountId, channelType: 'messenger' }
          });
        }
      } else if (objectType === 'instagram') {
        // Instagram DM: lookup by Instagram Business Account ID with channelType instagram
        connection = await this.prisma.channelConnection.findFirst({
          where: { externalAccountId: accountId, channelType: 'instagram', status: { in: ['active', 'connected'] } }
        });

        if (!connection) {
          connection = await this.prisma.channelConnection.findFirst({
            where: { externalAccountId: accountId, channelType: 'instagram' }
          });
        }
      }

      if (!connection) {
        this.logger.warn(`Received ${objectType} webhook for unknown accountId: ${accountId}`);
        continue;
      }

      const tenantId = connection.tenantId;
      const channel = objectType === 'instagram' ? 'instagram' : 'messenger';

      // Handle messaging events (DMs)
      for (const messaging of entry.messaging || []) {
        if (messaging.message) {
          const senderId = messaging.sender?.id;
          const recipientId = messaging.recipient?.id;
          const msg = messaging.message;

          // Skip echo messages (bot's own messages sent back)
          if (msg.is_echo) {
            this.logger.debug(`Skipping echo message for ${channel}`);
            continue;
          }

          // Skip if sender is the page/account itself
          if (senderId === accountId || senderId === recipientId) {
            this.logger.debug(`Skipping self-message from ${channel} account`);
            continue;
          }

          this.logger.log(`Received ${channel} DM from ${senderId} to ${accountId} (tenant: ${tenantId})`);

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

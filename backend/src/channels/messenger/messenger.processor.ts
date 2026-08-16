import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('messenger-outbound')
export class MessengerProcessor extends WorkerHost {
  private readonly logger = new Logger(MessengerProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'mark-read') {
      return this.handleMarkRead(job);
    }

    this.logger.log(`Processing outbound messenger job ${job.id}`);
    
    const { tenantId, messageId, to, type, content, conversationId, channel } = job.data;
    const channelType = channel === 'instagram' ? 'instagram' : 'messenger';

    try {
      // 1. Fetch the active channel connection for this tenant
      const connection = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType, status: { in: ['active', 'connected'] } }
      });

      if (!connection || !connection.accessTokenEncrypted || !connection.externalAccountId) {
        throw new Error(`No active ${channelType} connection found for tenant ${tenantId}`);
      }

      // 3. Prepare payload for Meta Graph API (Messenger Send API)
      const payload: any = {
        recipient: { id: to },
        message: {}
      };

      // Parse and format content (handle JSON quoted messages from frontend)
      let finalContentText = content;
      if (type === 'text' && typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          if (parsed && typeof parsed === 'object') {
            const body = parsed.text || parsed.body || '';
            if (parsed.quotedMessage) {
              const q = parsed.quotedMessage;
              const qText = q.text || (q.type === 'image' ? '[Photo]' : (q.type === 'video' ? '[Video]' : (q.type === 'audio' ? '[Audio]' : (q.type === 'document' ? '[Document]' : 'Attachment'))));
              const qSender = q.senderName || 'Customer';
              // Format as blockquote: > *Name*: Message\n\nReply
              finalContentText = `> *${qSender}*: ${qText}\n\n${body}`;
            } else {
              finalContentText = body;
            }
          }
        } catch (e) {
          // Not JSON, just normal text
        }
      }

      if (type === 'text') {
        payload.message.text = finalContentText;
      } else {
        // e.g., type === 'image', content === { url: '...' }
        payload.message.attachment = {
          type: type,
          payload: { url: content.url, is_reusable: true }
        };
      }

      // 3. Send HTTP Request to Meta
      this.logger.debug(`Sending to Meta ${channelType} API for ${to}`);
      
      let externalMessageId = `mock_ext_msg_${Date.now()}`;
      
      if (!connection.accessTokenEncrypted.startsWith('mock_')) {
        // For both Messenger and Instagram DM, the endpoint is:
        // POST https://graph.facebook.com/v21.0/{page-or-ig-account-id}/messages
        // Instagram uses the IG Business Account ID and page access token stored in the connection
        const response = await fetch(`https://graph.facebook.com/v21.0/${connection.externalAccountId}/messages?access_token=${connection.accessTokenEncrypted}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) {
          this.logger.error(`Meta ${channelType} API Error: ${JSON.stringify(data)}`);
          throw new Error(`Meta API Error: ${data.error?.message || 'Unknown Error'}`);
        }
        
        if (data.message_id) {
          externalMessageId = data.message_id;
        }
      } else {
        this.logger.log(`Mock token detected. Simulating successful send for job ${job.id}`);
      }

      // 4. Update Message Status in DB
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'sent',
          externalMessageId: externalMessageId
        }
      });

      this.logger.log(`Job ${job.id} completed. Message sent.`);
      return { success: true, externalMessageId };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'failed'
        }
      });
      
      throw error; // Will be caught by BullMQ for retries if configured
    }
  }

  private async handleMarkRead(job: Job): Promise<any> {
    const { tenantId, conversationId } = job.data;
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { contact: true }
      });
      if (!conversation || !['messenger', 'instagram'].includes(conversation.channel)) return { success: false };

      const connection = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: conversation.channel, status: 'active' }
      });

      if (!connection || !connection.accessTokenEncrypted || !connection.externalAccountId) {
        return { success: false, reason: 'No active connection' };
      }

      const unreadMessages = await this.prisma.message.findMany({
        where: { conversationId, direction: 'inbound', status: { not: 'read' } },
        select: { id: true, externalMessageId: true }
      });

      if (unreadMessages.length === 0) return { success: true, count: 0 };

      // Send mark_seen via Meta Graph API
      if (!connection.accessTokenEncrypted.startsWith('mock_')) {
        await fetch(`https://graph.facebook.com/v21.0/${connection.externalAccountId}/messages?access_token=${connection.accessTokenEncrypted}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: conversation.contact.externalContactId },
            sender_action: 'mark_seen'
          })
        }).catch(err => this.logger.error(`Failed mark_seen Meta API: ${err.message}`));
      }

      await this.prisma.message.updateMany({
        where: { id: { in: unreadMessages.map(m => m.id) } },
        data: { status: 'read' }
      });

      this.logger.log(`Marked ${unreadMessages.length} messenger/instagram messages as read for ${conversationId}`);
      return { success: true, count: unreadMessages.length };
    } catch (err: any) {
      this.logger.error(`Failed mark-read for messenger ${conversationId}: ${err.message}`);
      throw err;
    }
  }
}

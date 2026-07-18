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
    this.logger.log(`Processing outbound messenger job ${job.id}`);
    
    const { tenantId, messageId, to, type, content, conversationId } = job.data;

    try {
      // 1. Fetch the active channel connection for this tenant
      const connection = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: 'messenger', status: 'active' }
      });

      if (!connection || !connection.accessTokenEncrypted || !connection.externalAccountId) {
        throw new Error('No active Messenger connection found for this tenant');
      }

      // 2. Prepare payload for Meta Graph API (Messenger Send API)
      const payload: any = {
        recipient: { id: to },
        message: {}
      };

      if (type === 'text') {
        payload.message.text = content;
      } else {
        // e.g., type === 'image', content === { url: '...' }
        payload.message.attachment = {
          type: type,
          payload: { url: content.url, is_reusable: true }
        };
      }

      // 3. Send HTTP Request to Meta
      this.logger.debug(`Sending to Meta Messenger API for ${to}`);
      
      let externalMessageId = `mock_ext_msg_${Date.now()}`;
      
      if (!connection.accessTokenEncrypted.startsWith('mock_')) {
        // Facebook Graph API Endpoint for Messenger
        // POST https://graph.facebook.com/v21.0/{page-id}/messages?access_token={page-access-token}
        const response = await fetch(`https://graph.facebook.com/v21.0/${connection.externalAccountId}/messages?access_token=${connection.accessTokenEncrypted}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) {
          this.logger.error(`Meta API Error: ${JSON.stringify(data)}`);
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
}

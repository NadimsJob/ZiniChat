import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappWebService } from '../whatsapp-web/whatsapp-web.service';

@Processor('whatsapp-outbound')
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);
  // Simple in-memory rate limiter for WEB_QR
  private rateLimits = new Map<string, { count: number, resetAt: number }>();

  constructor(
    private prisma: PrismaService,
    private whatsappWebService: WhatsappWebService
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing outbound message job ${job.id}`);
    
    const { tenantId, messageId, to, type, content, conversationId, channelConnectionId } = job.data;

    try {
      // 1. Fetch the active channel connection for this tenant
      let connection;
      if (channelConnectionId) {
        connection = await this.prisma.channelConnection.findUnique({
          where: { id: channelConnectionId }
        });
      } else {
        // Fallback for older conversations that might not have channelConnectionId
        connection = await this.prisma.channelConnection.findFirst({
          where: { tenantId, channelType: 'whatsapp', status: 'active' }
        });
      }

      if (!connection) {
        throw new Error('No active WhatsApp connection found for this tenant');
      }
      
      if (connection.provider !== 'WEB_QR' && (!connection.accessTokenEncrypted || !connection.phoneNumberId)) {
        throw new Error('Missing credentials for CLOUD_API connection');
      }

      // 2. Prepare payload for Meta Graph API
      // Constructing standard WhatsApp Cloud API payload
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: type,
      };

      if (type === 'text') {
        payload.text = { body: content };
      } else {
        // Handle other types like image, template, etc. later
        payload[type] = content;
      }

      // 3. Send Message based on Provider
      this.logger.debug(`Sending to API for ${to}`);
      
      let externalMessageId = `mock_ext_msg_${Date.now()}`;
      
      if (connection.provider === 'WEB_QR') {
        // Enforce Rate Limit for WEB_QR (max 10 per minute per tenant)
        const now = Date.now();
        const limit = this.rateLimits.get(tenantId) || { count: 0, resetAt: now + 60000 };
        if (now > limit.resetAt) {
          limit.count = 0;
          limit.resetAt = now + 60000;
        }
        limit.count++;
        this.rateLimits.set(tenantId, limit);

        if (limit.count > 10) {
          this.logger.warn(`Rate limit exceeded for tenant ${tenantId}. Paused to prevent WhatsApp Ban.`);
          throw new Error('RATE_LIMIT_EXCEEDED');
        }

        // Send via Baileys
        let textContent = '';
        let mediaPath = '';
        if (typeof content === 'string') {
          textContent = content;
        } else if (content) {
          textContent = content.body || '';
          if (content.mediaUrl) {
            const path = require('path');
            mediaPath = path.join(process.cwd(), content.mediaUrl);
          }
        }
        externalMessageId = await this.whatsappWebService.sendMessage(tenantId, to, textContent, mediaPath, type);
      } else {
        // CLOUD_API logic
        if (!connection.accessTokenEncrypted.startsWith('mock_')) {
          const response = await fetch(`https://graph.facebook.com/v21.0/${connection.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.accessTokenEncrypted}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const data = await response.json();
          
          if (!response.ok) {
            this.logger.error(`Meta API Error: ${JSON.stringify(data)}`);
            throw new Error(`Meta API Error: ${data.error?.message || 'Unknown Error'}`);
          }
          
          if (data.messages && data.messages.length > 0) {
            externalMessageId = data.messages[0].id;
          }
        } else {
          this.logger.log(`Mock token detected. Simulating successful send for job ${job.id}`);
        }
      }

      // 4. Update Message Status in DB
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'sent',
          externalMessageId: externalMessageId
        }
      });

      this.logger.log(`Successfully processed outbound message job ${job.id}`);
      return { success: true, externalMessageId };
    } catch (error: any) {
      this.logger.error(`Failed to process job ${job.id}: ${error.message}`);
      
      const isRateLimit = error.message === 'RATE_LIMIT_EXCEEDED';
      
      // Update Message Status to failed
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: isRateLimit ? 'rate_limited' : 'failed',
        }
      }).catch(e => this.logger.error(`Failed to update message status: ${e.message}`));
      
      if (isRateLimit) {
        // Do not throw for rate limit so it doesn't infinitely retry immediately and get banned, 
        // or throw a specific error to let bullmq handle it with backoff.
        throw error;
      }
      throw error; 
    }
  }
}

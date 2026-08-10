import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappWebService } from '../whatsapp-web/whatsapp-web.service';
import { InboxGateway } from '../../inbox/inbox.gateway';

@Processor('whatsapp-outbound')
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);
  // Simple in-memory rate limiter for WEB_QR
  private rateLimits = new Map<string, { count: number, resetAt: number }>();

  constructor(
    private prisma: PrismaService,
    private whatsappWebService: WhatsappWebService,
    private inboxGateway: InboxGateway,
  ) {
    super();
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Outbound message job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`);
    const { messageId } = job.data || {};
    if (messageId && messageId.startsWith('broadcast_')) {
      const recipientId = messageId.replace('broadcast_', '');
      await this.prisma.broadcastRecipient.update({
        where: { id: recipientId },
        data: { status: 'failed' }
      }).catch(e => this.logger.error(`Failed to update broadcast recipient status to failed: ${e.message}`));
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'mark-read') {
      return this.handleMarkRead(job);
    }
    
    this.logger.log(`Processing outbound message job ${job.id}`);
    
    const { tenantId, messageId, to, type, content, conversationId, channelConnectionId } = job.data;

    try {
      // 1. Fetch the active channel connection for this tenant
      let connection;
      if (channelConnectionId) {
        connection = await this.prisma.channelConnection.findFirst({
          where: { id: channelConnectionId, tenantId, status: 'active' }
        });
      }
      if (!connection) {
        // Fallback for older/reconnected conversations with missing or stale channelConnectionId
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

      // 2. Parse and format content (handle JSON quoted messages from frontend)
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
              // Format as WhatsApp blockquote: > *Name*: Message\n\nReply
              finalContentText = `> *${qSender}*: ${qText}\n\n${body}`;
            } else {
              finalContentText = body;
            }
          }
        } catch (e) {
          // Not JSON, just normal text
        }
      }

      // 3. Prepare payload for Meta Graph API
      // Constructing standard WhatsApp Cloud API payload
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: type,
      };

      if (type === 'text') {
        payload.text = { body: finalContentText };
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
        if (typeof finalContentText === 'string') {
          textContent = finalContentText;
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

      // 4. Update Message Status in DB & Broadcast real-time status update
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'sent',
          externalMessageId: externalMessageId
        }
      });

      this.inboxGateway.broadcastToTenant(tenantId, 'message:status', {
        messageId,
        conversationId,
        status: 'sent'
      });

      this.logger.log(`Successfully processed outbound message job ${job.id}`);
      return { success: true, externalMessageId };
    } catch (error: any) {
      this.logger.error(`Failed to process job ${job.id}: ${error.message}`);
      
      const isRateLimit = error.message === 'RATE_LIMIT_EXCEEDED';
      const finalStatus = isRateLimit ? 'rate_limited' : 'failed';
      
      if (messageId && messageId.startsWith('broadcast_')) {
        const recipientId = messageId.replace('broadcast_', '');
        await this.prisma.broadcastRecipient.update({
          where: { id: recipientId },
          data: { status: 'failed' }
        }).catch(e => this.logger.error(`Failed to update broadcast recipient status: ${e.message}`));
      }

      // Update Message Status to failed & broadcast status
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: finalStatus,
        }
      }).catch(e => this.logger.error(`Failed to update message status: ${e.message}`));
      
      this.inboxGateway.broadcastToTenant(tenantId, 'message:status', {
        messageId,
        conversationId,
        status: finalStatus
      });

      if (isRateLimit) {
        throw error;
      }
      throw error; 
    }
  }

  private async handleMarkRead(job: Job): Promise<any> {
    const { tenantId, conversationId } = job.data;
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { contact: true }
      });
      if (!conversation || conversation.channel !== 'whatsapp') return { success: false };

      const unreadMessages = await this.prisma.message.findMany({
        where: { conversationId, direction: 'inbound', status: { not: 'read' }, externalMessageId: { not: null } },
        select: { id: true, externalMessageId: true }
      });
      
      if (unreadMessages.length === 0) return { success: true, count: 0 };

      const messageIds = unreadMessages.map(m => m.externalMessageId as string);
      
      const connection = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: 'whatsapp', status: 'active' }
      });

      if (connection?.provider === 'WEB_QR') {
        await this.whatsappWebService.markRead(tenantId, conversation.contact.externalContactId, messageIds);
      } else if (connection && connection.accessTokenEncrypted && !connection.accessTokenEncrypted.startsWith('mock_')) {
        // Meta Official WhatsApp Cloud API read receipt
        for (const wamid of messageIds) {
          await fetch(`https://graph.facebook.com/v21.0/${connection.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.accessTokenEncrypted}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              status: 'read',
              message_id: wamid
            })
          }).catch(err => this.logger.error(`Cloud API mark-read error for ${wamid}: ${err.message}`));
        }
      }
      
      await this.prisma.message.updateMany({
        where: { id: { in: unreadMessages.map(m => m.id) } },
        data: { status: 'read' }
      });
      
      this.logger.log(`Marked ${messageIds.length} messages as read for conversation ${conversationId}`);
      return { success: true, count: messageIds.length };
    } catch (err: any) {
      this.logger.error(`Failed to process mark-read for ${conversationId}: ${err.message}`);
      throw err;
    }
  }
}

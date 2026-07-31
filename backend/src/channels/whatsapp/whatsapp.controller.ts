import { Controller, Get, Post, Query, Body, Res, Headers, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import * as crypto from 'crypto';
import { WhatsappService } from './whatsapp.service';
import { InboxService } from '../../inbox/inbox.service';
import { InboxGateway } from '../../inbox/inbox.gateway';
import { BroadcastsService } from '../../broadcasts/broadcasts.service';

@Controller('webhooks/whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly inboxService: InboxService,
    private readonly inboxGateway: InboxGateway,
    private readonly broadcastsService: BroadcastsService
  ) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      res.status(HttpStatus.OK).send(challenge);
    } else {
      res.sendStatus(HttpStatus.FORBIDDEN);
    }
  }

  @Post()
  async receiveMessage(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
    @Res() res: Response
  ) {
    const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
    if (appSecret && signature) {
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(JSON.stringify(body)).digest('hex');
      if (signature !== expectedSignature) {
        console.error('WhatsApp Webhook signature mismatch!');
        return res.sendStatus(HttpStatus.UNAUTHORIZED);
      }
    }

    // Acknowledge receipt to Meta immediately (200 OK) to prevent retries
    res.sendStatus(HttpStatus.OK);

    try {
      // Check for Meta Template Status Update webhook events
      if (body?.entry) {
        for (const entry of body.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'message_template_status_update') {
                await this.broadcastsService.handleMetaWebhookTemplateEvent(change.value);
              }
            }
          }
        }
      }

      const unifiedMessages = await this.whatsappService.parseWebhookPayload(body);
      
      for (const msg of unifiedMessages) {
        if (msg.tenantId === 'PENDING_LOOKUP') continue; // Should not happen with new logic, but safe check

        // Save to Database
        const savedData = await this.inboxService.handleIncomingMessage({
          tenantId: msg.tenantId,
          channel: msg.channel,
          channelConnectionId: msg.channelConnectionId,
          externalContactId: msg.externalContactId,
          contactName: (msg as any).contactName,
          messageType: msg.type,
          content: msg.content,
          externalMessageId: msg.messageId || `msg_${Date.now()}`,
          timestamp: msg.timestamp
        });

        if ((savedData as any).dropped) return;

        // Broadcast to Inbox UI
        this.inboxGateway.broadcastToTenant(msg.tenantId, 'new_message', {
          message: (savedData as any).message,
          conversation: (savedData as any).conversation,
          contact: (savedData as any).contact,
          conversationId: (savedData as any).conversation.id
        });
      }
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
    }
  }
}

import { Controller, Get, Post, Query, Body, Res, Headers, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import * as crypto from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { MessengerService } from './messenger.service';
import { FacebookCommentsService } from './facebook-comments.service';
import { InboxService } from '../../inbox/inbox.service';
import { InboxGateway } from '../../inbox/inbox.gateway';

@Throttle({ default: { ttl: 60000, limit: 300 }, webhooks: { ttl: 60000, limit: 300 } })
@Controller('webhooks/messenger')
export class MessengerController {
  constructor(
    private readonly messengerService: MessengerService,
    private readonly facebookCommentsService: FacebookCommentsService,
    private readonly inboxService: InboxService,
    private readonly inboxGateway: InboxGateway
  ) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = process.env.MESSENGER_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      console.log('MESSENGER_WEBHOOK_VERIFIED');
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
    const appSecret = process.env.META_APP_SECRET || process.env.MESSENGER_APP_SECRET;
    if (appSecret && signature) {
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(JSON.stringify(body)).digest('hex');
      if (signature !== expectedSignature) {
        console.error('Messenger Webhook signature mismatch!');
        return res.sendStatus(HttpStatus.UNAUTHORIZED);
      }
    }

    // Acknowledge receipt to Meta immediately (200 OK) to prevent retries
    res.sendStatus(HttpStatus.OK);

    try {
      // 1. Handle Facebook Comment Feed Events
      if (body?.object === 'page' && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          const pageId = entry.id;
          if (Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              if (change.field === 'feed') {
                this.facebookCommentsService.processFeedChange(pageId, change).catch(err => {
                  console.error('Error processing feed comment change:', err);
                });
              }
            }
          }
        }
      }

      // 2. Handle Inbox Direct Messages
      const unifiedMessages = await this.messengerService.parseWebhookPayload(body);
      
      for (const msg of unifiedMessages) {
        if (msg.tenantId === 'PENDING_LOOKUP') continue; 

        // Save to Database
        const savedData = await this.inboxService.handleIncomingMessage({
          tenantId: msg.tenantId,
          channel: msg.channel,
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
      console.error('Error processing messenger webhook:', error);
    }
  }
}

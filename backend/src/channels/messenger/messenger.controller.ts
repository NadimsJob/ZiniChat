import { Controller, Get, Post, Query, Body, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { MessengerService } from './messenger.service';
import { InboxService } from '../../inbox/inbox.service';
import { InboxGateway } from '../../inbox/inbox.gateway';

@Controller('webhooks/messenger')
export class MessengerController {
  constructor(
    private readonly messengerService: MessengerService,
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
    const verifyToken = process.env.MESSENGER_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN; // Shared or specific
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('MESSENGER_WEBHOOK_VERIFIED');
      res.status(HttpStatus.OK).send(challenge);
    } else {
      res.sendStatus(HttpStatus.FORBIDDEN);
    }
  }

  @Post()
  async receiveMessage(@Body() body: any, @Res() res: Response) {
    // Acknowledge receipt to Meta immediately (200 OK) to prevent retries
    res.sendStatus(HttpStatus.OK);

    try {
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

        // Broadcast to Inbox UI
        this.inboxGateway.broadcastToTenant(msg.tenantId, 'new_message', {
          message: savedData.message,
          conversation: savedData.conversation,
          contact: savedData.contact,
          conversationId: savedData.conversation.id
        });
      }
    } catch (error) {
      console.error('Error processing messenger webhook:', error);
    }
  }
}

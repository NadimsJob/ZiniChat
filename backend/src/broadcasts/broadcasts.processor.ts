import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { SmtpService } from '../smtp/smtp.service';

@Processor('broadcasts')
export class BroadcastsProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastsProcessor.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('whatsapp-outbound') private whatsappQueue: Queue,
    private smtpService: SmtpService
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing broadcast job ${job.id}`);
    const { broadcastId, tenantId } = job.data;

    try {
      // 1. Fetch broadcast
      const broadcast = await this.prisma.broadcast.findUnique({
        where: { id: broadcastId },
        include: { template: true }
      });

      if (!broadcast) throw new Error('Broadcast not found');

      // Set status to processing
      await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'processing' }
      });

      // 2. Fetch contacts matching segmentFilter (assuming empty filter means all contacts for now)
      const contacts = await this.prisma.contact.findMany({
        where: { tenantId } // In a real app, apply segmentFilter logic here
      });

      this.logger.log(`Found ${contacts.length} recipients for broadcast ${broadcastId}`);

      // 3. Process recipients and enqueue messages
      let delayMs = 0;
      const DELAY_BETWEEN_MESSAGES = 1000; // 1 message per second to prevent rate limit blocks

      for (const contact of contacts) {
        // Create recipient record
        const recipient = await this.prisma.broadcastRecipient.create({
          data: {
            broadcastId,
            contactId: contact.id,
            status: 'pending'
          }
        });

        // Enqueue to whatsapp-outbound with delay
        await this.whatsappQueue.add('send-message', {
          tenantId,
          messageId: `broadcast_${recipient.id}`,
          to: contact.phone,
          type: 'text', // assuming text for now, could be template
          content: broadcast.template.body,
        }, {
          delay: delayMs
        });

        // Increase delay for the next message
        delayMs += DELAY_BETWEEN_MESSAGES;
      }

      // Set status to completed
      await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'completed' }
      });

      // Send email to owner
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { users: { where: { role: 'owner' } } }
      });

      const ownerEmail = tenant?.users?.[0]?.email;

      if (ownerEmail) {
        await this.smtpService.triggerBroadcastCompletedEmail(
          ownerEmail,
          tenant.businessName,
          broadcast.template?.name || 'Unnamed Broadcast',
          contacts.length
        );
      }

      this.logger.log(`Broadcast ${broadcastId} processing completed.`);
    } catch (error) {
      this.logger.error(`Error processing broadcast ${broadcastId}:`, error);
      await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'failed' }
      });
      throw error;
    }
  }
}

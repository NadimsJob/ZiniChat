import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';

@Processor('broadcasts')
export class BroadcastsProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastsProcessor.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('whatsapp-outbound') private whatsappQueue: Queue,
    private smtpService: SmtpService,
    private notificationsService: NotificationsService
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

      // 2. Fetch contacts matching segmentFilter
      const contacts = await this.prisma.contact.findMany({
        where: { tenantId }
      });

      this.logger.log(`Found ${contacts.length} recipients for broadcast ${broadcastId}`);

      // 3. Process recipients and enqueue messages
      let delayMs = 0;
      const DELAY_BETWEEN_MESSAGES = 1000;

      for (const contact of contacts) {
        const recipient = await this.prisma.broadcastRecipient.create({
          data: {
            broadcastId,
            contactId: contact.id,
            status: 'pending'
          }
        });

        await this.whatsappQueue.add('send-message', {
          tenantId,
          messageId: `broadcast_${recipient.id}`,
          to: contact.phone,
          type: 'template',
          templateName: broadcast.template.name,
          templateLanguage: broadcast.template.language || 'bn',
          components: broadcast.template.components || [],
          content: broadcast.template.bodyText || broadcast.template.body,
        }, {
          delay: delayMs
        });

        delayMs += DELAY_BETWEEN_MESSAGES;
      }

      // Set status to completed
      await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'completed' }
      });

      // Send email & in-app notifications to all workspace owners and admins
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { users: { where: { role: { in: ['owner', 'admin'] } } } }
      });

      const admins = tenant?.users || [];

      for (const admin of admins) {
        await this.smtpService.triggerBroadcastCompletedEmail(
          admin.email,
          tenant?.businessName || 'Tenant',
          broadcast.template?.name || 'Unnamed Broadcast',
          contacts.length
        ).catch(err => this.logger.error(`Failed to send broadcast completion email to ${admin.email}`, err));

        await this.notificationsService.createNotification(
          admin.id,
          '🚀 ব্রডকাস্ট ক্যাম্পেইন সম্পন্ন হয়েছে',
          `আপনার ব্রডকাস্ট ক্যাম্পেইন (${broadcast.template?.name || 'Campaign'}) মোট ${contacts.length} জন গ্রহীতার কাছে সফলভাবে প্রেরণ করা হয়েছে।`,
          'info'
        ).catch(() => {});
      }

      this.logger.log(`Broadcast ${broadcastId} processing completed.`);
    } catch (error) {
      this.logger.error(`Error processing broadcast ${broadcastId}:`, error);

      await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'failed' }
      });

      // Send failure notification & email to all workspace admins/owners
      try {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          include: { users: { where: { role: { in: ['owner', 'admin'] } } } }
        });

        const admins = tenant?.users || [];
        for (const admin of admins) {
          const subject = `❌ ব্রডকাস্ট ক্যাম্পেইন ব্যর্থ হয়েছে – ZiniChat`;
          const plainText = `প্রিয় ${tenant?.businessName || 'User'},\n\nআপনার প্রেরিত ব্রডকাস্ট ক্যাম্পেইন প্রক্রিয়া করার সময় একটি ত্রুটি ঘটেছে এবং ক্যাম্পেইনটি ব্যর্থ হয়েছে।\n\nবিস্তারিত জানতে ড্যাশবোর্ডে লগ ইন করুন বা সাপোর্ট টিমের সাথে যোগাযোগ করুন।\n\nধন্যবাদ,\nZiniChat টিম`;

          await this.smtpService.sendMail({ to: admin.email, subject, plainText }).catch(() => {});

          await this.notificationsService.createNotification(
            admin.id,
            '❌ ব্রডকাস্ট ক্যাম্পেইন ব্যর্থ হয়েছে',
            `আপনার ব্রডকাস্ট ক্যাম্পেইন প্রক্রিয়া করার সময় ত্রুটি ঘটেছে। দয়া করে সেটিংস বা সাপোর্ট চেক করুন।`,
            'info'
          ).catch(() => {});
        }
      } catch (notifyErr) {
        this.logger.error('Failed to dispatch broadcast failure alerts:', notifyErr);
      }

      throw error;
    }
  }
}

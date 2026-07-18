import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubscriptionReminderService {
  private readonly logger = new Logger(SubscriptionReminderService.name);

  constructor(
    private prisma: PrismaService,
    private smtpService: SmtpService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron('0 9 * * *') // Every day at 9:00 AM
  async checkSubscriptionExpiries() {
    this.logger.log('Running subscription expiry reminder check...');

    const now = new Date();

    // Find subscriptions expiring in exactly 7 or 2 days
    for (const daysLeft of [7, 2]) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + daysLeft);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: { gte: startOfDay, lte: endOfDay }
        },
        include: {
          tenant: { include: { users: { where: { role: 'owner' } } } },
          plan: true
        }
      });

      for (const sub of subscriptions) {
        const owner = sub.tenant?.users?.[0];
        if (!owner) continue;

        const expiryDate = new Date(sub.currentPeriodEnd).toLocaleDateString('bn-BD', {
          year: 'numeric', month: 'long', day: 'numeric'
        });

        // Send reminder email
        await this.smtpService.triggerExpiryReminderEmail(
          owner.email,
          sub.tenant.businessName,
          daysLeft,
          expiryDate
        ).catch(err => this.logger.error(`Failed to send expiry email to ${owner.email}`, err));

        // Send in-app notification
        await this.notificationsService.createNotification(
          owner.id,
          daysLeft === 7 ? '⚠️ সাবস্ক্রিপশন রিমাইন্ডার' : '🚨 সাবস্ক্রিপশন শেষ হতে চলেছে!',
          `আপনার সাবস্ক্রিপশনের মেয়াদ মাত্র ${daysLeft} দিন পরে (${expiryDate}) শেষ হবে। এখনই রিনিউ করুন।`,
          'billing'
        ).catch(() => {});

        this.logger.log(`Sent ${daysLeft}d reminder to ${owner.email} for tenant ${sub.tenant.businessName}`);
      }
    }
  }
}

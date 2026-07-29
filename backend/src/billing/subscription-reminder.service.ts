import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
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
    this.logger.log('Running subscription expiry reminder & auto-deactivation check...');

    // 1. Process Expiry Reminders (7 days, 2 days, and 0 days / today)
    await this.sendExpiryReminders();

    // 2. Process Auto-Deactivation for Expired Subscriptions
    await this.processExpiredSubscriptions();
  }

  async sendExpiryReminders() {
    const now = new Date();

    for (const daysLeft of [7, 2, 0]) {
      // Calculate target day boundary in Asia/Dhaka timezone
      const targetDate = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000);
      const dhakaDateStr = targetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
      const startOfDay = new Date(`${dhakaDateStr}T00:00:00.000+06:00`);
      const endOfDay = new Date(`${dhakaDateStr}T23:59:59.999+06:00`);

      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: { gte: startOfDay, lte: endOfDay }
        },
        include: {
          tenant: { include: { users: { where: { role: { in: ['owner', 'admin'] } } } } },
          plan: true
        }
      });

      for (const sub of subscriptions) {
        const admins = sub.tenant?.users || [];
        if (admins.length === 0) continue;

        const expiryDateFormatted = new Date(sub.currentPeriodEnd).toLocaleDateString('bn-BD', {
          timeZone: 'Asia/Dhaka',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const title = daysLeft === 7
          ? '⚠️ সাবস্ক্রিপশন রিমাইন্ডার (৭ দিন বাকি)'
          : daysLeft === 2
          ? '🚨 সাবস্ক্রিপশন শেষ হতে চলেছে (২ দিন বাকি)!'
          : '⚡ সাবস্ক্রিপশনের মেয়াদ আজই শেষ হচ্ছে!';

        const message = daysLeft === 0
          ? `আপনার সাবস্ক্রিপশনের মেয়াদ আজ (${expiryDateFormatted}) শেষ হচ্ছে। সেবা চালু রাখতে এখনই রিনিউ করুন।`
          : `আপনার সাবস্ক্রিপশনের মেয়াদ মাত্র ${daysLeft} দিন পরে (${expiryDateFormatted}) শেষ হবে। এখনই রিনিউ করুন।`;

        for (const admin of admins) {
          // Idempotency: Check if an identical notification was sent today
          const todayDhaka = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
          const todayStart = new Date(`${todayDhaka}T00:00:00.000+06:00`);
          
          const existingNotif = await this.prisma.notification.findFirst({
            where: {
              userId: admin.id,
              type: 'billing',
              title,
              createdAt: { gte: todayStart }
            }
          });

          if (existingNotif) {
            this.logger.debug(`Skipping duplicate ${daysLeft}d reminder for user ${admin.id}`);
            continue;
          }

          // Send email
          await this.smtpService.triggerExpiryReminderEmail(
            admin.email,
            sub.tenant.businessName,
            daysLeft,
            expiryDateFormatted
          ).catch(err => this.logger.error(`Failed to send expiry email to ${admin.email}`, err));

          // Send in-app notification
          await this.notificationsService.createNotification(
            admin.id,
            title,
            message,
            'billing'
          ).catch(() => {});

          this.logger.log(`Sent ${daysLeft}d reminder to ${admin.email} for tenant ${sub.tenant.businessName}`);
        }
      }
    }
  }

  async processExpiredSubscriptions() {
    const now = new Date();

    // Find subscriptions that have passed currentPeriodEnd and are still marked active
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: { lt: now }
      },
      include: {
        tenant: { include: { users: { where: { role: { in: ['owner', 'admin'] } } } } },
        plan: true
      }
    });

    for (const sub of expiredSubscriptions) {
      // Update status to expired
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'expired' }
      });

      const admins = sub.tenant?.users || [];
      const expiryDateFormatted = new Date(sub.currentPeriodEnd).toLocaleDateString('bn-BD', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      for (const admin of admins) {
        // Send email notice
        const subject = `🔴 সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে – ZiniChat`;
        const plainText = `প্রিয় ${sub.tenant.businessName},\n\nআপনার সাবস্ক্রিপশনের (প্ল্যান: ${sub.plan?.name || 'Package'}) মেয়াদ গত ${expiryDateFormatted} তারিখে শেষ হয়েছে।\nঅ্যাকাউন্টের সমস্ত প্রিমিয়াম ফিচার সচল রাখতে দয়া করে এখনই সাবস্ক্রিপশন রিনিউ করুন।\n\nধন্যবাদ,\nZiniChat টিম`;

        await this.smtpService.sendMail({ to: admin.email, subject, plainText }).catch(err => {
          this.logger.error(`Failed to send expiration email to ${admin.email}`, err);
        });

        // Send in-app notification
        await this.notificationsService.createNotification(
          admin.id,
          '🔴 সাবস্ক্রিপশনের মেয়াদ শেষ!',
          `আপনার "${sub.plan?.name || 'Package'}" প্ল্যানের মেয়াদ শেষ হয়েছে। ফিচারগুলো ব্যবহার করতে এখনই রিনিউ করুন।`,
          'billing'
        ).catch(() => {});

        this.logger.log(`Marked sub ${sub.id} as expired and notified ${admin.email}`);
      }
    }
  }
}

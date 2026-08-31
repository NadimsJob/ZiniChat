import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';
import * as webpush from 'web-push';

@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;
  private isConfigured = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'mailto:support@zinichat.com';

    if (publicKey && privateKey) {
      this.vapidKeys = { publicKey, privateKey };
      this.isConfigured = true;
      this.logger.log('VAPID keys loaded from environment variables.');
    } else {
      // Static fallback VAPID keys so server restarts never invalidate push subscriptions
      this.vapidKeys = {
        publicKey: 'BEwReojyIlp5EQGGwWR9eCoSkwa1CriM6rgukJZmx6mIK9uFbNDhckO4L9mimltYPJib2snsDzCVyMJiZ5xiz14',
        privateKey: 'pmcsckjf-jnirfFr8qEh_JZ-0rw8Tpa2L8QBHxNCjVQ'
      };
      this.isConfigured = true;
      this.logger.log('Using permanent fallback VAPID keys for Web Push Notifications.');
    }

    if (this.isConfigured && this.vapidKeys) {
      webpush.setVapidDetails(
        email,
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );
    }
  }

  getPublicKey(): string {
    return this.vapidKeys?.publicKey || '';
  }

  async subscribe(userId: string, dto: PushSubscriptionDto) {
    // Save or update subscription
    const existing = await this.prisma.userPushSubscription.findUnique({
      where: { endpoint: dto.endpoint },
    });

    if (existing) {
      return this.prisma.userPushSubscription.update({
        where: { endpoint: dto.endpoint },
        data: {
          userId,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
          userAgent: dto.userAgent || null,
        },
      });
    }

    return this.prisma.userPushSubscription.create({
      data: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent || null,
      },
    });
  }

  async unsubscribe(endpoint: string) {
    try {
      await this.prisma.userPushSubscription.delete({
        where: { endpoint },
      });
      return { success: true };
    } catch (e) {
      // Ignore if already deleted
      return { success: false };
    }
  }

  async sendPushToUser(userId: string, title: string, body: string, dataPayload: any = {}) {
    const subscriptions = await this.prisma.userPushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      notification: {
        title,
        body,
        icon: '/logo.png', // Fallback PWA icon
        badge: '/icon.png', // Small PWA badge icon
        vibrate: [100, 50, 100],
        data: dataPayload,
      },
    });

    const tasks = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: any) {
        // If status is 410 (Gone) or 404, subscription is no longer valid, delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.log(`Removing expired subscription: ${sub.endpoint}`);
          await this.prisma.userPushSubscription.delete({
            where: { id: sub.id },
          }).catch(() => {});
        } else {
          this.logger.error(`Error sending push notification: ${err.message}`);
        }
      }
    });

    await Promise.all(tasks);
  }
}

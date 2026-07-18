import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway
  ) {}

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false }
    });
    return { count };
  }

  async createNotification(userId: string, title: string, message: string, type = 'info') {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type
      }
    });

    // Push real-time event via socket
    this.gateway.sendToUser(userId, 'notification_received', notification);

    return notification;
  }

  async createSystemNotificationForSuperadmins(title: string, message: string, type = 'system') {
    // Find all users with superadmin role
    const superadmins = await this.prisma.user.findMany({
      where: { role: 'superadmin' }
    });

    const creations = superadmins.map(admin => 
      this.createNotification(admin.id, title, message, type)
    );

    return Promise.all(creations);
  }

  async markAsRead(id: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.userId !== userId) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway
  ) {}

  async getUserNotifications(userId: string, role?: string) {
    const whereCondition: any = { userId };
    if (role === 'superadmin') {
      whereCondition.type = 'system';
    } else {
      whereCondition.type = { not: 'system' };
    }

    return this.prisma.notification.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  async getUnreadCount(userId: string, role?: string) {
    const whereCondition: any = { userId, isRead: false };
    if (role === 'superadmin') {
      whereCondition.type = 'system';
    } else {
      whereCondition.type = { not: 'system' };
    }

    const count = await this.prisma.notification.count({
      where: whereCondition
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

  async createNotificationForTenantAdmins(tenantId: string, title: string, message: string, type = 'info') {
    const tenantAdmins = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ['owner', 'admin'] }
      }
    });

    const creations = tenantAdmins.map(admin =>
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

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private smtpService: SmtpService,
    private notificationsService: NotificationsService
  ) {}

  async createTicket(tenantId: string, senderId: string, subject: string, type: string, priority: string, initialMessage: string, attachmentUrl?: string) {
    const ticket = await this.prisma.ticket.create({
      data: {
        tenantId,
        subject,
        type,
        priority,
        messages: {
          create: {
            senderType: 'tenant',
            senderId,
            message: initialMessage,
            attachmentUrl
          }
        }
      },
      include: { tenant: true }
    });

    // Notify tenant admins/owners
    const admins = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
    for (const admin of admins) {
      this.notificationsService.createNotification(
        admin.id,
        'Ticket Created',
        `Your support ticket '${subject}' has been successfully submitted.`,
        'system'
      ).catch(() => {});
    }

    // Notify superadmins
    await this.notificationsService.createSystemNotificationForSuperadmins(
      `New Ticket: ${subject}`,
      `A new support ticket was raised by ${ticket.tenant.businessName}`,
      'system'
    );
    await this.smtpService.triggerTicketCreatedEmail(ticket.tenant.businessName, subject, priority);

    return ticket;
  }

  async getTickets(user: any) {
    if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'owner') {
      if (user.role === 'superadmin') {
         return this.prisma.ticket.findMany({
           include: { tenant: true, assignedTo: true },
           orderBy: { createdAt: 'desc' }
         });
      } else {
         return this.prisma.ticket.findMany({
           where: { tenantId: user.tenantId },
           include: { assignedTo: true },
           orderBy: { createdAt: 'desc' }
         });
      }
    }
    throw new ForbiddenException('You are not authorized to view tickets');
  }

  async getTicket(id: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { 
        tenant: true, 
        assignedTo: true,
        messages: {
          include: { sender: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (user.role !== 'superadmin' && ticket.tenantId !== user.tenantId) {
      throw new ForbiddenException();
    }
    return ticket;
  }

  async getAdmins(user: any) {
    if (user.role !== 'superadmin') throw new ForbiddenException();
    return this.prisma.user.findMany({
      where: { role: 'superadmin' },
      select: { id: true, name: true, email: true }
    });
  }

  async updateStatus(id: string, status: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { tenant: { include: { users: { where: { role: { in: ['owner', 'admin'] } } } } } } });
    if (!ticket) throw new NotFoundException();

    if (user.role !== 'superadmin') throw new ForbiddenException('Only superadmins can change ticket status');

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { status }
    });

    // Notify tenant admins/owners
    const admins = ticket.tenant.users || [];
    for (const admin of admins) {
      this.notificationsService.createNotification(admin.id, `Ticket Status Updated`, `Your ticket '${ticket.subject}' is now ${status}.`, 'ticket').catch(() => {});
      await this.smtpService.triggerTicketStatusEmail(admin.email, ticket.subject, status).catch(() => {});
    }

    return updated;
  }

  async assignTicket(id: string, assignedToId: string | null, user: any) {
    if (user.role !== 'superadmin') throw new ForbiddenException();
    
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { assignedToId },
      include: { tenant: true, assignedTo: true }
    });

    if (assignedToId && updated.assignedTo) {
       this.notificationsService.createNotification(assignedToId, `Ticket Assigned`, `You have been assigned to ticket '${updated.subject}'`, 'system');
       await this.smtpService.triggerTicketAssignedEmail(updated.assignedTo.email, updated.assignedTo.name, updated.tenant.businessName, updated.subject);
    }

    return updated;
  }

  async addMessage(id: string, user: any, message: string, attachmentUrl?: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { tenant: { include: { users: { where: { role: { in: ['owner', 'admin'] } } } } } } });
    if (!ticket) throw new NotFoundException();
    if (user.role !== 'superadmin' && ticket.tenantId !== user.tenantId) throw new ForbiddenException();

    const senderType = user.role === 'superadmin' ? 'admin' : 'tenant';

    const newMessage = await this.prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderType,
        senderId: user.id,
        message,
        attachmentUrl
      },
      include: { sender: true }
    });

    if (senderType === 'admin') {
      await this.prisma.ticket.update({ where: { id }, data: { status: 'answered' } });
      const tenantUsers = await this.prisma.user.findMany({ where: { tenantId: ticket.tenantId } });
      for (const u of tenantUsers) {
        this.notificationsService.createNotification(
          u.id, 
          `New Reply on Support Ticket`, 
          `Admin replied to your ticket '${ticket.subject}'`, 
          'ticket'
        ).catch(() => {});
      }
      const tenantAdmins = tenantUsers.filter(u => u.role === 'owner' || u.role === 'admin');
      const recipients = tenantAdmins.length > 0 ? tenantAdmins : tenantUsers;
      for (const admin of recipients) {
        await this.smtpService.triggerTicketRepliedEmail(admin.email, ticket.subject, message).catch(() => {});
      }
    } else {
      await this.prisma.ticket.update({ where: { id }, data: { status: 'open' } });
      if (ticket.assignedToId) {
        const assignedAdmin = await this.prisma.user.findUnique({ where: { id: ticket.assignedToId } });
        if (assignedAdmin) {
          this.notificationsService.createNotification(assignedAdmin.id, `Ticket Reply`, `${ticket.tenant.businessName} replied to ticket '${ticket.subject}'`, 'ticket').catch(() => {});
          await this.smtpService.triggerTicketRepliedEmail(assignedAdmin.email, ticket.subject, message).catch(() => {});
        }
      } else {
        await this.notificationsService.createSystemNotificationForSuperadmins(`Ticket Reply`, `${ticket.tenant.businessName} replied to ticket '${ticket.subject}'`, 'ticket');
        const superadminEmails = await this.smtpService.getAdminNotificationEmails();
        for (const email of superadminEmails) {
          await this.smtpService.triggerTicketRepliedEmail(email, ticket.subject, message).catch(() => {});
        }
      }
    }

    return newMessage;
  }

  async getUnreadTicketCount(user: any) {
    const count = await this.prisma.notification.count({
      where: {
        userId: user.id,
        type: 'ticket',
        isRead: false
      }
    });
    return { unreadCount: count };
  }

  async markTicketNotificationsAsRead(user: any) {
    await this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        type: 'ticket',
        isRead: false
      },
      data: { isRead: true }
    });
    return { success: true };
  }
}

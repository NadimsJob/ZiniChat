import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: any;

  const mockPrisma: any = {
    ticket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'user-1', email: 'owner@test.com', role: 'owner' }),
      findMany: jest.fn().mockResolvedValue([{ id: 'user-1', email: 'owner@test.com', role: 'owner' }]),
    },
    ticketMessage: {
      create: jest.fn(),
    },
  };

  const mockSmtpService = {
    triggerTicketCreatedEmail: jest.fn().mockResolvedValue(undefined),
    triggerTicketRepliedEmail: jest.fn().mockResolvedValue(undefined),
    triggerTicketStatusEmail: jest.fn().mockResolvedValue(undefined),
    triggerTicketAssignedEmail: jest.fn().mockResolvedValue(undefined),
    getAdminNotificationEmails: jest.fn().mockResolvedValue(['superadmin@test.com']),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({}),
    createSystemNotificationForSuperadmins: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SmtpService, useValue: mockSmtpService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTicket', () => {
    it('should create ticket and trigger notifications', async () => {
      const mockTicket = { id: 't-1', tenantId: 'tenant-1', subject: 'Help', tenant: { businessName: 'Biz' } };
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

      const result = await service.createTicket('tenant-1', 'user-1', 'Help', 'General', 'medium', 'Issue description');
      expect(mockPrisma.ticket.create).toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
      expect(mockNotificationsService.createSystemNotificationForSuperadmins).toHaveBeenCalled();
      expect(result).toEqual(mockTicket);
    });
  });

  describe('getTickets', () => {
    it('should return all tickets for superadmin', async () => {
      const mockTickets = [{ id: 't-1' }];
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await service.getTickets({ role: 'superadmin' });
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockTickets);
    });

    it('should return tenant tickets for tenant owner', async () => {
      const mockTickets = [{ id: 't-1' }];
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await service.getTickets({ role: 'owner', tenantId: 'tenant-1' });
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockTickets);
    });

    it('should throw ForbiddenException for basic agent role without permission', async () => {
      await expect(service.getTickets({ role: 'agent', tenantId: 'tenant-1' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTicket', () => {
    it('should return ticket if user belongs to tenant', async () => {
      const mockTicket = { id: 't-1', tenantId: 'tenant-1' };
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.getTicket('t-1', { role: 'owner', tenantId: 'tenant-1' });
      expect(result).toEqual(mockTicket);
    });

    it('should throw ForbiddenException if user belongs to another tenant', async () => {
      const mockTicket = { id: 't-1', tenantId: 'tenant-1' };
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);

      await expect(service.getTicket('t-1', { role: 'owner', tenantId: 'tenant-2' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.getTicket('invalid-id', { role: 'superadmin' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('unread ticket notifications', () => {
    it('should return unread ticket count for user', async () => {
      mockPrisma.notification = { count: jest.fn().mockResolvedValue(3), updateMany: jest.fn().mockResolvedValue({ count: 3 }) };
      const res = await service.getUnreadTicketCount({ id: 'u-1' });
      expect(res).toEqual({ unreadCount: 3 });
    });

    it('should mark unread ticket notifications as read', async () => {
      mockPrisma.notification = { count: jest.fn().mockResolvedValue(3), updateMany: jest.fn().mockResolvedValue({ count: 3 }) };
      const res = await service.markTicketNotificationsAsRead({ id: 'u-1' });
      expect(res).toEqual({ success: true });
    });
  });
});

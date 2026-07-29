import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionReminderService } from './subscription-reminder.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('SubscriptionReminderService', () => {
  let service: SubscriptionReminderService;

  const mockTenant = {
    id: 'tenant-1',
    businessName: 'Acme Corp',
    users: [
      { id: 'user-1', email: 'owner@acme.com', role: 'owner' },
      { id: 'user-2', email: 'admin@acme.com', role: 'admin' },
    ],
  };

  const mockSubscription7d = {
    id: 'sub-7d',
    tenantId: 'tenant-1',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    tenant: mockTenant,
    plan: { name: 'Pro Plan' },
  };

  const mockSubscriptionExpired = {
    id: 'sub-expired',
    tenantId: 'tenant-1',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
    tenant: mockTenant,
    plan: { name: 'Basic Plan' },
  };

  const mockPrismaService = {
    subscription: {
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'sub-expired', status: 'expired' }),
    },
    notification: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  const mockSmtpService = {
    triggerExpiryReminderEmail: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionReminderService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SmtpService, useValue: mockSmtpService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<SubscriptionReminderService>(SubscriptionReminderService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendExpiryReminders', () => {
    it('should send 7-day expiry reminders to ALL workspace admins/owners', async () => {
      mockPrismaService.subscription.findMany
        .mockResolvedValueOnce([mockSubscription7d])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.sendExpiryReminders();

      // Should send email to both owner and admin (2 users)
      expect(mockSmtpService.triggerExpiryReminderEmail).toHaveBeenCalledTimes(2);
      expect(mockSmtpService.triggerExpiryReminderEmail).toHaveBeenCalledWith(
        'owner@acme.com',
        'Acme Corp',
        7,
        expect.any(String)
      );
      expect(mockSmtpService.triggerExpiryReminderEmail).toHaveBeenCalledWith(
        'admin@acme.com',
        'Acme Corp',
        7,
        expect.any(String)
      );

      // Should send in-app notifications to both users
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should skip sending if notification was already sent today (idempotency)', async () => {
      mockPrismaService.subscription.findMany.mockResolvedValue([mockSubscription7d]);
      mockPrismaService.notification.findFirst.mockResolvedValue({ id: 'notif-1' });

      await service.sendExpiryReminders();

      expect(mockSmtpService.triggerExpiryReminderEmail).not.toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('processExpiredSubscriptions', () => {
    it('should update status to expired and notify all workspace admins/owners', async () => {
      mockPrismaService.subscription.findMany.mockResolvedValue([mockSubscriptionExpired]);

      await service.processExpiredSubscriptions();

      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-expired' },
        data: { status: 'expired' },
      });

      expect(mockSmtpService.sendMail).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('মেয়াদ শেষ'),
        expect.any(String),
        'billing'
      );
    });
  });
});

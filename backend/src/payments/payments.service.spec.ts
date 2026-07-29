import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  plan: {
    findUnique: jest.fn(),
  },
  addon: {
    findUnique: jest.fn(),
  },
  user: {
    findFirst: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
    findMany: jest.fn().mockResolvedValue([{ id: 'user-1', email: 'test@example.com' }]),
  },
};

const mockSmtpService = {
  triggerPaymentSubmittedEmail: jest.fn().mockResolvedValue(true),
  triggerPaymentPendingAdminEmail: jest.fn().mockResolvedValue(true),
  triggerPaymentApprovedEmail: jest.fn().mockResolvedValue(true),
  triggerAddonPurchasedEmail: jest.fn().mockResolvedValue(true),
  triggerPaymentRejectedEmail: jest.fn().mockResolvedValue(true),
};

const mockNotificationsService = {
  createNotification: jest.fn().mockResolvedValue(true),
  createSystemNotificationForSuperadmins: jest.fn().mockResolvedValue(true),
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SmtpService, useValue: mockSmtpService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUpcomingBill', () => {
    it('should return upcoming bill details with next bill date and days remaining', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20);

      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-1',
        customPlanName: 'Enterprise Pro',
        plan: { id: 'p-1', name: 'Pro Plan', priceMonthlyBdt: 1500 },
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodEnd: futureDate,
        plan: { id: 'p-1', name: 'Pro Plan', priceMonthlyBdt: 1500 },
      });
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      const res = await service.getUpcomingBill('t-1');
      expect(res).toBeDefined();
      expect(res.planName).toBe('Enterprise Pro');
      expect(res.amountBdt).toBe(1500);
      expect(res.daysRemaining).toBeGreaterThanOrEqual(19);
      expect(res.isPaidAdvance).toBe(true);
      expect(res.hasPendingPayment).toBe(false);
    });
  });
});

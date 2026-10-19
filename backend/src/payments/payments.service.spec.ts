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

    it('should return promo discounted amount when promo is active for monthly cycle', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-promo',
        plan: { id: 'p-promo', name: 'Growth Plan', priceMonthlyBdt: 2000, promoPriceMonthlyBdt: 999, promoMonths: 2 },
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-promo',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodEnd: futureDate,
        plan: { id: 'p-promo', name: 'Growth Plan', priceMonthlyBdt: 2000, promoPriceMonthlyBdt: 999, promoMonths: 2 },
      });
      mockPrisma.payment.count.mockResolvedValue(0); // 0 successful payments, so promo is active
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      const res = await service.getUpcomingBill('t-promo');
      expect(res.amountBdt).toBe(999);
      expect(res.regularPriceBdt).toBe(2000);
      expect(res.isPromoActive).toBe(true);
      expect(res.promoMonthsRemaining).toBe(2);
    });

    it('should return regular price after promo months are exhausted', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-promo',
        plan: { id: 'p-promo', name: 'Growth Plan', priceMonthlyBdt: 2000, promoPriceMonthlyBdt: 999, promoMonths: 2 },
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-promo',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodEnd: futureDate,
        plan: { id: 'p-promo', name: 'Growth Plan', priceMonthlyBdt: 2000, promoPriceMonthlyBdt: 999, promoMonths: 2 },
      });
      mockPrisma.payment.count.mockResolvedValue(2); // 2 successful payments = promo exhausted
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      const res = await service.getUpcomingBill('t-promo');
      expect(res.amountBdt).toBe(2000);
      expect(res.isPromoActive).toBe(false);
      expect(res.promoMonthsRemaining).toBe(0);
    });
  });

  describe('Addon Purchase Active Package Prerequisite', () => {
    it('should throw BadRequestException when tenant has no active package subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't-no-pkg', customPlanName: null });

      await expect(service.assertTenantHasActivePackage('t-no-pkg')).rejects.toThrow(
        /সক্রিয় প্যাকেজ/
      );
    });

    it('should throw BadRequestException when tenant only has Free plan', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-free',
        status: 'active',
        currentPeriodEnd: futureDate,
        plan: { id: 'p-free', name: 'Free' },
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't-free', customPlanName: null });

      await expect(service.assertTenantHasActivePackage('t-free')).rejects.toThrow(
        /সক্রিয় প্যাকেজ/
      );
    });

    it('should pass validation when tenant has an active paid package', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 25);

      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-active',
        status: 'active',
        currentPeriodEnd: futureDate,
        plan: { id: 'p-starter', name: 'Starter' },
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't-active', customPlanName: null });

      await expect(service.assertTenantHasActivePackage('t-active')).resolves.not.toThrow();
    });

    it('should pass validation when tenant has a custom enterprise plan', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't-custom', customPlanName: 'Custom Enterprise' });

      await expect(service.assertTenantHasActivePackage('t-custom')).resolves.not.toThrow();
    });

    it('submitManualPaymentForAddon should block purchase if no active package', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't-no-pkg', customPlanName: null });

      await expect(service.submitManualPaymentForAddon('t-no-pkg', 'addon-1', 'TRX123')).rejects.toThrow(
        /সক্রিয় প্যাকেজ/
      );
    });

    it('submitSandboxPaymentForAddon should block purchase if no active package', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't-no-pkg', customPlanName: null });

      await expect(service.submitSandboxPaymentForAddon('t-no-pkg', 'addon-1')).rejects.toThrow(
        /সক্রিয় প্যাকেজ/
      );
    });
  });
});


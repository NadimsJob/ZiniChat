import { Test, TestingModule } from '@nestjs/testing';
import { QuotaService } from './quota.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ForbiddenException } from '@nestjs/common';
import { SmtpService } from '../smtp/smtp.service';

// ─── Shared Fixtures ───────────────────────────────────────────────────────────
const TENANT_ID = 'tenant-uuid-001';
const PERIOD_START = new Date('2026-07-01T00:00:00.000Z');
const PERIOD_END = new Date('2026-07-31T23:59:59.000Z');

const mockActivePeriod = (overrides?: Partial<{ messageQuota: number; aiQuota: number }>) => ({
  periodStart: PERIOD_START,
  periodEnd: PERIOD_END,
  messageQuota: overrides?.messageQuota ?? 300,
  aiQuota: overrides?.aiQuota ?? 200,
  subscription: { id: 'sub-001' },
});

const mockActiveTenant = (overrides?: any) => ({
  id: TENANT_ID,
  status: 'active',
  storageUsedBytes: BigInt(0),
  customMessageQuota: null,
  customAiQuota: null,
  customStorageLimitMb: null,
  customFeatures: null,
  subscriptions: [{ plan: { messageQuota: 300, aiQuota: 200, storageLimitMb: 500, features: [] } }],
  ...overrides,
});

// ─── Mock Factories ─────────────────────────────────────────────────────────────
const createPrismaMock = () => ({
  tenant: { findUnique: jest.fn(), update: jest.fn() },
  user: { findMany: jest.fn().mockResolvedValue([]) },
  message: { count: jest.fn() },
  broadcastRecipient: { count: jest.fn() },
  aiUsageLog: { count: jest.fn() },
  product: { count: jest.fn() },
});

const createBillingMock = () => ({
  getActivePeriod: jest.fn(),
  getTenantQuotas: jest.fn(),
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('QuotaService', () => {
  let service: QuotaService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let billing: ReturnType<typeof createBillingMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    billing = createBillingMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        { provide: PrismaService, useValue: prisma },
        { provide: BillingService, useValue: billing },
        { provide: NotificationsService, useValue: { createNotification: jest.fn().mockResolvedValue({}) } },
        { provide: SmtpService, useValue: {
          triggerStorageWarningEmail: jest.fn().mockResolvedValue({}),
          triggerMessageWarningEmail: jest.fn().mockResolvedValue({}),
          triggerAiWarningEmail: jest.fn().mockResolvedValue({})
        } },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
  });

  // ─── isTenantSubscriptionActive ──────────────────────────────────────────────
  describe('isTenantSubscriptionActive', () => {
    it('returns TENANT_NOT_FOUND if tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      const res = await service.isTenantSubscriptionActive(TENANT_ID);
      expect(res).toEqual({ isActive: false, reason: 'TENANT_NOT_FOUND' });
    });

    it('returns TENANT_SUSPENDED if tenant status is suspended', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, status: 'suspended', subscriptions: [] });
      const res = await service.isTenantSubscriptionActive(TENANT_ID);
      expect(res).toEqual({ isActive: false, reason: 'TENANT_SUSPENDED' });
    });

    it('returns isActive: true if tenant is within trial period', async () => {
      const futureTrial = new Date(Date.now() + 86400000);
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        status: 'active',
        trialEndsAt: futureTrial,
        subscriptions: []
      });
      const res = await service.isTenantSubscriptionActive(TENANT_ID);
      expect(res).toEqual({ isActive: true });
    });

    it('returns isActive: true if tenant has an active subscription', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        status: 'active',
        trialEndsAt: null,
        subscriptions: [{ id: 'sub-1', status: 'active' }]
      });
      const res = await service.isTenantSubscriptionActive(TENANT_ID);
      expect(res).toEqual({ isActive: true });
    });

    it('returns SUBSCRIPTION_EXPIRED if trial has ended and no active subscription exists', async () => {
      const pastTrial = new Date(Date.now() - 86400000);
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        status: 'active',
        trialEndsAt: pastTrial,
        subscriptions: []
      });
      const res = await service.isTenantSubscriptionActive(TENANT_ID);
      expect(res).toEqual({ isActive: false, reason: 'SUBSCRIPTION_EXPIRED' });
    });
  });

  // ─── checkMessageQuota ───────────────────────────────────────────────────────
  describe('checkMessageQuota', () => {
    it('throws ForbiddenException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.checkMessageQuota(TENANT_ID)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when tenant is suspended', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ status: 'suspended' });
      await expect(service.checkMessageQuota(TENANT_ID)).rejects.toThrow(
        'Account suspended'
      );
    });

    it('throws ForbiddenException when outbound message quota is reached', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockActiveTenant());
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ messageQuota: 10 }));
      // 8 direct messages + 2 broadcast = 10 = exactly at limit
      prisma.message.count.mockResolvedValue(8);
      prisma.broadcastRecipient.count.mockResolvedValue(2);

      await expect(service.checkMessageQuota(TENANT_ID)).rejects.toThrow(
        /Message quota exceeded \(10\/10\)/
      );
    });

    it('throws ForbiddenException when only broadcast recipients exceed quota', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockActiveTenant());
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ messageQuota: 5 }));
      prisma.message.count.mockResolvedValue(0);
      prisma.broadcastRecipient.count.mockResolvedValue(6); // exceeds limit of 5

      await expect(service.checkMessageQuota(TENANT_ID)).rejects.toThrow(
        /Message quota exceeded/
      );
    });

    it('passes when total usage is below quota', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockActiveTenant());
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ messageQuota: 300 }));
      prisma.message.count.mockResolvedValue(50);
      prisma.broadcastRecipient.count.mockResolvedValue(30);

      await expect(service.checkMessageQuota(TENANT_ID)).resolves.toBeUndefined();
    });

    it('uses subscription period (periodStart) for message count — not calendar month', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockActiveTenant());
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod());
      prisma.message.count.mockResolvedValue(0);
      prisma.broadcastRecipient.count.mockResolvedValue(0);

      await service.checkMessageQuota(TENANT_ID);

      // Ensure the message count was filtered by periodStart from billing service
      expect(prisma.message.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: PERIOD_START },
            direction: 'outbound',
          }),
        })
      );
    });

    it('triggers 80% message warning if usage hits 80% and period not yet notified', async () => {
      const tenantMock = mockActiveTenant({
        messageQuota80NotifiedAt: null
      });
      prisma.tenant.findUnique.mockResolvedValue(tenantMock);
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ messageQuota: 100 }));
      prisma.message.count.mockResolvedValue(80); // 80% of 100
      prisma.broadcastRecipient.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1', email: 'admin@test.com', role: 'admin' }]);

      const notificationsService = (service as any).notificationsService;
      const smtpService = (service as any).smtpService;

      await service.checkMessageQuota(TENANT_ID);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { messageQuota80NotifiedAt: PERIOD_START }
      });
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        'admin-1',
        expect.stringContaining('৮০%'),
        expect.any(String),
        'system'
      );
      expect(smtpService.triggerMessageWarningEmail).toHaveBeenCalledWith(
        'admin@test.com',
        expect.any(String),
        80,
        80,
        100
      );
    });

    it('does not trigger 80% message warning if already notified for current period', async () => {
      const tenantMock = mockActiveTenant({
        messageQuota80NotifiedAt: PERIOD_START
      });
      prisma.tenant.findUnique.mockResolvedValue(tenantMock);
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ messageQuota: 100 }));
      prisma.message.count.mockResolvedValue(80);
      prisma.broadcastRecipient.count.mockResolvedValue(0);
      prisma.tenant.update.mockClear();

      await service.checkMessageQuota(TENANT_ID);

      expect(prisma.tenant.update).not.toHaveBeenCalled();
    });

    it('triggers 100% message warning if usage hits 100% and period not yet notified', async () => {
      const tenantMock = mockActiveTenant({
        messageQuota100NotifiedAt: null
      });
      prisma.tenant.findUnique.mockResolvedValue(tenantMock);
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ messageQuota: 100 }));
      prisma.message.count.mockResolvedValue(100);
      prisma.broadcastRecipient.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1', email: 'admin@test.com', role: 'admin' }]);

      const notificationsService = (service as any).notificationsService;
      const smtpService = (service as any).smtpService;

      try {
        await service.checkMessageQuota(TENANT_ID);
      } catch (e) {}

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { messageQuota100NotifiedAt: PERIOD_START }
      });
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        'admin-1',
        expect.stringContaining('সম্পূর্ণ শেষ'),
        expect.any(String),
        'system'
      );
      expect(smtpService.triggerMessageWarningEmail).toHaveBeenCalledWith(
        'admin@test.com',
        expect.any(String),
        100,
        100,
        100
      );
    });
  });

  // ─── getMessageUsage ─────────────────────────────────────────────────────────
  describe('getMessageUsage', () => {
    it('combines direct outbound messages and sent broadcast recipients', async () => {
      prisma.message.count.mockResolvedValue(70);
      prisma.broadcastRecipient.count.mockResolvedValue(30);

      const result = await service.getMessageUsage(TENANT_ID, PERIOD_START);
      expect(result).toBe(100); // 70 + 30
    });

    it('excludes failed and pending broadcast recipients', async () => {
      prisma.message.count.mockResolvedValue(0);
      prisma.broadcastRecipient.count.mockResolvedValue(50);

      await service.getMessageUsage(TENANT_ID, PERIOD_START);

      expect(prisma.broadcastRecipient.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { notIn: ['pending', 'failed'] },
          }),
        })
      );
    });

    it('returns 0 when no messages sent', async () => {
      prisma.message.count.mockResolvedValue(0);
      prisma.broadcastRecipient.count.mockResolvedValue(0);

      const result = await service.getMessageUsage(TENANT_ID, PERIOD_START);
      expect(result).toBe(0);
    });
  });

  // ─── checkAiQuota ────────────────────────────────────────────────────────────
  describe('checkAiQuota', () => {
    it('throws ForbiddenException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.checkAiQuota(TENANT_ID)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when AI quota is reached', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockActiveTenant());
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ aiQuota: 200 }));
      prisma.aiUsageLog.count.mockResolvedValue(200); // exactly at limit

      await expect(service.checkAiQuota(TENANT_ID)).rejects.toThrow(
        /AI quota exceeded \(200\/200\)/
      );
    });

    it('passes when AI usage is below quota', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockActiveTenant());
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ aiQuota: 200 }));
      prisma.aiUsageLog.count.mockResolvedValue(199);

      await expect(service.checkAiQuota(TENANT_ID)).resolves.toBeUndefined();
    });

    it('uses subscription period start for AI log count', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockActiveTenant());
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod());
      prisma.aiUsageLog.count.mockResolvedValue(0);

      await service.checkAiQuota(TENANT_ID);

      expect(prisma.aiUsageLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: PERIOD_START },
          }),
        })
      );
    });

    it('triggers 80% AI warning if usage hits 80% and period not yet notified', async () => {
      const tenantMock = mockActiveTenant({
        aiQuota80NotifiedAt: null
      });
      prisma.tenant.findUnique.mockResolvedValue(tenantMock);
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ aiQuota: 100 }));
      prisma.aiUsageLog.count.mockResolvedValue(80);
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1', email: 'admin@test.com', role: 'admin' }]);

      const notificationsService = (service as any).notificationsService;
      const smtpService = (service as any).smtpService;

      await service.checkAiQuota(TENANT_ID);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { aiQuota80NotifiedAt: PERIOD_START }
      });
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        'admin-1',
        expect.stringContaining('৮০%'),
        expect.any(String),
        'system'
      );
      expect(smtpService.triggerAiWarningEmail).toHaveBeenCalledWith(
        'admin@test.com',
        expect.any(String),
        80,
        80,
        100
      );
    });

    it('does not trigger 80% AI warning if already notified for current period', async () => {
      const tenantMock = mockActiveTenant({
        aiQuota80NotifiedAt: PERIOD_START
      });
      prisma.tenant.findUnique.mockResolvedValue(tenantMock);
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ aiQuota: 100 }));
      prisma.aiUsageLog.count.mockResolvedValue(80);
      prisma.tenant.update.mockClear();

      await service.checkAiQuota(TENANT_ID);

      expect(prisma.tenant.update).not.toHaveBeenCalled();
    });

    it('triggers 100% AI warning if usage hits 100% and period not yet notified', async () => {
      const tenantMock = mockActiveTenant({
        aiQuota100NotifiedAt: null
      });
      prisma.tenant.findUnique.mockResolvedValue(tenantMock);
      billing.getActivePeriod.mockResolvedValue(mockActivePeriod({ aiQuota: 100 }));
      prisma.aiUsageLog.count.mockResolvedValue(100);
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1', email: 'admin@test.com', role: 'admin' }]);

      const notificationsService = (service as any).notificationsService;
      const smtpService = (service as any).smtpService;

      try {
        await service.checkAiQuota(TENANT_ID);
      } catch (e) {}

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { aiQuota100NotifiedAt: PERIOD_START }
      });
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        'admin-1',
        expect.stringContaining('সম্পূর্ণ শেষ'),
        expect.any(String),
        'system'
      );
      expect(smtpService.triggerAiWarningEmail).toHaveBeenCalledWith(
        'admin@test.com',
        expect.any(String),
        100,
        100,
        100
      );
    });
  });

  // ─── getActivePeriodForTenant ─────────────────────────────────────────────────
  describe('getActivePeriodForTenant', () => {
    it('delegates to BillingService.getActivePeriod', async () => {
      const expected = mockActivePeriod();
      billing.getActivePeriod.mockResolvedValue(expected);

      const result = await service.getActivePeriodForTenant(TENANT_ID);

      expect(billing.getActivePeriod).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toBe(expected);
    });
  });

  // ─── checkStorageQuota ────────────────────────────────────────────────────────
  describe('checkStorageQuota', () => {
    it('throws ForbiddenException when storage is exceeded', async () => {
      const limitMb = 100;
      const limitBytes = BigInt(limitMb * 1024 * 1024);
      prisma.tenant.findUnique.mockResolvedValue({
        ...mockActiveTenant({ storageUsedBytes: limitBytes }),
        subscriptions: [{ plan: { storageLimitMb: limitMb } }],
      });

      await expect(service.checkStorageQuota(TENANT_ID, 1)).rejects.toThrow(
        /Storage quota exceeded/
      );
    });

    it('passes when storage is under limit', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        ...mockActiveTenant({ storageUsedBytes: BigInt(1024) }),
        subscriptions: [{ plan: { storageLimitMb: 500 } }],
      });

      await expect(service.checkStorageQuota(TENANT_ID, 100)).resolves.toBeUndefined();
    });

    it('triggers 80% warning if storage usage hits 80% and warning flag is not set', async () => {
      const limitMb = 100;
      // 80% of 100MB is 80MB = 83886080 bytes
      const bytesUsed80 = BigInt(80 * 1024 * 1024);
      const tenantMock = {
        ...mockActiveTenant({ storageUsedBytes: bytesUsed80 }),
        subscriptions: [{ plan: { storageLimitMb: limitMb } }],
        storageWarning80Notified: false
      };

      prisma.tenant.findUnique.mockResolvedValue(tenantMock);
      prisma.tenant.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1', email: 'admin@test.com', role: 'admin' }]);

      const notificationsService = (service as any).notificationsService;
      const smtpService = (service as any).smtpService;

      await service.checkStorageQuota(TENANT_ID, 0);

      // Verify DB flag update
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { storageWarning80Notified: true }
      });
      // Verify notification creation
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        'admin-1',
        expect.stringContaining('৮০%'),
        expect.any(String),
        'system'
      );
      // Verify SMTP trigger
      expect(smtpService.triggerStorageWarningEmail).toHaveBeenCalledWith(
        'admin@test.com',
        expect.any(String),
        80,
        expect.any(String),
        '100'
      );
    });

    it('does not trigger 80% warning if flag is already set', async () => {
      const limitMb = 100;
      const bytesUsed80 = BigInt(80 * 1024 * 1024);
      const tenantMock = {
        ...mockActiveTenant({ storageUsedBytes: bytesUsed80 }),
        subscriptions: [{ plan: { storageLimitMb: limitMb } }],
        storageWarning80Notified: true
      };

      prisma.tenant.findUnique.mockResolvedValue(tenantMock);
      prisma.tenant.update.mockClear();

      await service.checkStorageQuota(TENANT_ID, 0);

      expect(prisma.tenant.update).not.toHaveBeenCalled();
    });

    it('triggers 100% warning if storage usage hits 100% and warning flag is not set', async () => {
      const limitMb = 100;
      const bytesUsed100 = BigInt(100 * 1024 * 1024);
      const tenantMock = {
        ...mockActiveTenant({ storageUsedBytes: bytesUsed100 }),
        subscriptions: [{ plan: { storageLimitMb: limitMb } }],
        storageWarning100Notified: false
      };

      prisma.tenant.findUnique.mockResolvedValue(tenantMock);
      prisma.tenant.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1', email: 'admin@test.com', role: 'admin' }]);

      const notificationsService = (service as any).notificationsService;
      const smtpService = (service as any).smtpService;

      // Wrap in try-catch because it will also throw storage quota exceeded ForbiddenException
      try {
        await service.checkStorageQuota(TENANT_ID, 0);
      } catch (e) {}

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { storageWarning100Notified: true }
      });
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        'admin-1',
        expect.stringContaining('সম্পূর্ণ পূর্ণ'),
        expect.any(String),
        'system'
      );
      expect(smtpService.triggerStorageWarningEmail).toHaveBeenCalledWith(
        'admin@test.com',
        expect.any(String),
        100,
        expect.any(String),
        '100'
      );
    });
  });

  // ─── checkFeature ─────────────────────────────────────────────────────────────
  describe('checkFeature', () => {
    it('returns false when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      expect(await service.checkFeature(TENANT_ID, 'commerce')).toBe(false);
    });

    it('returns true when feature is in customFeatures', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        customFeatures: ['commerce', 'ai_assistant'],
        subscriptions: [],
      });
      expect(await service.checkFeature(TENANT_ID, 'commerce')).toBe(true);
    });

    it('returns false when customFeatures is set but feature is missing', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        customFeatures: ['ai_assistant'],
        subscriptions: [],
      });
      expect(await service.checkFeature(TENANT_ID, 'commerce')).toBe(false);
    });

    it('returns true when feature is in plan features (no custom override)', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        customFeatures: null,
        subscriptions: [{ plan: { features: ['commerce', 'leads'] } }],
      });
      expect(await service.checkFeature(TENANT_ID, 'leads')).toBe(true);
    });

    it('returns false when feature is not in plan features', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        customFeatures: null,
        subscriptions: [{ plan: { features: ['commerce'] } }],
      });
      expect(await service.checkFeature(TENANT_ID, 'ai_assistant')).toBe(false);
    });
  });

  // ─── incrementStorage / decrementStorage ─────────────────────────────────────
  describe('incrementStorage', () => {
    it('calls prisma.tenant.update with increment', async () => {
      prisma.tenant.update.mockResolvedValue({});
      await service.incrementStorage(TENANT_ID, 2048);
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { storageUsedBytes: { increment: 2048 } },
      });
    });
  });

  describe('decrementStorage', () => {
    it('decrements storage correctly', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ storageUsedBytes: BigInt(5000) });
      prisma.tenant.update.mockResolvedValue({});

      await service.decrementStorage(TENANT_ID, 2000);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: {
          storageUsedBytes: BigInt(3000),
          storageWarning80Notified: false,
          storageWarning100Notified: false,
        },
      });
    });

    it('does not go below 0 (prevents negative storage)', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ storageUsedBytes: BigInt(100) });
      prisma.tenant.update.mockResolvedValue({});

      await service.decrementStorage(TENANT_ID, 99999);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: {
          storageUsedBytes: BigInt(0),
          storageWarning80Notified: false,
          storageWarning100Notified: false
        },
      });
    });

    it('resets notification flags if usage drops below thresholds on decrement', async () => {
      const limitMb = 100;
      // Start at 90MB, decrement by 20MB down to 70MB (70% full)
      const initialBytes = BigInt(90 * 1024 * 1024);
      prisma.tenant.findUnique.mockResolvedValue({
        storageUsedBytes: initialBytes,
        customStorageLimitMb: limitMb
      });
      prisma.tenant.update.mockResolvedValue({});

      await service.decrementStorage(TENANT_ID, 20 * 1024 * 1024);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: {
          storageUsedBytes: BigInt(70 * 1024 * 1024),
          storageWarning80Notified: false,
          storageWarning100Notified: false
        }
      });
    });
  });

  // ─── checkProductCatalogQuota ────────────────────────────────────────────────
  describe('checkProductCatalogQuota', () => {
    it('throws ForbiddenException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.checkProductCatalogQuota(TENANT_ID)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when tenant is suspended', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ status: 'suspended' });
      await expect(service.checkProductCatalogQuota(TENANT_ID)).rejects.toThrow('Account suspended');
    });

    it('throws ForbiddenException when product catalog limit is reached', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockActiveTenant());
      billing.getTenantQuotas.mockResolvedValue({ productCatalogLimit: 5 });
      prisma.product.count.mockResolvedValue(5);

      await expect(service.checkProductCatalogQuota(TENANT_ID)).rejects.toThrow(
        /Product catalog limit reached \(5\/5\)/
      );
    });

    it('passes when product count is below limit', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockActiveTenant());
      billing.getTenantQuotas.mockResolvedValue({ productCatalogLimit: 5 });
      prisma.product.count.mockResolvedValue(4);

      await expect(service.checkProductCatalogQuota(TENANT_ID)).resolves.not.toThrow();
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { QuotaService } from './quota.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { ForbiddenException } from '@nestjs/common';

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
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
        data: { storageUsedBytes: BigInt(3000) },
      });
    });

    it('does not go below 0 (prevents negative storage)', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ storageUsedBytes: BigInt(100) });
      prisma.tenant.update.mockResolvedValue({});

      await service.decrementStorage(TENANT_ID, 99999);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { storageUsedBytes: BigInt(0) },
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


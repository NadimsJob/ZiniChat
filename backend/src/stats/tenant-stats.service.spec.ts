import { Test, TestingModule } from '@nestjs/testing';
import { TenantStatsService } from './tenant-stats.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { BillingService } from '../billing/billing.service';

const mockPrisma = {
  tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't-1' }) },
  message: { count: jest.fn().mockResolvedValue(10), findMany: jest.fn().mockResolvedValue([]) },
  aiUsageLog: { count: jest.fn().mockResolvedValue(5), aggregate: jest.fn().mockResolvedValue({ _sum: { costUsd: '0.05', tokensUsed: 500 }, _count: 5 }) },
  conversation: { count: jest.fn().mockResolvedValue(3), findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
  user: { count: jest.fn().mockResolvedValue(2) },
  broadcast: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([]) },
  contact: { count: jest.fn().mockResolvedValue(20), groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([]) },
  product: { count: jest.fn().mockResolvedValue(15) },
  channelConnection: { findMany: jest.fn().mockResolvedValue([]) },
  stage: { findMany: jest.fn().mockResolvedValue([]) },
  order: { count: jest.fn().mockResolvedValue(4), aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: '500' } }), findMany: jest.fn().mockResolvedValue([]) },
  broadcastRecipient: { count: jest.fn().mockResolvedValue(2), aggregate: jest.fn().mockResolvedValue({ _count: { id: 2 } }) },
  label: { findMany: jest.fn().mockResolvedValue([]) },
  websiteWidget: { findMany: jest.fn().mockResolvedValue([]) },
};

const mockQuotaService = {
  getMessageUsage: jest.fn().mockResolvedValue(50),
};

const mockBillingService = {
  getActivePeriod: jest.fn().mockResolvedValue({
    periodStart: new Date(),
    messageQuota: 1000,
    aiQuota: 500,
    subscription: { currentPeriodEnd: new Date(), plan: { features: ['ai_bot'] } },
  }),
  getTenantQuotas: jest.fn().mockResolvedValue({
    whatsappLimit: 2,
    messengerLimit: 2,
    instagramLimit: 2,
    messageQuota: 1000,
    aiQuota: 500,
    seatLimit: 5,
    storageLimitMb: 1024,
    features: ['ai_bot'],
    basePlan: { name: 'Pro Plan' },
  }),
};

describe('TenantStatsService', () => {
  let service: TenantStatsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantStatsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QuotaService, useValue: mockQuotaService },
        { provide: BillingService, useValue: mockBillingService },
      ],
    }).compile();

    service = module.get<TenantStatsService>(TenantStatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardOverview', () => {
    it('should return executive KPI summary for default 30d range', async () => {
      const res = await service.getDashboardOverview('t-1');
      expect(res).toBeDefined();
      expect(res.range).toBe('30d');
      expect(res.kpis).toBeDefined();
      expect(res.subscriptionHealth).toBeDefined();
      expect(res.healthScore.overall).toBeGreaterThanOrEqual(0);
    });

    it('should support dynamic ranges like 7d, 15d, today, this_month', async () => {
      const res7d = await service.getDashboardOverview('t-1', '7d');
      expect(res7d.range).toBe('7d');

      const res15d = await service.getDashboardOverview('t-1', '15d');
      expect(res15d.range).toBe('15d');

      const resToday = await service.getDashboardOverview('t-1', 'today');
      expect(resToday.range).toBe('today');
    });

    it('should support custom date range filters', async () => {
      const resCustom = await service.getDashboardOverview('t-1', 'custom', '2026-01-01', '2026-01-15');
      expect(resCustom).toBeDefined();
      expect(resCustom.fromDate).toBeDefined();
    });
  });

  describe('getChartData', () => {
    it('should return timeSeries data for requested range', async () => {
      const res = await service.getChartData('t-1', '7d');
      expect(res.timeSeries).toHaveLength(7);
      expect(res.labelDistribution).toBeDefined();
      expect(res.channelDistribution).toBeDefined();
    });
  });

  describe('getAiSummary', () => {
    it('should generate natural language AI summary', async () => {
      const summary = await service.getAiSummary('t-1');
      expect(summary).toBeDefined();
      expect(summary.summary).toBeDefined();
    });
  });
});

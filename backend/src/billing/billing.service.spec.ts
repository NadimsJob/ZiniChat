import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  subscription: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  plan: {
    findMany: jest.fn(),
  },
  payment: {
    findMany: jest.fn(),
  },
  tenant: {
    findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
  },
  channelConnection: {
    count: jest.fn().mockResolvedValue(0),
  },
};

describe('BillingService', () => {
  let service: BillingService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSubscriptions', () => {
    it('should return all subscriptions', async () => {
      const mockData = [{ id: 'sub1' }];
      (prismaService.subscription.findMany as jest.Mock).mockResolvedValue(mockData);
      const result = await service.getSubscriptions();
      expect(result).toEqual(mockData);
    });
  });

  describe('getPlans', () => {
    it('should return active plans ordered by price', async () => {
      const mockData = [{ id: 'plan1', isActive: true }];
      (prismaService.plan.findMany as jest.Mock).mockResolvedValue(mockData);
      const result = await service.getPlans();
      expect(result).toEqual(mockData);
      expect(prismaService.plan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { priceMonthlyBdt: 'asc' },
      });
    });
  });

  describe('getTenantQuotas', () => {
    it('should return plan quotas when active subscription exists', async () => {
      (prismaService.subscription.findFirst as jest.Mock).mockResolvedValue({
        id: 'sub1',
        planId: 'plan-1',
        plan: {
          whatsappLimit: 5,
          messengerLimit: 3,
          instagramLimit: 2,
          messageQuota: 5000,
          aiQuota: 1000,
          seatLimit: 3,
          storageLimitMb: 2048,
          allowByok: true,
          features: ['ai_assistant', 'broadcast'],
        },
      });
      (prismaService.channelConnection.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getTenantQuotas('t1');
      expect(result.messageQuota).toBe(5000);
      expect(result.whatsappLimit).toBe(5);
      expect(result.messengerLimit).toBe(3);
      expect(result.instagramLimit).toBe(2);
      expect(result.features).toContain('ai_assistant');
      expect(result.currentWhatsapp).toBe(0);
      expect(result.currentMessenger).toBe(0);
      expect(result.currentInstagram).toBe(0);
    });

    it('should return fallback quotas if no active subscription', async () => {
      (prismaService.subscription.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.channelConnection.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getTenantQuotas('t2');
      expect(result.messageQuota).toBe(100);
      expect(result.whatsappLimit).toBe(1);
      expect(result.messengerLimit).toBe(1);
      expect(result.instagramLimit).toBe(1);
      expect(result.features).toEqual([]);
    });

    it('should return correct current channel connection counts', async () => {
      (prismaService.subscription.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.channelConnection.count as jest.Mock)
        .mockResolvedValueOnce(1)  // WhatsApp count
        .mockResolvedValueOnce(2)  // Messenger count
        .mockResolvedValueOnce(0); // Instagram count

      const result = await service.getTenantQuotas('t3');
      expect(result.currentWhatsapp).toBe(1);
      expect(result.currentMessenger).toBe(2);
      expect(result.currentInstagram).toBe(0);
    });

    it('should prefer tenant custom limits over plan limits', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant-custom',
        customWhatsappLimit: 10,
        customMessengerLimit: 5,
        customInstagramLimit: 3,
        customMessageQuota: 99999,
        customAiQuota: 5000,
        customSeatLimit: 20,
        customStorageLimitMb: 10240,
        customAllowByok: true,
        customFeatures: ['ai_assistant', 'broadcast', 'own_api'],
        customPlanName: 'Enterprise Custom',
        customPriceUsd: '199',
      });
      (prismaService.subscription.findFirst as jest.Mock).mockResolvedValue({
        id: 'sub2',
        plan: {
          whatsappLimit: 1,
          messengerLimit: 1,
          instagramLimit: 1,
          messageQuota: 100,
          aiQuota: 50,
          seatLimit: 1,
          storageLimitMb: 500,
          allowByok: false,
          features: [],
        },
      });
      (prismaService.channelConnection.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getTenantQuotas('tenant-custom');
      expect(result.whatsappLimit).toBe(10);
      expect(result.messageQuota).toBe(99999);
      expect(result.customPlanName).toBe('Enterprise Custom');
      expect(result.features).toContain('own_api');
    });
  });
});

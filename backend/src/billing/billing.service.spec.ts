import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BillingService', () => {
  let service: BillingService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: {
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
          },
        },
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
      expect(prismaService.subscription.findMany).toHaveBeenCalled();
    });
  });

  describe('getPlans', () => {
    it('should return active plans', async () => {
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
    it('should return plan quotas if active subscription exists', async () => {
      (prismaService.subscription.findFirst as jest.Mock).mockResolvedValue({
        id: 'sub1',
        plan: {
          channelLimit: 5,
          messageQuota: 5000,
          aiQuota: 1000,
          seatLimit: 3,
          features: ['feature_1'],
        },
      });

      const result = await service.getTenantQuotas('t1');
      expect(result.messageQuota).toBe(5000);
      expect(result.channelLimit).toBe(5);
      expect(result.features).toContain('feature_1');
    });

    it('should return fallback quotas if no active subscription exists', async () => {
      (prismaService.subscription.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getTenantQuotas('t2');
      expect(result.messageQuota).toBe(100);
      expect(result.channelLimit).toBe(1);
      expect(result.features).toEqual([]);
    });
  });
});

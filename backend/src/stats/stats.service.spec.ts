import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StatsService', () => {
  let service: StatsService;
  let prisma: any;

  const mockPrisma: any = {
    tenant: {
      count: jest.fn().mockResolvedValue(10),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      count: jest.fn().mockResolvedValue(20),
    },
    subscription: {
      count: jest.fn().mockResolvedValue(8),
    },
    plan: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    payment: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amountBdt: 5000 } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    aiUsageLog: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { tokensUsed: 1000 } }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    conversation: {
      count: jest.fn().mockResolvedValue(50),
    },
    message: {
      count: jest.fn().mockResolvedValue(200),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    channelConnection: {
      count: jest.fn().mockResolvedValue(15),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    contact: {
      count: jest.fn().mockResolvedValue(100),
    },
    ticket: {
      count: jest.fn().mockResolvedValue(5),
    },
    product: {
      count: jest.fn().mockResolvedValue(30),
    },
    order: {
      count: jest.fn().mockResolvedValue(12),
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 1500 } }),
    },
    broadcast: {
      count: jest.fn().mockResolvedValue(5),
    },
    automation: {
      count: jest.fn().mockResolvedValue(2),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    businessNature: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    it('should return aggregated platform overview metrics', async () => {
      const overview = await service.getOverview();
      expect(overview).toHaveProperty('totalTenants', 10);
      expect(overview).toHaveProperty('activeSubscriptions', 8);
      expect(overview).toHaveProperty('totalRevenue', 5000);
      expect(overview).toHaveProperty('totalConversations', 50);
      expect(overview).toHaveProperty('totalMessages', 200);
    });
  });
});

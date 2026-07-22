import { Test, TestingModule } from '@nestjs/testing';
import { InstagramAuthService } from './instagram-auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { BillingService } from '../../billing/billing.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('InstagramAuthService', () => {
  let service: InstagramAuthService;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
    channelConnection: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    }
  };

  const mockBillingService = {
    getTenantQuotas: jest.fn(),
  };

  const mockNotificationsService = {
    createSystemNotificationForSuperadmins: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramAuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: BillingService,
          useValue: mockBillingService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<InstagramAuthService>(InstagramAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('connectManual', () => {
    it('should throw ForbiddenException if instagram_dm feature is not in plan', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        subscriptions: [{ plan: { features: ['whatsapp'] } }]
      });

      await expect(service.connectManual('tenant-1', { accountId: '123', accessToken: 'abc' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if channel limit is reached', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        subscriptions: [{ plan: { features: ['whatsapp', 'instagram_dm'] } }]
      });
      mockBillingService.getTenantQuotas.mockResolvedValue({ channelLimit: 1 });
      mockPrismaService.channelConnection.count.mockResolvedValue(1);

      await expect(service.connectManual('tenant-1', { accountId: '123', accessToken: 'abc' })).rejects.toThrow(ForbiddenException);
    });

    it('should proceed if limits and features are valid (will throw Meta API error as fetch is not mocked)', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        subscriptions: [{ plan: { features: ['whatsapp', 'instagram_dm'] } }]
      });
      mockBillingService.getTenantQuotas.mockResolvedValue({ channelLimit: 5 });
      mockPrismaService.channelConnection.count.mockResolvedValue(1);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: { message: 'Invalid token' } })
      });

      await expect(service.connectManual('tenant-1', { accountId: '123', accessToken: 'abc' })).rejects.toThrow('Meta API Error');
    });
  });
});

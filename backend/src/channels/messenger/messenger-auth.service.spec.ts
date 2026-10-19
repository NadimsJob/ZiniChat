import { Test, TestingModule } from '@nestjs/testing';
import { MessengerAuthService } from './messenger-auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { BillingService } from '../../billing/billing.service';
import { BadRequestException } from '@nestjs/common';

describe('MessengerAuthService', () => {
  let service: MessengerAuthService;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    facebookAuthConfig: {
      findFirst: jest.fn(),
    },
    channelConnection: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockBillingService = {
    getTenantQuotas: jest.fn(),
  };

  const mockNotificationsService = {
    createSystemNotificationForSuperadmins: jest.fn().mockResolvedValue(undefined),
    createNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessengerAuthService,
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

    service = module.get<MessengerAuthService>(MessengerAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('connectViaFacebook', () => {
    it('should throw BadRequestException if Facebook auth config is missing', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        subscriptions: [{ plan: { features: ['messenger'] } }],
      });
      mockBillingService.getTenantQuotas.mockResolvedValue({ messengerLimit: 5 });
      mockPrismaService.channelConnection.count.mockResolvedValue(0);
      mockPrismaService.facebookAuthConfig.findFirst.mockResolvedValue(null);

      await expect(service.connectViaFacebook('tenant-1', 'user-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should exchange token for long-lived token, query /me/accounts with finalToken for permanent token, and create connection', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        businessName: 'Test Tenant',
        subscriptions: [{ plan: { features: ['messenger'] } }],
      });
      mockBillingService.getTenantQuotas.mockResolvedValue({ messengerLimit: 5 });
      mockPrismaService.channelConnection.count.mockResolvedValue(0);
      mockPrismaService.facebookAuthConfig.findFirst.mockResolvedValue({
        isEnabled: true,
        appId: '12345',
        appSecret: 'secret',
      });

      // Mock fetch:
      // 1. debug_token -> valid
      // 2. fb_exchange_token -> long-lived finalToken
      // 3. /me/accounts with finalToken -> page with permanent token
      // 4. subscribed_apps -> success
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('debug_token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { is_valid: true, scopes: ['pages_messaging'] } }),
          });
        }
        if (url.includes('grant_type=fb_exchange_token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: 'long_lived_final_token' }),
          });
        }
        if (url.includes('/me/accounts?fields=id,name,access_token,tasks,category&access_token=long_lived_final_token')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'page-101',
                    name: 'Test Page',
                    access_token: 'permanent_page_token_never_expires',
                  },
                ],
              }),
          });
        }
        if (url.includes('subscribed_apps')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      mockPrismaService.channelConnection.findFirst.mockResolvedValue(null);
      mockPrismaService.channelConnection.create.mockResolvedValue({ id: 'conn-1' });

      const result = await service.connectViaFacebook('tenant-1', 'short_lived_token');
      expect(result).toEqual({ success: true, connectionId: 'conn-1', reconnected: false });
      expect(mockPrismaService.channelConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          channelType: 'messenger',
          externalAccountId: 'page-101',
          accessTokenEncrypted: 'permanent_page_token_never_expires',
          displayName: 'Test Page',
          status: 'active',
        }),
      });
    });

    it('should refresh existing connection if page is already connected instead of throwing error', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        businessName: 'Test Tenant',
        subscriptions: [{ plan: { features: ['messenger'] } }],
      });
      mockBillingService.getTenantQuotas.mockResolvedValue({ messengerLimit: 5 });
      mockPrismaService.channelConnection.count.mockResolvedValue(1);
      mockPrismaService.facebookAuthConfig.findFirst.mockResolvedValue({
        isEnabled: true,
        appId: '12345',
        appSecret: 'secret',
      });

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('debug_token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { is_valid: true } }),
          });
        }
        if (url.includes('grant_type=fb_exchange_token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: 'long_lived_final_token' }),
          });
        }
        if (url.includes('/me/accounts')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'page-101',
                    name: 'Test Page',
                    access_token: 'new_permanent_page_token',
                  },
                ],
              }),
          });
        }
        if (url.includes('subscribed_apps')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      // Existing connection found
      mockPrismaService.channelConnection.findFirst.mockResolvedValue({
        id: 'existing-conn-1',
        externalAccountId: 'page-101',
      });
      mockPrismaService.channelConnection.update.mockResolvedValue({ id: 'existing-conn-1' });

      const result = await service.connectViaFacebook('tenant-1', 'short_lived_token');
      expect(result).toEqual({ success: true, connectionId: 'existing-conn-1', reconnected: true });
      expect(mockPrismaService.channelConnection.update).toHaveBeenCalledWith({
        where: { id: 'existing-conn-1' },
        data: expect.objectContaining({
          accessTokenEncrypted: 'new_permanent_page_token',
          displayName: 'Test Page',
          status: 'active',
        }),
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { OutreachAttributionService } from './outreach-attribution.service';
import { OutreachAttributionController } from './outreach-attribution.controller';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OutreachAttributionService & Controller (Phase 7: Attribution, Unsubscribe & CRM Sync)', () => {
  let service: OutreachAttributionService;
  let controller: OutreachAttributionController;
  let mockPrisma: any;
  let mockQuota: any;
  let mockNotifications: any;

  const mockCampaign = {
    id: 'camp-400',
    tenantId: 'tenant-400',
    name: 'Flash Sale 2026',
    bannerClickUrl: 'https://myshop.com/catalog',
    bannerSizeBytes: 1048576, // 1MB
    storageUsedBytes: BigInt(2097152), // 2MB
    opensCount: 15,
    clicksCount: 5,
    ordersCount: 1,
    revenueGenerated: 2500,
    tenant: {
      id: 'tenant-400',
      name: 'Artisan Boutique',
    },
  };

  const mockLead = {
    id: 'lead-500',
    campaignId: 'camp-400',
    tenantId: 'tenant-400',
    contactId: 'contact-500',
    trackingToken: 'token-xyz-123',
    businessName: 'Chittagong Crafts',
    email: 'chittagong@crafts.com',
    sourceChannel: 'facebook',
    status: 'sent',
    openedAt: null,
    clickedAt: null,
    orderedAt: null,
    orderId: null,
    orderAmount: null,
    campaign: { ...mockCampaign },
  };

  beforeEach(async () => {
    mockPrisma = {
      campaignLead: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.trackingToken === 'token-xyz-123' || where.id === 'lead-500') {
            return Promise.resolve({ ...mockLead });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...mockLead, ...args.data })),
      },
      emailCampaign: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'camp-400') {
            return Promise.resolve({ ...mockCampaign });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...mockCampaign, ...args.data })),
      },
      order: {
        update: jest.fn().mockResolvedValue({ id: 'order-999' }),
      },
      contact: {
        update: jest.fn().mockResolvedValue({ id: 'contact-500' }),
      },
      kanbanStage: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve({ id: 'stage-custom', name: 'Hot Lead' });
        }),
      },
      outreachSuppression: {
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'supp-1', ...args.data })),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'admin-1', role: 'admin' }]),
      },
    };

    mockQuota = {
      incrementStorage: jest.fn().mockResolvedValue(undefined),
      decrementStorage: jest.fn().mockResolvedValue(undefined),
      checkActiveSubscription: jest.fn().mockResolvedValue(true),
      isTenantSubscriptionActive: jest.fn().mockResolvedValue({ isActive: true }),
    };

    mockNotifications = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutreachAttributionController],
      providers: [
        OutreachAttributionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QuotaService, useValue: mockQuota },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<OutreachAttributionService>(OutreachAttributionService);
    controller = module.get<OutreachAttributionController>(OutreachAttributionController);
  });

  describe('1. 1x1 Transparent Open Rate Tracking Pixel (REQ-37)', () => {
    it('should return 42-byte transparent GIF Buffer and record unique open timestamp', async () => {
      const buffer = await service.recordOpen('token-xyz-123');

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(42);

      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-500' },
          data: expect.objectContaining({
            status: 'opened',
            openedAt: expect.any(Date),
          }),
        }),
      );

      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-400' },
          data: { opensCount: { increment: 1 } },
        }),
      );
    });

    it('should not increment opensCount if lead has already been opened', async () => {
      mockPrisma.campaignLead.findUnique.mockResolvedValueOnce({
        ...mockLead,
        openedAt: new Date(Date.now() - 3600000),
      });

      const buffer = await service.recordOpen('token-xyz-123');

      expect(buffer.length).toBe(42);
      expect(mockPrisma.emailCampaign.update).not.toHaveBeenCalled();
    });

    it('should set proper no-cache headers in HTTP controller trackOpen', async () => {
      const mockRes: any = {
        setHeader: jest.fn(),
        end: jest.fn(),
      };

      await controller.trackOpen('token-xyz-123', mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/gif');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache, no-store, must-revalidate');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('2. Smart Redirect & Click Capture (REQ-38)', () => {
    it('should record unique click, update lead to clicked, increment campaign.clicksCount, and notify admins', async () => {
      const result = await service.recordClick('token-xyz-123');

      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-500' },
          data: expect.objectContaining({
            status: 'clicked',
            clickedAt: expect.any(Date),
          }),
        }),
      );

      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-400' },
          data: { clicksCount: { increment: 1 } },
        }),
      );

      expect(mockNotifications.createNotification).toHaveBeenCalled();

      // Verify destination URL has tracking parameters appended
      expect(result.destinationUrl).toContain('https://myshop.com/catalog');
      expect(result.destinationUrl).toContain('utm_source=zinichat_outreach');
      expect(result.destinationUrl).toContain('utm_campaign=camp-400');
      expect(result.destinationUrl).toContain('zinichat_lead=token-xyz-123');
    });

    it('should set 30-day tracking cookie and perform 302 redirect in HTTP controller', async () => {
      const mockRes: any = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      };

      await controller.trackClick('token-xyz-123', 'https://myshop.com/offer', mockRes);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'zinichat_outreach_lead',
        'token-xyz-123',
        expect.objectContaining({
          maxAge: 30 * 24 * 60 * 60 * 1000,
          httpOnly: true,
        }),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('https://myshop.com/offer'));
    });

    it('should throw NotFoundException on non-existent tracking token', async () => {
      await expect(service.recordClick('invalid-token')).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. Order Linkage & Revenue Attribution (REQ-39)', () => {
    it('should attribute order revenue to campaign and lead, incrementing ordersCount and revenueGenerated', async () => {
      const res = await service.recordOrderAttribution('token-xyz-123', 'order-999', 3500);

      expect(res.success).toBe(true);
      expect(res.attributedLeadId).toBe('lead-500');
      expect(res.orderAmount).toBe(3500);

      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-500' },
          data: expect.objectContaining({
            status: 'ordered',
            orderId: 'order-999',
            orderAmount: 3500,
            orderedAt: expect.any(Date),
          }),
        }),
      );

      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-400' },
          data: {
            ordersCount: { increment: 1 },
            revenueGenerated: { increment: 3500 },
          },
        }),
      );

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-999' },
          data: {
            outreachCampaignId: 'camp-400',
            outreachLeadId: 'lead-500',
          },
        }),
      );
    });
  });

  describe('4. CAN-SPAM Public Unsubscribe Handler (REQ-40)', () => {
    it('should mark lead as unsubscribed and insert into OutreachSuppression table', async () => {
      const res = await service.unsubscribeProspect('token-xyz-123', 'not_interested', 'Stop emailing');

      expect(res.success).toBe(true);
      expect(res.email).toBe('chittagong@crafts.com');

      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-500' },
          data: expect.objectContaining({
            status: 'unsubscribed',
          }),
        }),
      );

      expect(mockPrisma.outreachSuppression.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-400',
          email: 'chittagong@crafts.com',
          reason: 'not_interested: Stop emailing',
        },
      });

      expect(mockNotifications.createNotification).toHaveBeenCalled();
    });
  });

  describe('5. Inbound Website Widget Prospect Information (REQ-41)', () => {
    it('should return prospect details and personalized bilingual greetings', async () => {
      const info = await service.getProspectInfo('token-xyz-123');

      expect(info.prospectName).toBe('Chittagong Crafts');
      expect(info.brandName).toBe('Artisan Boutique');
      expect(info.greetings).toHaveProperty('bn');
      expect(info.greetings).toHaveProperty('en');
      expect(info.greetings.bn).toContain('Chittagong Crafts');
      expect(info.greetings.en).toContain('Chittagong Crafts');
    });
  });

  describe('6. Storage Quota Accounting & Lifecycle Reclamation (Module G)', () => {
    it('should increment campaign storage and call QuotaService.incrementStorage on asset addition', async () => {
      const res = await service.syncStorageQuota('camp-400', 500000, false);

      expect(res).toHaveProperty('addedBytes', 500000);
      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-400' },
          data: {
            storageUsedBytes: { increment: 500000 },
          },
        }),
      );
      expect(mockQuota.incrementStorage).toHaveBeenCalledWith('tenant-400', 500000);
    });

    it('should reclaim all physical banner and lead storage on campaign deletion', async () => {
      // 1MB banner + 2MB leads = 3,145,728 bytes total
      const res = await service.syncStorageQuota('camp-400', 0, true);

      expect(res).toHaveProperty('reclaimedBytes', 3145728);
      expect(mockQuota.decrementStorage).toHaveBeenCalledWith('tenant-400', 3145728);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { OutreachCampaignService } from './outreach-campaign.service';
import { PrismaService } from '../prisma/prisma.service';
import { OutreachAttributionService } from './outreach-attribution.service';
import { BillingService } from '../billing/billing.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OutreachCampaignService', () => {
  let service: OutreachCampaignService;

  const mockPrisma = {
    emailCampaign: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    campaignLead: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    contact: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    aiUsageLog: {
      count: jest.fn(),
    },
  };

  const mockAttributionService = {
    syncStorageQuota: jest.fn().mockResolvedValue({ storageUsedBytes: 500000 }),
  };

  const mockBillingService = {
    getActivePeriod: jest.fn().mockResolvedValue({
      periodStart: new Date('2026-10-01'),
      aiQuota: 1000,
    }),
    getTenantQuotas: jest.fn().mockResolvedValue({
      aiQuota: 1000,
      aiUsed: 300,
      allowByok: false,
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutreachCampaignService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OutreachAttributionService, useValue: mockAttributionService },
        { provide: BillingService, useValue: mockBillingService },
      ],
    }).compile();

    service = module.get<OutreachCampaignService>(OutreachCampaignService);
  });

  describe('getOverview', () => {
    it('should aggregate tenant outreach statistics and compute rates', async () => {
      mockPrisma.emailCampaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          status: 'running',
          sentCount: 100,
          opensCount: 50,
          clicksCount: 20,
          ordersCount: 2,
          revenueGenerated: 5000,
          phoneOnlyLeadsCount: 15,
          storageUsedBytes: BigInt(200000),
        },
        {
          id: 'c2',
          status: 'completed',
          sentCount: 200,
          opensCount: 100,
          clicksCount: 30,
          ordersCount: 3,
          revenueGenerated: 7500,
          phoneOnlyLeadsCount: 25,
          storageUsedBytes: BigInt(300000),
        },
      ]);

      mockPrisma.campaignLead.count.mockResolvedValue(45); // 45 clicked but no order yet
      mockPrisma.tenant.findUnique.mockResolvedValue({
        storageUsedBytes: BigInt(500000),
      });
      mockPrisma.aiUsageLog.count.mockResolvedValue(300);

      const overview = await service.getOverview('tenant-1');

      expect(overview.totalCampaigns).toBe(2);
      expect(overview.activeCampaigns).toBe(1);
      expect(overview.totalSent).toBe(300);
      expect(overview.totalOpens).toBe(150);
      expect(overview.totalClicks).toBe(50);
      expect(overview.totalOrders).toBe(5);
      expect(overview.totalRevenue).toBe(12500);
      expect(overview.totalPhoneHarvested).toBe(40);
      expect(overview.totalClickedNoOrder).toBe(45);
      expect(overview.openRatePercent).toBe(50.0);
      expect(overview.clickRatePercent).toBe(16.7);
      expect(overview.conversionRatePercent).toBe(10.0);
      expect(overview.availableAiCredits).toBe(700); // 1000 - 300
    });
  });

  describe('getCampaigns', () => {
    it('should return paginated campaigns with clickedNoOrderCount', async () => {
      mockPrisma.emailCampaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Spring Offer',
          status: 'running',
          storageUsedBytes: BigInt(250000),
          revenueGenerated: 1500,
        },
      ]);
      mockPrisma.emailCampaign.count.mockResolvedValue(1);
      mockPrisma.campaignLead.count.mockResolvedValue(12);

      const result = await service.getCampaigns('tenant-1', { page: 1, limit: 10 });

      expect(result.campaigns.length).toBe(1);
      expect(result.campaigns[0].clickedNoOrderCount).toBe(12);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getCampaignById', () => {
    it('should return campaign details with 5-stage funnel counts', async () => {
      mockPrisma.emailCampaign.findFirst.mockResolvedValue({
        id: 'c1',
        name: 'Eid Campaign',
        storageUsedBytes: BigInt(150000),
        revenueGenerated: 2500,
      });

      // Funnel counts mock
      mockPrisma.campaignLead.count
        .mockResolvedValueOnce(500) // all
        .mockResolvedValueOnce(350) // sent
        .mockResolvedValueOnce(175) // opened
        .mockResolvedValueOnce(50)  // clicked
        .mockResolvedValueOnce(45)  // clickedNoOrder
        .mockResolvedValueOnce(5)   // ordered
        .mockResolvedValueOnce(80)  // phoneOnly
        .mockResolvedValueOnce(3);  // bounced

      const campaign = await service.getCampaignById('c1', 'tenant-1');

      expect(campaign.name).toBe('Eid Campaign');
      expect(campaign.funnelCounts.all).toBe(500);
      expect(campaign.funnelCounts.sent).toBe(350);
      expect(campaign.funnelCounts.opened).toBe(175);
      expect(campaign.funnelCounts.clicked).toBe(50);
      expect(campaign.funnelCounts.clickedNoOrder).toBe(45);
      expect(campaign.funnelCounts.ordered).toBe(5);
      expect(campaign.funnelCounts.phoneOnly).toBe(80);
      expect(campaign.funnelCounts.bounced).toBe(3);
    });

    it('should throw NotFoundException if campaign does not exist', async () => {
      mockPrisma.emailCampaign.findFirst.mockResolvedValue(null);

      await expect(service.getCampaignById('invalid', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createCampaign', () => {
    it('should create draft campaign and invoke syncStorageQuota', async () => {
      mockPrisma.emailCampaign.create.mockResolvedValue({
        id: 'c1',
        name: 'New Year Blast',
        bannerImageUrl: 'https://cdn.zinichat.com/banner.jpg',
        bannerClickUrl: 'https://mybrand.com/offer',
        storageUsedBytes: BigInt(200000),
        revenueGenerated: 0,
        status: 'draft',
      });

      const result = await service.createCampaign('tenant-1', {
        name: 'New Year Blast',
        bannerImageUrl: 'https://cdn.zinichat.com/banner.jpg',
        bannerClickUrl: 'https://mybrand.com/offer',
        targetKeywords: ['fashion', 'dresses'],
        channels: ['facebook', 'instagram'],
      });

      expect(result.id).toBe('c1');
      expect(mockPrisma.emailCampaign.create).toHaveBeenCalled();
      expect(mockAttributionService.syncStorageQuota).toHaveBeenCalledWith('c1');
    });

    it('should throw BadRequestException if required fields are missing', async () => {
      await expect(
        service.createCampaign('tenant-1', {
          name: '',
          bannerImageUrl: '',
          bannerClickUrl: '',
          targetKeywords: [],
          channels: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCampaign', () => {
    it('should delete campaign and recalculate tenant storage', async () => {
      mockPrisma.emailCampaign.findFirst.mockResolvedValue({
        id: 'c1',
        status: 'paused',
      });
      mockPrisma.emailCampaign.delete.mockResolvedValue({ id: 'c1' });
      mockPrisma.emailCampaign.findMany.mockResolvedValue([]);
      mockPrisma.tenant.update.mockResolvedValue({});

      const result = await service.deleteCampaign('c1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.emailCampaign.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(mockPrisma.tenant.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if campaign is running', async () => {
      mockPrisma.emailCampaign.findFirst.mockResolvedValue({
        id: 'c1',
        status: 'running',
      });

      await expect(service.deleteCampaign('c1', 'tenant-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCampaignLeads with Clicked No Order Filter', () => {
    it('should correctly query leads matching clicked_no_order filter', async () => {
      mockPrisma.emailCampaign.findFirst.mockResolvedValue({ id: 'c1' });
      mockPrisma.campaignLead.findMany.mockResolvedValue([
        {
          id: 'lead-1',
          businessName: 'Craft Boutique',
          email: 'craft@gmail.com',
          phone: '+8801700000001',
          clickedAt: new Date(),
          orderedAt: null,
          orderAmount: null,
        },
      ]);
      mockPrisma.campaignLead.count.mockResolvedValue(1);

      const result = await service.getCampaignLeads('c1', 'tenant-1', {
        filter: 'clicked_no_order',
      });

      expect(mockPrisma.campaignLead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: 'c1',
            tenantId: 'tenant-1',
            clickedAt: { not: null },
            orderedAt: null,
          }),
        }),
      );
      expect(result.leads.length).toBe(1);
      expect(result.activeFilter).toBe('clicked_no_order');
    });
  });

  describe('retargetClickedNoOrderLeads', () => {
    it('should update CRM contact stage to Hot Lead and attach tags', async () => {
      mockPrisma.campaignLead.findMany.mockResolvedValue([
        {
          id: 'l1',
          businessName: 'Apex Craft',
          phone: '+8801700000002',
          email: 'apex@craft.com',
          contactId: 'contact-1',
          sourceChannel: 'facebook',
          clickedAt: new Date(),
        },
      ]);

      mockPrisma.contact.findUnique.mockResolvedValue({
        tags: ['#Outreach-Discovered'],
      });
      mockPrisma.contact.update.mockResolvedValue({});

      const result = await service.retargetClickedNoOrderLeads('c1', 'tenant-1');

      expect(result.retargetedCount).toBe(1);
      expect(mockPrisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: {
          stageId: '🔥 Hot Lead',
          tags: expect.arrayContaining(['#Outreach-Hot-Lead', '#High-Intent-Clicker']),
        },
      });
    });
  });

  describe('exportLeadsCsv', () => {
    it('should return valid CSV string with RFC 4180 headers', async () => {
      mockPrisma.emailCampaign.findFirst.mockResolvedValue({ name: 'Summer Expo' });
      mockPrisma.campaignLead.findMany.mockResolvedValue([
        {
          businessName: 'Dhaka Pottery',
          sourceChannel: 'facebook',
          email: 'dhaka@pottery.com',
          phone: '+8801800000000',
          phoneOnly: false,
          status: 'clicked',
          openedAt: new Date('2026-10-19T10:00:00Z'),
          clickedAt: new Date('2026-10-19T10:05:00Z'),
          orderedAt: null,
          orderAmount: null,
          sourcePageUrl: 'https://facebook.com/dhakapottery',
          sourceWebsiteUrl: 'https://dhakapottery.com',
        },
      ]);

      const csv = await service.exportLeadsCsv('c1', 'tenant-1', 'clicked_no_order');

      expect(csv).toContain('Business Name,Channel,Email,Phone,Phone Only,Status');
      expect(csv).toContain('"Dhaka Pottery"');
      expect(csv).toContain('"dhaka@pottery.com"');
    });
  });
});

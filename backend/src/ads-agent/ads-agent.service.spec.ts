import { Test, TestingModule } from '@nestjs/testing';
import { AdsAgentService } from './ads-agent.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { McpAdsService } from '../mcp-ads/mcp-ads.service';
import { SmtpService } from '../smtp/smtp.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';

describe('AdsAgentService', () => {
  let service: AdsAgentService;
  let prismaService: any;
  let quotaService: any;
  let mcpAdsService: any;
  let smtpService: any;
  let marketingConfigService: any;

  const mockTenantId = 'tenant-123';
  const mockAdAccountId = 'act_123456';
  const mockDraftId = 'draft-789';

  beforeEach(async () => {
    prismaService = {
      tenantMetaAdAccount: {
        findFirst: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      adCampaignDraft: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      aiTokenUsageLog: {
        create: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    quotaService = {
      reserveAiResponseUnits: jest.fn(),
      commitReservedUnits: jest.fn(),
      refundReservedUnits: jest.fn(),
    };

    mcpAdsService = {
      getAdAccountBalance: jest.fn(),
      uploadAdImage: jest.fn(),
      createCampaign: jest.fn(),
      createAdSet: jest.fn(),
      createAd: jest.fn(),
      pauseCampaign: jest.fn(),
      resumeCampaign: jest.fn(),
      pauseAdSet: jest.fn(),
    };

    smtpService = {
      triggerAdPublishedEmail: jest.fn(),
      triggerAdFailedRefundedEmail: jest.fn(),
      triggerAdRejectedByMetaEmail: jest.fn(),
    };

    marketingConfigService = {
      getConfig: jest.fn().mockResolvedValue({ adRunUnitCost: 10 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsAgentService,
        { provide: PrismaService, useValue: prismaService },
        { provide: QuotaService, useValue: quotaService },
        { provide: McpAdsService, useValue: mcpAdsService },
        { provide: SmtpService, useValue: smtpService },
        { provide: MetaMarketingConfigService, useValue: marketingConfigService },
      ],
    }).compile();

    service = module.get<AdsAgentService>(AdsAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initDraft', () => {
    it('should throw NotFoundException if tenant meta ad account does not exist', async () => {
      prismaService.tenantMetaAdAccount.findFirst.mockResolvedValue(null);

      await expect(service.initDraft(mockTenantId, mockAdAccountId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if Facebook Page ID is missing', async () => {
      prismaService.tenantMetaAdAccount.findFirst.mockResolvedValue({
        adAccountId: mockAdAccountId,
        facebookPageId: null,
      });

      await expect(service.initDraft(mockTenantId, mockAdAccountId)).rejects.toThrow(BadRequestException);
    });

    it('should initialize draft and return Turn 1 response', async () => {
      prismaService.tenantMetaAdAccount.findFirst.mockResolvedValue({
        adAccountId: mockAdAccountId,
        facebookPageId: 'page-123',
        currency: 'BDT',
      });
      prismaService.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Product 1' }]);
      prismaService.adCampaignDraft.create.mockResolvedValue({
        id: mockDraftId,
        status: 'DRAFT',
      });

      const result = await service.initDraft(mockTenantId, mockAdAccountId);

      expect(result.draftId).toBe(mockDraftId);
      expect(result.currentTurn).toBe(1);
      expect(result.products).toHaveLength(1);
    });
  });

  describe('processTurn', () => {
    it('should process Turn 1 product selection', async () => {
      prismaService.adCampaignDraft.findFirst.mockResolvedValue({ id: mockDraftId, tenantId: mockTenantId });
      prismaService.adCampaignDraft.update.mockResolvedValue({});

      const result = await service.processTurn(mockTenantId, mockDraftId, 1, { productIds: ['p1'] });

      expect(result.currentTurn).toBe(2);
      expect(prismaService.adCampaignDraft.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: mockDraftId },
        data: expect.objectContaining({ productIds: ['p1'] }),
      }));
    });

    it('should process Turn 2 audience target locations', async () => {
      prismaService.adCampaignDraft.findFirst.mockResolvedValue({ id: mockDraftId, tenantId: mockTenantId });
      prismaService.adCampaignDraft.update.mockResolvedValue({});

      const result = await service.processTurn(mockTenantId, mockDraftId, 2, { locations: ['Dhaka'] });

      expect(result.currentTurn).toBe(3);
    });

    it('should process Turn 3 budget & creative generation', async () => {
      prismaService.adCampaignDraft.findFirst.mockResolvedValue({ id: mockDraftId, tenantId: mockTenantId, productIds: [] });
      mcpAdsService.getAdAccountBalance.mockResolvedValue({ balance: 1000 });
      prismaService.adCampaignDraft.update.mockResolvedValue({});

      const result = await service.processTurn(mockTenantId, mockDraftId, 3, { budget: 500, durationDays: 7 });

      expect(result.currentTurn).toBe(4);
      expect(result.creative?.headline).toBeDefined();
    });
  });

  describe('approveAndRunAd (Saga Engine)', () => {
    it('should complete full 4-step saga and commit units when all calls succeed', async () => {
      prismaService.adCampaignDraft.findFirst.mockResolvedValue({
        id: mockDraftId,
        tenantId: mockTenantId,
        status: 'DRAFT',
        adAccountId: mockAdAccountId,
        facebookPageId: 'page-123',
        budget: 500,
        currency: 'BDT',
        headline: 'Test Ad',
        bodyText: 'Test Body',
        callToAction: 'SHOP_NOW',
        aiResponseUnitsReserved: 10,
        targetLocations: [],
      });

      quotaService.reserveAiResponseUnits.mockResolvedValue(true);
      mcpAdsService.createCampaign.mockResolvedValue({ campaignId: 'c123' });
      mcpAdsService.createAdSet.mockResolvedValue({ adSetId: 's123' });
      mcpAdsService.createAd.mockResolvedValue({ adId: 'a123' });
      quotaService.commitReservedUnits.mockResolvedValue(true);
      prismaService.adCampaignDraft.update.mockResolvedValue({ status: 'PENDING_REVIEW' });
      prismaService.tenant.findUnique.mockResolvedValue({ name: 'Test Tenant', users: [] });

      const result = await service.approveAndRunAd(mockTenantId, mockDraftId);

      expect(result.success).toBe(true);
      expect(quotaService.reserveAiResponseUnits).toHaveBeenCalledWith(mockTenantId, 10, 'AD_RUN', mockDraftId);
      expect(mcpAdsService.createCampaign).toHaveBeenCalled();
      expect(mcpAdsService.createAdSet).toHaveBeenCalled();
      expect(mcpAdsService.createAd).toHaveBeenCalled();
      expect(quotaService.commitReservedUnits).toHaveBeenCalledWith(mockDraftId);
    });

    it('should refund reserved units and update status to FAILED_REFUNDED if Meta call fails', async () => {
      prismaService.adCampaignDraft.findFirst.mockResolvedValue({
        id: mockDraftId,
        tenantId: mockTenantId,
        status: 'DRAFT',
        adAccountId: mockAdAccountId,
        facebookPageId: 'page-123',
        budget: 500,
        aiResponseUnitsReserved: 10,
      });

      quotaService.reserveAiResponseUnits.mockResolvedValue(true);
      mcpAdsService.createCampaign.mockRejectedValue(new Error('Meta API error'));
      quotaService.refundReservedUnits.mockResolvedValue(true);
      prismaService.adCampaignDraft.update.mockResolvedValue({});
      prismaService.tenant.findUnique.mockResolvedValue({ name: 'Test Tenant', users: [] });

      await expect(service.approveAndRunAd(mockTenantId, mockDraftId)).rejects.toThrow(InternalServerErrorException);

      expect(quotaService.refundReservedUnits).toHaveBeenCalledWith(mockDraftId, 'Meta API error');
      expect(prismaService.adCampaignDraft.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: mockDraftId },
        data: expect.objectContaining({ status: 'FAILED_REFUNDED' }),
      }));
    });
  });
});

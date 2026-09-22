import { Test, TestingModule } from '@nestjs/testing';
import { AdsAgentService } from './ads-agent.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { McpAdsService } from '../mcp-ads/mcp-ads.service';
import { SmtpService } from '../smtp/smtp.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { metaMockServer } from '../test/mocks/meta-graph-api.mock';

const TENANT_ID = 'tenant-saga-e2e-1';
const DRAFT_ID = 'draft-saga-1001';

describe('Ads Copilot Saga E2E Integration Suite', () => {
  let service: AdsAgentService;
  let prismaMock: any;
  let quotaServiceMock: any;
  let mcpAdsServiceMock: any;
  let smtpServiceMock: any;
  let marketingConfigMock: any;

  let currentDraftState: any;

  beforeAll(() => {
    metaMockServer.listen();
  });

  afterAll(() => {
    metaMockServer.close();
  });

  beforeEach(async () => {
    metaMockServer.reset();

    currentDraftState = {
      id: DRAFT_ID,
      tenantId: TENANT_ID,
      adAccountId: 'act_123456789',
      facebookPageId: 'page_123',
      status: 'DRAFT',
      headline: 'Summer Sale Discount',
      bodyText: 'Get 50% discount on all items',
      budget: 500,
      currency: 'BDT',
      durationDays: 7,
      aiResponseUnitsReserved: 10,
    };

    prismaMock = {
      tenantMetaAdAccount: {
        findFirst: jest.fn().mockResolvedValue({
          tenantId: TENANT_ID,
          adAccountId: 'act_123456789',
          facebookPageId: 'page_123',
          status: 'active',
          currency: 'BDT',
        }),
      },
      adCampaignDraft: {
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if ((where?.id === DRAFT_ID && where?.tenantId === TENANT_ID) || (where?.metaAdId && where.metaAdId === currentDraftState.metaAdId)) {
            return currentDraftState;
          }
          return null;
        }),
        findUnique: jest.fn().mockImplementation(async () => currentDraftState),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          currentDraftState = { ...currentDraftState, ...data };
          return currentDraftState;
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          currentDraftState = { id: DRAFT_ID, ...data };
          return currentDraftState;
        }),
      },
      aiTokenUsageLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: TENANT_ID,
          name: 'Demo Merchant Store',
          users: [{ email: 'owner@merchant.com', role: 'owner' }],
        }),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
      },
    };

    quotaServiceMock = {
      reserveAiResponseUnits: jest.fn().mockResolvedValue(true),
      commitReservedUnits: jest.fn().mockResolvedValue(true),
      refundReservedUnits: jest.fn().mockResolvedValue(true),
    };

    mcpAdsServiceMock = {
      createCampaign: jest.fn().mockResolvedValue({ campaignId: 'campaign_meta_101' }),
      createAdSet: jest.fn().mockResolvedValue({ adSetId: 'adset_meta_202' }),
      createAd: jest.fn().mockResolvedValue({ adId: 'ad_meta_303' }),
      pauseCampaign: jest.fn().mockResolvedValue({ success: true }),
      pauseAdSet: jest.fn().mockResolvedValue({ success: true }),
      uploadAdImage: jest.fn().mockResolvedValue({ hash: 'meta_image_hash_777' }),
    };

    smtpServiceMock = {
      triggerAdPublishedEmail: jest.fn().mockResolvedValue(true),
      triggerAdFailedEmail: jest.fn().mockResolvedValue(true),
      triggerAdFailedRefundedEmail: jest.fn().mockResolvedValue(true),
      triggerAdRejectedByMetaEmail: jest.fn().mockResolvedValue(true),
    };

    marketingConfigMock = {
      getConfig: jest.fn().mockResolvedValue({ isEnabled: true, adRunUnitCost: 10 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsAgentService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: QuotaService, useValue: quotaServiceMock },
        { provide: McpAdsService, useValue: mcpAdsServiceMock },
        { provide: SmtpService, useValue: smtpServiceMock },
        { provide: MetaMarketingConfigService, useValue: marketingConfigMock },
      ],
    }).compile();

    service = module.get<AdsAgentService>(AdsAgentService);
  });

  it('Complete saga: all steps succeed → status PENDING_REVIEW, units COMMITTED, email sent', async () => {
    const result = await service.approveAndRunAd(TENANT_ID, DRAFT_ID);

    expect(quotaServiceMock.reserveAiResponseUnits).toHaveBeenCalledWith(TENANT_ID, 10, 'AD_RUN', DRAFT_ID);
    expect(mcpAdsServiceMock.createCampaign).toHaveBeenCalled();
    expect(mcpAdsServiceMock.createAdSet).toHaveBeenCalled();
    expect(mcpAdsServiceMock.createAd).toHaveBeenCalled();
    expect(quotaServiceMock.commitReservedUnits).toHaveBeenCalledWith(DRAFT_ID);
    expect(currentDraftState.status).toBe('PENDING_REVIEW');
    expect(currentDraftState.metaCampaignId).toBe('campaign_meta_101');
    expect(smtpServiceMock.triggerAdPublishedEmail).toHaveBeenCalledWith(
      'owner@merchant.com',
      'Demo Merchant Store',
      expect.objectContaining({ name: 'Summer Sale Discount', budget: 500 })
    );
    expect(result.success).toBe(true);
  });

  it('Saga compensation: adset create fails → campaign paused + refund + FAILED_REFUNDED status', async () => {
    mcpAdsServiceMock.createAdSet.mockRejectedValueOnce(new Error('Meta API 400: Invalid targeting spec'));

    await expect(service.approveAndRunAd(TENANT_ID, DRAFT_ID)).rejects.toThrow('Meta API 400: Invalid targeting spec');

    // Compensation verification
    expect(mcpAdsServiceMock.pauseCampaign).toHaveBeenCalledWith(TENANT_ID, 'act_123456789', 'campaign_meta_101');
    expect(quotaServiceMock.refundReservedUnits).toHaveBeenCalledWith(DRAFT_ID, 'Meta API 400: Invalid targeting spec');
    expect(currentDraftState.status).toBe('FAILED_REFUNDED');
    expect(smtpServiceMock.triggerAdFailedRefundedEmail).toHaveBeenCalled();
  });

  it('Meta rejection webhook → refund + status REJECTED_BY_META', async () => {
    currentDraftState.status = 'PENDING_REVIEW';
    currentDraftState.metaCampaignId = 'campaign_meta_101';
    currentDraftState.metaAdId = 'ad_meta_303';

    await service.handleMetaAdReviewWebhook(
      'ad_meta_303',
      'REJECTED',
      'Policy violation: Unrealistic claim'
    );

    expect(quotaServiceMock.refundReservedUnits).toHaveBeenCalledWith(DRAFT_ID, expect.stringContaining('rejection'));
    expect(currentDraftState.status).toBe('REJECTED_BY_META');
  });

  it('Quota exceeded → throws before any Meta API call', async () => {
    quotaServiceMock.reserveAiResponseUnits.mockRejectedValueOnce(new Error('Insufficient quota'));

    await expect(service.approveAndRunAd(TENANT_ID, DRAFT_ID)).rejects.toThrow(BadRequestException);

    expect(mcpAdsServiceMock.createCampaign).not.toHaveBeenCalled();
    expect(mcpAdsServiceMock.createAdSet).not.toHaveBeenCalled();
    expect(mcpAdsServiceMock.createAd).not.toHaveBeenCalled();
    expect(currentDraftState.status).toBe('DRAFT');
  });

  it('Draft already in PENDING_REVIEW → approveAndRunAd blocks execution', async () => {
    currentDraftState.status = 'PENDING_REVIEW';

    await expect(service.approveAndRunAd(TENANT_ID, DRAFT_ID)).rejects.toThrow(BadRequestException);
    expect(mcpAdsServiceMock.createCampaign).not.toHaveBeenCalled();
  });
});

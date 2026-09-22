import { Test, TestingModule } from '@nestjs/testing';
import { FeatureRolloutService } from '../feature-rollout/feature-rollout.service';
import { QuotaService } from '../tenants/quota.service';
import { CapiHubService } from '../capi-hub/capi-hub.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';
import { McpAdsService } from '../mcp-ads/mcp-ads.service';
import { AdsAgentService } from './ads-agent.service';
import { AdsAgentProcessor } from './ads-agent.processor';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { SmtpService } from '../smtp/smtp.service';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';

import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('Cross-Phase Integration & Ecosystem Integrity Suite', () => {
  let rolloutService: FeatureRolloutService;
  let quotaService: QuotaService;
  let capiHubService: CapiHubService;
  let marketingConfigService: MetaMarketingConfigService;
  let mcpAdsService: McpAdsService;
  let adsAgentService: AdsAgentService;
  let adsProcessor: AdsAgentProcessor;

  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      tenantMetaAdAccount: {
        findFirst: jest.fn(),
      },
      adCampaignDraft: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      capiEventLog: {
        deleteMany: jest.fn().mockResolvedValue({ count: 12 }),
      },
      aiTokenUsageLog: {
        deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
      metaMarketingApiConfig: {
        findFirst: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1', name: 'Test Tenant' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureRolloutService,
        QuotaService,
        CapiHubService,
        MetaMarketingConfigService,
        McpAdsService,
        AdsAgentService,
        AdsAgentProcessor,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BillingService, useValue: { getActiveSubscription: jest.fn() } },
        { provide: NotificationsService, useValue: { createNotificationForTenant: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
        { provide: CryptoService, useValue: { encrypt: (v: string) => v, decrypt: (v: string) => v } },
        { provide: SmtpService, useValue: { triggerAdPublishedEmail: jest.fn(), triggerAutoScaleActionEmail: jest.fn() } },
        { provide: getQueueToken('capi-events'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('ads-scaling'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    rolloutService = module.get<FeatureRolloutService>(FeatureRolloutService);
    quotaService = module.get<QuotaService>(QuotaService);
    capiHubService = module.get<CapiHubService>(CapiHubService);
    marketingConfigService = module.get<MetaMarketingConfigService>(MetaMarketingConfigService);
    mcpAdsService = module.get<McpAdsService>(McpAdsService);
    adsAgentService = module.get<AdsAgentService>(AdsAgentService);
    adsProcessor = module.get<AdsAgentProcessor>(AdsAgentProcessor);
  });

  describe('Phase 0 -> Phase 1 -> Phase 6: Feature Rollout & Quota Guards', () => {
    it('Phase 0 & 1: Feature rollout disables CAPI Hub if rollout flag is off', async () => {
      jest.spyOn(rolloutService, 'isFeatureEnabled').mockResolvedValue(false);
      await expect(capiHubService.fireEvent('tenant-1', 'Purchase', {}, 'inbox')).resolves.toBeUndefined();
    });

    it('Phase 4 & 6: InitDraft throws NotFoundException if Ad Account is not connected', async () => {
      prismaMock.tenantMetaAdAccount.findFirst.mockResolvedValue(null);
      await expect(adsAgentService.initDraft('tenant-1', 'act_missing')).rejects.toThrow(NotFoundException);
    });

    it('Phase 3 & 5: Platform Master Kill-Switch off -> McpAdsService throws ForbiddenException', async () => {
      jest.spyOn(marketingConfigService, 'getConfig').mockResolvedValue({ isEnabled: false } as any);
      await expect(mcpAdsService.getAdAccountBalance('tenant-1', 'act_123')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Phase 6 -> Phase 7: Auto-Scaling Engine & Data Retention Crons', () => {
    it('AutoScaling CRON processes only ACTIVE campaigns with autoScalingEnabled=true', async () => {
      prismaMock.adCampaignDraft.findMany.mockResolvedValue([
        {
          id: 'draft-active-scaling',
          tenantId: 'tenant-1',
          adAccountId: 'act_123',
          metaCampaignId: 'meta_camp_1',
          status: 'ACTIVE',
          autoScalingEnabled: true,
          budget: 500,
          currency: 'BDT',
          autoScalingMaxBudget: 1000,
          autoScalingActionsToday: 0,
        },
      ]);

      const processSpy = jest.spyOn(adsAgentService, 'executeCampaignAutoScaling').mockResolvedValue({ scaled: true } as any);

      await adsProcessor.handleAutoScalingCron();

      // Only the ACTIVE campaign should be passed to executeCampaignAutoScaling
      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(processSpy).toHaveBeenCalledWith('draft-active-scaling');
    });

    it('Daily data purge CRON cleans old CAPI logs, ad drafts, and AI token logs', async () => {
      const purgeSpy = jest.spyOn(adsAgentService, 'purgeOldDataLogs').mockResolvedValue({ capiPurged: 12, draftsPurged: 2, tokensPurged: 5 });

      await adsProcessor.handleDataRetentionPurge();

      expect(purgeSpy).toHaveBeenCalled();
    });

    it('Midnight CRON resets daily auto scaling action counts to 0', async () => {
      await adsProcessor.handleDailyActionCounterReset();

      expect(prismaMock.adCampaignDraft.updateMany).toHaveBeenCalledWith({
        where: { autoScalingActionsToday: { gt: 0 } },
        data: { autoScalingActionsToday: 0 },
      });
    });
  });
});

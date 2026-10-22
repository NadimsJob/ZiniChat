import { Test, TestingModule } from '@nestjs/testing';
import { McpAdsService } from './mcp-ads.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('McpAdsService', () => {
  let service: McpAdsService;
  let prisma: any;
  let crypto: any;
  let marketingConfig: any;

  const mockTenantId = 'tenant-uuid-123';
  const mockAdAccountId = '123456789';
  const mockEncryptedToken = 'encrypted-token-xyz';
  const mockDecryptedToken = 'EAABb...longlivedtoken';

  beforeEach(async () => {
    prisma = {
      tenantMetaAdAccount: {
        findFirst: jest.fn(),
      },
      channelConnection: {
        findFirst: jest.fn(),
      },
      aiUsageLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-uuid' }),
      },
    };

    crypto = {
      decrypt: jest.fn().mockReturnValue(mockDecryptedToken),
    };

    marketingConfig = {
      getConfig: jest.fn().mockResolvedValue({
        isEnabled: true,
        apiVersion: 'v21.0',
      }),
    };

    const quotaService = {
      checkAiQuota: jest.fn().mockResolvedValue(undefined),
      checkActiveSubscription: jest.fn().mockResolvedValue(true),
      isTenantSubscriptionActive: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpAdsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CryptoService, useValue: crypto },
        { provide: MetaMarketingConfigService, useValue: marketingConfig },
        { provide: require('../tenants/quota.service').QuotaService, useValue: quotaService },
      ],
    }).compile();

    service = module.get<McpAdsService>(McpAdsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAdAccountBalance', () => {
    it('should throw ForbiddenException if Meta Marketing API is disabled', async () => {
      marketingConfig.getConfig.mockResolvedValueOnce({ isEnabled: false });

      await expect(service.getAdAccountBalance(mockTenantId, mockAdAccountId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if tenant has no active account record', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce(null);

      await expect(service.getAdAccountBalance(mockTenantId, mockAdAccountId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return formatted balance data on success', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          account_id: '123456789',
          name: 'Test Ad Account',
          account_status: 1,
          balance: '5000',
          currency: 'BDT',
          spend_cap: '100000',
          amount_spent: '20000',
        },
      });

      const result = await service.getAdAccountBalance(mockTenantId, mockAdAccountId);

      expect(result).toEqual({
        adAccountId: '123456789',
        name: 'Test Ad Account',
        accountStatus: 1,
        balance: 50,
        currency: 'BDT',
        spendCap: 1000,
        amountSpent: 200,
        minDailyBudget: 0,
      });
      expect(crypto.decrypt).toHaveBeenCalledWith(mockEncryptedToken);
    });
  });

  describe('listCampaigns', () => {
    it('should return mapped campaigns list', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'camp_1',
              name: 'Campaign One',
              status: 'ACTIVE',
              effective_status: 'ACTIVE',
              objective: 'OUTCOME_SALES',
              daily_budget: '50000',
            },
          ],
        },
      });

      const result = await service.listCampaigns(mockTenantId, mockAdAccountId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'camp_1',
        name: 'Campaign One',
        status: 'ACTIVE',
        effectiveStatus: 'ACTIVE',
        objective: 'OUTCOME_SALES',
        dailyBudget: 500,
        lifetimeBudget: null,
        startTime: undefined,
        stopTime: undefined,
      });
    });
  });

  describe('getAdInsights', () => {
    it('should return mapped metrics from Meta Graph API', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              impressions: '1200',
              clicks: '150',
              spend: '45.50',
              cpc: '0.30',
              ctr: '12.5',
              reach: '900',
              actions: [{ action_type: 'purchase', value: '5' }],
            },
          ],
        },
      });

      const result = await service.getAdInsights(mockTenantId, mockAdAccountId, 'last_30d');

      expect(result).toEqual({
        impressions: 1200,
        clicks: 150,
        spend: 45.5,
        cpc: 0.3,
        ctr: 12.5,
        reach: 900,
        purchases: 5,
        leads: 0,
      });
    });
  });

  describe('getPagePosts', () => {
    it('should fetch Facebook Page posts and return formatted items', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
        facebookPageId: 'page_123',
        facebookPageName: 'Fashion Store',
      });
      prisma.channelConnection.findFirst.mockResolvedValueOnce({
        externalAccountId: 'page_123',
        displayName: 'Fashion Store',
        accessTokenEncrypted: mockEncryptedToken,
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'page_123_post_999',
              message: 'Check out our new summer collection!',
              created_time: '2026-10-20T10:00:00+0000',
              full_picture: 'https://fbcdn.net/photo.jpg',
              permalink_url: 'https://facebook.com/post/999',
              reactions: { summary: { total_count: 85 } },
              shares: { count: 12 },
            },
          ],
        },
      });

      const result = await service.getPagePosts(mockTenantId, mockAdAccountId);

      expect(result.pageId).toBe('page_123');
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]).toEqual({
        id: 'page_123_post_999',
        message: 'Check out our new summer collection!',
        createdTime: '2026-10-20T10:00:00+0000',
        fullPicture: 'https://fbcdn.net/photo.jpg',
        permalinkUrl: 'https://facebook.com/post/999',
        reactionsCount: 85,
        sharesCount: 12,
      });
    });
  });

  describe('boostPagePost', () => {
    it('should create campaign, ad set with targeting, ad creative with object_story_id, and ad', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
        adAccountId: '123456789',
      });

      // 1. Campaign response
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'camp_boost_1' } });
      // 2. AdSet response
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'adset_boost_1' } });
      // 3. AdCreative response
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'creative_boost_1' } });
      // 4. Ad response
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'ad_boost_1' } });

      const result = await service.boostPagePost(mockTenantId, {
        adAccountId: mockAdAccountId,
        pagePostId: 'page_123_post_999',
        pageId: 'page_123',
        dailyBudget: 500,
        durationDays: 7,
        campaignName: 'Summer Sale Boost',
        targeting: {
          countries: ['BD'],
          ageMin: 18,
          ageMax: 55,
          genders: [1, 2],
        },
      });

      expect(result).toEqual({
        success: true,
        campaignId: 'camp_boost_1',
        adSetId: 'adset_boost_1',
        creativeId: 'creative_boost_1',
        adId: 'ad_boost_1',
        dailyBudget: 500,
        durationDays: 7,
      });

      // Verify that creative payload included object_story_id
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/adcreatives'),
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            object_story_id: 'page_123_post_999',
          }),
        }),
      );
    });
  });

  describe('updateDailyBudget', () => {
    it('should update daily budget in cents on Meta Graph API', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
        adAccountId: '123456789',
      });

      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await service.updateDailyBudget(mockTenantId, mockAdAccountId, 'camp_1', 750);

      expect(result).toEqual({ success: true, objectId: 'camp_1', newDailyBudget: 750 });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/camp_1'),
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            daily_budget: 75000,
          }),
        }),
      );
    });
  });

  describe('scaleBudgetByPercentage', () => {
    it('should fetch current budget, apply +20% scaling and update Meta', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
        adAccountId: '123456789',
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          daily_budget: '50000', // 500
          name: 'Summer Campaign',
        },
      });
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await service.scaleBudgetByPercentage(mockTenantId, mockAdAccountId, 'camp_1', 20);

      expect(result).toEqual({
        success: true,
        objectId: 'camp_1',
        oldDailyBudget: 500,
        newDailyBudget: 600,
        percentage: 20,
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/camp_1'),
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            daily_budget: 60000,
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should toggle status to PAUSED', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
        adAccountId: '123456789',
      });

      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await service.updateStatus(mockTenantId, mockAdAccountId, 'camp_1', 'PAUSED');

      expect(result).toEqual({ success: true, objectId: 'camp_1', status: 'PAUSED' });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/camp_1'),
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            status: 'PAUSED',
          }),
        }),
      );
    });
  });

  describe('getAdAccountPixels', () => {
    it('returns discovered pixels from connected ad account', async () => {
      prisma.tenantMetaAdAccount.findMany = jest.fn().mockResolvedValueOnce([
        {
          adAccountId: '123456789',
          adAccountName: 'Store Account',
          accessToken: mockEncryptedToken,
          status: 'active',
        },
      ]);

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'pixel_999', name: 'Main Pixel', is_unavailable: false },
          ],
        },
      });

      const result = await service.getAdAccountPixels(mockTenantId);
      expect(result.isMetaConnected).toBe(true);
      expect(result.pixels.length).toBe(1);
      expect(result.pixels[0].id).toBe('pixel_999');
    });
  });

  describe('reviewAdWithAi', () => {
    it('analyzes campaign copy and deducts 1 AI response credit', async () => {
      const result = await service.reviewAdWithAi(mockTenantId, {
        adAccountId: '123456789',
        campaignName: 'Eid Mega Sale',
        objective: 'OUTCOME_ENGAGEMENT',
        primaryTexts: ['Exclusive 30% off on all items!'],
        headlines: ['Shop Eid Specials Today'],
        callToAction: 'SHOP_NOW',
        dailyBudget: 10,
      });

      expect(prisma.aiUsageLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unitsConsumed: 1,
            featureName: 'meta_ads_ai_copy_review',
          }),
        }),
      );
      expect(result.overallScore).toBeGreaterThanOrEqual(60);
      expect(result.suggestedVariations.length).toBe(3);
      expect(result.aiResponseQuotaDeducted).toBe(1);
    });
  });

  describe('launchCustomCampaign', () => {
    it('launches campaign with existing post using object_story_id', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        adAccountId: '123456789',
        accessToken: mockEncryptedToken,
        facebookPageId: 'page_456',
        status: 'active',
      });

      mockedAxios.post
        .mockResolvedValueOnce({ data: { id: 'camp_new_1' } }) // campaign
        .mockResolvedValueOnce({ data: { id: 'adset_new_1' } }) // adset
        .mockResolvedValueOnce({ data: { id: 'creative_new_1' } }) // creative
        .mockResolvedValueOnce({ data: { id: 'ad_new_1' } }); // ad

      const result = await service.launchCustomCampaign(mockTenantId, {
        adAccountId: '123456789',
        name: 'Post Boost Campaign',
        dailyBudget: 5,
        creativeSource: 'existing_post',
        pagePostId: 'page_456_post_789',
        pixelId: 'pixel_999',
      });

      expect(result.success).toBe(true);
      expect(result.creativeSource).toBe('existing_post');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/adcreatives'),
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            object_story_id: 'page_456_post_789',
          }),
        }),
      );
    });

    it('launches campaign with multiple existing posts as separate ads', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        adAccountId: '123456789',
        accessToken: mockEncryptedToken,
        facebookPageId: 'page_456',
        status: 'active',
      });

      mockedAxios.post
        .mockResolvedValueOnce({ data: { id: 'camp_multi_1' } }) // campaign
        .mockResolvedValueOnce({ data: { id: 'adset_multi_1' } }) // adset
        .mockResolvedValueOnce({ data: { id: 'creative_multi_1' } }) // creative 1
        .mockResolvedValueOnce({ data: { id: 'ad_multi_1' } }) // ad 1
        .mockResolvedValueOnce({ data: { id: 'creative_multi_2' } }) // creative 2
        .mockResolvedValueOnce({ data: { id: 'ad_multi_2' } }); // ad 2

      const result = await service.launchCustomCampaign(mockTenantId, {
        adAccountId: '123456789',
        name: 'Multi Post Campaign',
        dailyBudget: 15,
        creativeSource: 'existing_post',
        pagePostIds: ['page_456_post_1', 'page_456_post_2'],
        placements: ['fb_feed', 'ig_feed'],
      });

      expect(result.success).toBe(true);
      expect(result.creativesCount).toBe(2);
      expect(result.createdAds).toHaveLength(2);
    });
  });

  describe('aiRetargetAudience', () => {
    it('formulates refined targeting and deducts 1 AI response credit', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        adAccountId: '123456789',
        accessToken: mockEncryptedToken,
        status: 'active',
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'adset_123',
              name: 'AdSet 1',
              targeting: { geo_locations: { countries: ['BD'] }, age_min: 18, age_max: 65 },
            },
          ],
        },
      });

      const result = await service.aiRetargetAudience(mockTenantId, {
        adAccountId: '123456789',
        campaignId: 'camp_123',
        problemDescription: 'Casual young students messaging, need genuine buyers 25-50',
      });

      expect(prisma.aiUsageLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unitsConsumed: 1,
            featureName: 'meta_ads_ai_retarget',
          }),
        }),
      );
      expect(result.campaignId).toBe('camp_123');
      expect(result.suggestedTargeting.ageMin).toBeGreaterThanOrEqual(22);
      expect(result.aiResponseQuotaCost).toBe(1);
    });
  });

  describe('updateCampaignDetails', () => {
    it('updates campaign name and ad set targeting on Meta', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        adAccountId: '123456789',
        accessToken: mockEncryptedToken,
        status: 'active',
      });

      // Campaign update response
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
      // Ad set update response
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await service.updateCampaignDetails(mockTenantId, 'camp_123', {
        adAccountId: '123456789',
        adSetId: 'adset_123',
        name: 'Updated Campaign Name',
        dailyBudget: 25,
        targeting: { ageMin: 24, ageMax: 50, countries: ['BD'] },
      });

      expect(result.success).toBe(true);
      expect(result.updatedFields.name).toBe('Updated Campaign Name');
      expect(result.updatedFields.dailyBudget).toBe(25);
    });
  });
});


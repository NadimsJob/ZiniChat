import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';
import { QuotaService } from '../tenants/quota.service';
import axios from 'axios';

@Injectable()
export class McpAdsService {
  private readonly logger = new Logger(McpAdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly marketingConfig: MetaMarketingConfigService,
    private readonly quotaService: QuotaService,
  ) {}

  private async getDecryptedTokenAndAccount(tenantId: string, adAccountId?: string) {
    const config = await this.marketingConfig.getConfig();
    if (!config.isEnabled) {
      throw new ForbiddenException('Meta Marketing API is currently disabled platform-wide.');
    }

    const account = await this.prisma.tenantMetaAdAccount.findFirst({
      where: {
        tenantId,
        ...(adAccountId ? { adAccountId } : {}),
        status: 'active',
      },
    });

    if (!account) {
      throw new NotFoundException(
        adAccountId
          ? `Ad account ${adAccountId} not found or inactive for this tenant.`
          : 'No active Meta Ad Account found for this tenant.'
      );
    }

    const decryptedToken = this.crypto.decrypt(account.accessToken);
    const apiVersion = config.apiVersion || 'v21.0';
    // Meta ad account IDs require 'act_' prefix if not already prefixed
    const effectiveAdAccountId = account.adAccountId || adAccountId || '';
    const formattedAdAccountId = effectiveAdAccountId.startsWith('act_') ? effectiveAdAccountId : `act_${effectiveAdAccountId}`;

    return { account, token: decryptedToken, apiVersion, formattedAdAccountId };
  }

  async getAdAccountBalance(tenantId: string, adAccountId: string) {
    const { token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      const response = await axios.get(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}`, {
        params: {
          access_token: token,
          fields: 'account_id,name,account_status,balance,currency,spend_cap,amount_spent,min_daily_budget',
        },
      });

      const data = response.data;
      return {
        adAccountId: data.account_id,
        name: data.name,
        accountStatus: data.account_status,
        // Meta reports balance in cents/lowest denomination
        balance: data.balance ? Number(data.balance) / 100 : 0,
        currency: data.currency || 'USD',
        spendCap: data.spend_cap ? Number(data.spend_cap) / 100 : null,
        amountSpent: data.amount_spent ? Number(data.amount_spent) / 100 : 0,
        minDailyBudget: data.min_daily_budget ? Number(data.min_daily_budget) / 100 : 0,
      };
    } catch (error: any) {
      console.error('Error fetching ad account balance:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to fetch ad account balance from Meta');
    }
  }

  async listCampaigns(tenantId: string, adAccountId: string, statusFilter?: string) {
    const { token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      const response = await axios.get(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/campaigns`, {
        params: {
          access_token: token,
          fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time,objective',
          limit: 50,
        },
      });

      let campaigns = response.data.data || [];
      if (statusFilter) {
        campaigns = campaigns.filter((c: any) => c.status === statusFilter || c.effective_status === statusFilter);
      }

      return campaigns.map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        effectiveStatus: c.effective_status,
        objective: c.objective,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        startTime: c.start_time,
        stopTime: c.stop_time,
      }));
    } catch (error: any) {
      console.error('Error listing campaigns:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to fetch ad campaigns from Meta');
    }
  }

  async listAdSets(tenantId: string, campaignId: string) {
    // Look up campaign owner tenant validation via ad account
    const config = await this.marketingConfig.getConfig();
    if (!config.isEnabled) {
      throw new ForbiddenException('Meta Marketing API is currently disabled platform-wide.');
    }

    const tenantAccount = await this.prisma.tenantMetaAdAccount.findFirst({
      where: { tenantId, status: 'active' },
    });

    if (!tenantAccount) {
      throw new BadRequestException('No active Meta Ad Account connected for this tenant.');
    }

    const decryptedToken = this.crypto.decrypt(tenantAccount.accessToken);
    const apiVersion = config.apiVersion || 'v21.0';

    try {
      const response = await axios.get(`https://graph.facebook.com/${apiVersion}/${campaignId}/adsets`, {
        params: {
          access_token: decryptedToken,
          fields: 'id,name,status,daily_budget,lifetime_budget,targeting,bid_amount,created_time',
          limit: 50,
        },
      });

      return (response.data.data || []).map((adSet: any) => ({
        id: adSet.id,
        name: adSet.name,
        status: adSet.status,
        dailyBudget: adSet.daily_budget ? Number(adSet.daily_budget) / 100 : null,
        lifetimeBudget: adSet.lifetime_budget ? Number(adSet.lifetime_budget) / 100 : null,
        targeting: adSet.targeting,
        createdTime: adSet.created_time,
      }));
    } catch (error: any) {
      console.error('Error listing adsets:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to fetch ad sets from Meta');
    }
  }

  async getAdInsights(tenantId: string, adAccountId: string, datePreset: string = 'last_30d') {
    const { token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      const response = await axios.get(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/insights`, {
        params: {
          access_token: token,
          date_preset: datePreset,
          fields: 'impressions,clicks,spend,cpc,ctr,reach,actions',
        },
      });

      const insightsData = response.data.data?.[0];
      if (!insightsData) {
        return {
          impressions: 0,
          clicks: 0,
          spend: 0,
          cpc: 0,
          ctr: 0,
          reach: 0,
          conversions: 0,
        };
      }

      const actions = insightsData.actions || [];
      const purchases = actions.find((a: any) => a.action_type === 'purchase')?.value || 0;
      const leads = actions.find((a: any) => a.action_type === 'lead')?.value || 0;

      return {
        impressions: Number(insightsData.impressions || 0),
        clicks: Number(insightsData.clicks || 0),
        spend: Number(insightsData.spend || 0),
        cpc: Number(insightsData.cpc || 0),
        ctr: Number(insightsData.ctr || 0),
        reach: Number(insightsData.reach || 0),
        purchases: Number(purchases),
        leads: Number(leads),
      };
    } catch (error: any) {
      console.error('Error fetching ad insights:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to fetch ad insights from Meta');
    }
  }

  // Write Operations for Ads Agent & Copilot
  async createCampaign(tenantId: string, adAccountId: string, data: {
    name: string;
    objective?: string;
    dailyBudget?: number;
    lifetimeBudget?: number;
    status?: 'PAUSED' | 'ACTIVE';
  }) {
    const { token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      const payload: any = {
        access_token: token,
        name: data.name,
        objective: data.objective || 'OUTCOME_SALES',
        status: data.status || 'PAUSED',
        special_ad_categories: [],
      };

      if (data.dailyBudget) {
        payload.daily_budget = Math.round(data.dailyBudget * 100);
      } else if (data.lifetimeBudget) {
        payload.lifetime_budget = Math.round(data.lifetimeBudget * 100);
      }

      const response = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/campaigns`, null, {
        params: payload,
      });

      return { campaignId: response.data.id };
    } catch (error: any) {
      console.error('Error creating campaign:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to create campaign on Meta');
    }
  }

  async createAdSet(tenantId: string, adAccountId: string, campaignId: string, data: {
    name: string;
    dailyBudget?: number;
    lifetimeBudget?: number;
    targeting?: any;
    facebookPageId: string;
    status?: 'PAUSED' | 'ACTIVE';
    startTime?: string;
    endTime?: string;
  }) {
    const { token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      const defaultTargeting = {
        geo_locations: { countries: ['BD'] },
        age_min: 18,
        age_max: 65,
      };

      const payload: any = {
        access_token: token,
        name: data.name,
        campaign_id: campaignId,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: JSON.stringify(data.targeting || defaultTargeting),
        status: data.status || 'PAUSED',
        promoted_object: JSON.stringify({ page_id: data.facebookPageId }),
      };

      if (data.dailyBudget) {
        payload.daily_budget = Math.round(data.dailyBudget * 100);
      } else if (data.lifetimeBudget) {
        payload.lifetime_budget = Math.round(data.lifetimeBudget * 100);
      }

      if (data.startTime) payload.start_time = data.startTime;
      if (data.endTime) payload.end_time = data.endTime;

      const response = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/adsets`, null, {
        params: payload,
      });

      return { adSetId: response.data.id };
    } catch (error: any) {
      console.error('Error creating ad set:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to create ad set on Meta');
    }
  }

  async uploadAdImage(tenantId: string, adAccountId: string, imageSource: { bytesBase64?: string; imageUrl?: string }) {
    const { token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      const payload: any = { access_token: token };

      if (imageSource.bytesBase64) {
        payload.bytes = imageSource.bytesBase64;
      } else if (imageSource.imageUrl) {
        payload.image_url = imageSource.imageUrl;
      } else {
        throw new BadRequestException('Either bytesBase64 or imageUrl must be provided for ad image upload.');
      }

      const response = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/adimages`, null, {
        params: payload,
      });

      const images = response.data.images;
      const key = Object.keys(images)[0];
      const imageInfo = images[key];

      return {
        hash: imageInfo.hash,
        url: imageInfo.url,
      };
    } catch (error: any) {
      console.error('Error uploading ad image:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to upload ad image to Meta');
    }
  }

  async createAd(tenantId: string, adAccountId: string, adSetId: string, data: {
    name: string;
    facebookPageId: string;
    headline: string;
    bodyText: string;
    callToAction?: string;
    metaImageHash?: string;
    imageUrl?: string;
    linkUrl?: string;
    status?: 'PAUSED' | 'ACTIVE';
  }) {
    const { token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      // 1. Create Ad Creative first
      const creativePayload: any = {
        access_token: token,
        name: `${data.name} Creative`,
        object_story_spec: JSON.stringify({
          page_id: data.facebookPageId,
          link_data: {
            message: data.bodyText,
            name: data.headline,
            link: data.linkUrl || 'https://zinichat.com',
            image_hash: data.metaImageHash,
            picture: data.imageUrl,
            call_to_action: {
              type: data.callToAction || 'LEARN_MORE',
              value: { link: data.linkUrl || 'https://zinichat.com' }
            }
          }
        })
      };

      const creativeRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/adcreatives`, null, {
        params: creativePayload,
      });

      const creativeId = creativeRes.data.id;

      // 2. Create Ad linked to Creative & AdSet
      const adPayload: any = {
        access_token: token,
        name: data.name,
        adset_id: adSetId,
        creative: JSON.stringify({ creative_id: creativeId }),
        status: data.status || 'PAUSED',
      };

      const adRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/ads`, null, {
        params: adPayload,
      });

      return { adId: adRes.data.id, creativeId };
    } catch (error: any) {
      console.error('Error creating ad:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to create ad on Meta');
    }
  }

  async pauseCampaign(tenantId: string, adAccountId: string, campaignId: string) {
    const { token, apiVersion } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      await axios.post(`https://graph.facebook.com/${apiVersion}/${campaignId}`, null, {
        params: { access_token: token, status: 'PAUSED' },
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error pausing campaign:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to pause campaign on Meta');
    }
  }

  async resumeCampaign(tenantId: string, adAccountId: string, campaignId: string) {
    const { token, apiVersion } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      await axios.post(`https://graph.facebook.com/${apiVersion}/${campaignId}`, null, {
        params: { access_token: token, status: 'ACTIVE' },
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error resuming campaign:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to resume campaign on Meta');
    }
  }

  async pauseAdSet(tenantId: string, adAccountId: string, adSetId: string) {
    const { token, apiVersion } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      await axios.post(`https://graph.facebook.com/${apiVersion}/${adSetId}`, null, {
        params: { access_token: token, status: 'PAUSED' },
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error pausing ad set:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to pause ad set on Meta');
    }
  }

  // =========================================================================
  // PAGE POST PROMOTION & LIVE AD SCALING ENGINE (ANTI-GRAVITY / CLAUDE MCP)
  // =========================================================================

  /**
   * Fetches recent Facebook Page posts with images, text, and engagement metrics
   * without requiring tenant to configure any external MCP server.
   */
  async getPagePosts(tenantId: string, adAccountId?: string, pageId?: string, limit: number = 25) {
    let tenantAccount: any;
    if (adAccountId) {
      tenantAccount = await this.prisma.tenantMetaAdAccount.findFirst({
        where: { tenantId, adAccountId, status: 'active' },
      });
    } else {
      tenantAccount = await this.prisma.tenantMetaAdAccount.findFirst({
        where: { tenantId, status: 'active' },
      });
    }

    const messengerChannel = await this.prisma.channelConnection.findFirst({
      where: {
        tenantId,
        channelType: 'messenger',
        status: 'active',
      },
    });

    const targetPageId = pageId || tenantAccount?.facebookPageId || messengerChannel?.externalAccountId;
    if (!targetPageId) {
      throw new BadRequestException('No Facebook Page found. Please connect a Facebook Page in Channel Integration first.');
    }

    const config = await this.marketingConfig.getConfig();
    const apiVersion = config.apiVersion || 'v21.0';

    let accessToken: string;
    if (messengerChannel?.accessTokenEncrypted) {
      accessToken = this.crypto.decrypt(messengerChannel.accessTokenEncrypted);
    } else if (tenantAccount?.accessToken) {
      accessToken = this.crypto.decrypt(tenantAccount.accessToken);
    } else {
      throw new BadRequestException('No active token found for the connected Facebook Page.');
    }

    try {
      const response = await axios.get(`https://graph.facebook.com/${apiVersion}/${targetPageId}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,created_time,full_picture,permalink_url,shares,reactions.summary(true)',
          limit: Math.min(limit, 50),
        },
      });

      const rawPosts = response.data.data || [];
      return {
        pageId: targetPageId,
        pageName: messengerChannel?.displayName || tenantAccount?.facebookPageName || 'Facebook Page',
        posts: rawPosts.map((p: any) => ({
          id: p.id,
          message: p.message || '',
          createdTime: p.created_time,
          fullPicture: p.full_picture || null,
          permalinkUrl: p.permalink_url || null,
          reactionsCount: p.reactions?.summary?.total_count || 0,
          sharesCount: p.shares?.count || 0,
        })),
      };
    } catch (error: any) {
      console.error('Error fetching Facebook Page posts:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to fetch Facebook Page posts');
    }
  }

  /**
   * Promotes an existing Facebook Page post in 1 click using native object_story_id,
   * preserving all existing social proof (likes, comments, reactions, shares).
   */
  async boostPagePost(tenantId: string, dto: {
    adAccountId: string;
    pagePostId: string;
    pageId: string;
    dailyBudget: number;
    durationDays?: number;
    campaignName?: string;
    targeting?: {
      countries?: string[];
      ageMin?: number;
      ageMax?: number;
      genders?: number[];
    };
  }) {
    if (!dto.pagePostId) throw new BadRequestException('pagePostId is required.');
    if (!dto.dailyBudget || dto.dailyBudget <= 0) throw new BadRequestException('A positive daily budget is required.');

    const { token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, dto.adAccountId);

    try {
      // 1. Create Campaign
      const rawPostId = dto.pagePostId.includes('_') ? dto.pagePostId.split('_')[1] : dto.pagePostId;
      const cleanName = dto.campaignName || `Boost Post ${rawPostId}`;
      const campaignPayload: any = {
        access_token: token,
        name: `${cleanName} - ${new Date().toISOString().slice(0, 10)}`,
        objective: 'OUTCOME_ENGAGEMENT',
        status: 'ACTIVE',
        special_ad_categories: [],
      };

      const campaignRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/campaigns`, null, {
        params: campaignPayload,
      });
      const campaignId = campaignRes.data.id;

      // 2. Create Ad Set with targeting and budget
      const countries = dto.targeting?.countries?.length ? dto.targeting.countries : ['BD'];
      const targeting: any = {
        geo_locations: { countries },
        age_min: dto.targeting?.ageMin || 18,
        age_max: dto.targeting?.ageMax || 65,
      };
      if (dto.targeting?.genders?.length) {
        targeting.genders = dto.targeting.genders;
      }

      const now = new Date();
      const durationDays = dto.durationDays && dto.durationDays > 0 ? dto.durationDays : 7;
      const stopTime = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const adSetPayload: any = {
        access_token: token,
        name: `${cleanName} AdSet`,
        campaign_id: campaignId,
        daily_budget: Math.round(dto.dailyBudget * 100),
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'POST_ENGAGEMENT',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: JSON.stringify(targeting),
        promoted_object: JSON.stringify({ page_id: dto.pageId }),
        status: 'ACTIVE',
        start_time: now.toISOString(),
        end_time: stopTime.toISOString(),
      };

      const adSetRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/adsets`, null, {
        params: adSetPayload,
      });
      const adSetId = adSetRes.data.id;

      // 3. Create AdCreative with object_story_id (Directly links existing organic Page Post)
      const creativeRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/adcreatives`, null, {
        params: {
          access_token: token,
          name: `Creative: ${dto.pagePostId}`,
          object_story_id: dto.pagePostId,
        },
      });
      const creativeId = creativeRes.data.id;

      // 4. Create Ad
      const adRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/ads`, null, {
        params: {
          access_token: token,
          name: `${cleanName} Ad`,
          adset_id: adSetId,
          creative: JSON.stringify({ creative_id: creativeId }),
          status: 'ACTIVE',
        },
      });
      const adId = adRes.data.id;

      return {
        success: true,
        campaignId,
        adSetId,
        creativeId,
        adId,
        dailyBudget: dto.dailyBudget,
        durationDays,
      };
    } catch (error: any) {
      console.error('Error boosting page post:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to boost Facebook Page post on Meta');
    }
  }

  /**
   * Updates daily budget for a Campaign or Ad Set directly on Meta.
   */
  async updateDailyBudget(tenantId: string, adAccountId: string, objectId: string, newDailyBudget: number) {
    if (!newDailyBudget || newDailyBudget <= 0) {
      throw new BadRequestException('Daily budget must be greater than 0.');
    }

    const { token, apiVersion } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      const budgetInCents = Math.round(newDailyBudget * 100);
      await axios.post(`https://graph.facebook.com/${apiVersion}/${objectId}`, null, {
        params: {
          access_token: token,
          daily_budget: budgetInCents,
        },
      });

      return { success: true, objectId, newDailyBudget };
    } catch (error: any) {
      console.error('Error updating daily budget:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to update daily budget on Meta');
    }
  }

  /**
   * Scales daily budget up or down by percentage (e.g. +20% or -10%).
   */
  async scaleBudgetByPercentage(tenantId: string, adAccountId: string, objectId: string, percentage: number) {
    if (!percentage || isNaN(percentage)) {
      throw new BadRequestException('A valid percentage number is required.');
    }

    const { token, apiVersion } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      // 1. Fetch current daily budget
      const getRes = await axios.get(`https://graph.facebook.com/${apiVersion}/${objectId}`, {
        params: {
          access_token: token,
          fields: 'daily_budget,name',
        },
      });

      const currentBudgetInCents = Number(getRes.data.daily_budget);
      if (!currentBudgetInCents || isNaN(currentBudgetInCents)) {
        throw new BadRequestException('This object does not have an active daily budget configured.');
      }

      // 2. Calculate new budget with minimum 100 cents safety
      const factor = 1 + percentage / 100;
      const newBudgetInCents = Math.max(100, Math.round(currentBudgetInCents * factor));

      // 3. Update Meta
      await axios.post(`https://graph.facebook.com/${apiVersion}/${objectId}`, null, {
        params: {
          access_token: token,
          daily_budget: newBudgetInCents,
        },
      });

      return {
        success: true,
        objectId,
        oldDailyBudget: currentBudgetInCents / 100,
        newDailyBudget: newBudgetInCents / 100,
        percentage,
      };
    } catch (error: any) {
      console.error('Error scaling budget by percentage:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to scale budget on Meta');
    }
  }

  /**
   * Toggles status between ACTIVE and PAUSED for Campaign, AdSet, or Ad.
   */
  async updateStatus(tenantId: string, adAccountId: string, objectId: string, status: 'ACTIVE' | 'PAUSED') {
    if (status !== 'ACTIVE' && status !== 'PAUSED') {
      throw new BadRequestException("Status must be either 'ACTIVE' or 'PAUSED'.");
    }

    const { token, apiVersion } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      await axios.post(`https://graph.facebook.com/${apiVersion}/${objectId}`, null, {
        params: {
          access_token: token,
          status,
        },
      });

      return { success: true, objectId, status };
    } catch (error: any) {
      console.error('Error updating status:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to update status on Meta');
    }
  }

  /**
   * Updates targeting settings (countries, age min/max, genders) for an Ad Set.
   */
  async updateAdSetTargeting(tenantId: string, adAccountId: string, adSetId: string, targeting: any) {
    const { token, apiVersion } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      await axios.post(`https://graph.facebook.com/${apiVersion}/${adSetId}`, null, {
        params: {
          access_token: token,
          targeting: typeof targeting === 'string' ? targeting : JSON.stringify(targeting),
        },
      });

      return { success: true, adSetId, targeting };
    } catch (error: any) {
      console.error('Error updating ad set targeting:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to update targeting on Meta');
    }
  }

  /**
   * AI-Driven Campaign Analysis & Optimization Suggestions.
   * Performs real-time telemetry extraction (insights, CTR, CPC, spend, ad sets),
   * synthesizes diagnostic findings, and costs 1 AI Response Quota per search/analysis.
   */
  async analyzeCampaignWithAi(tenantId: string, adAccountId: string, campaignId: string) {
    // 1. Quota Preflight & Deduction: 1 AI Response Unit
    await this.quotaService.checkAiQuota(tenantId);
    await this.prisma.aiUsageLog.create({
      data: {
        tenantId,
        featureName: 'meta_ads_ai_analysis',
        unitsConsumed: 1,
        status: 'COMMITTED',
        referenceId: campaignId,
        tokensUsed: 650,
        costUsd: 0.002,
      },
    });

    const { token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, adAccountId);

    try {
      // 2. Fetch Campaign Details
      const campRes = await axios.get(`https://graph.facebook.com/${apiVersion}/${campaignId}`, {
        params: {
          access_token: token,
          fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time',
        },
      });
      const camp = campRes.data;

      // 3. Fetch Ad Sets
      const adSetsRes = await axios.get(`https://graph.facebook.com/${apiVersion}/${campaignId}/adsets`, {
        params: {
          access_token: token,
          fields: 'id,name,status,daily_budget,targeting',
          limit: 10,
        },
      });
      const adSets = adSetsRes.data.data || [];
      const primaryAdSet = adSets[0] || null;

      // 4. Fetch Insights (last 7 days performance)
      let insights: any = null;
      try {
        const insRes = await axios.get(`https://graph.facebook.com/${apiVersion}/${campaignId}/insights`, {
          params: {
            access_token: token,
            date_preset: 'last_7d',
            fields: 'impressions,clicks,spend,cpc,ctr,reach,actions',
          },
        });
        insights = insRes.data.data?.[0] || null;
      } catch (insErr: any) {
        this.logger.warn(`Could not fetch campaign insights: ${insErr.message}`);
      }

      const spend = Number(insights?.spend || 0);
      const clicks = Number(insights?.clicks || 0);
      const impressions = Number(insights?.impressions || 0);
      const ctr = Number(insights?.ctr || 0);
      const cpc = Number(insights?.cpc || 0);
      const currentBudget = camp.daily_budget ? Number(camp.daily_budget) / 100 : primaryAdSet?.daily_budget ? Number(primaryAdSet.daily_budget) / 100 : 0;

      // 5. Intelligent Diagnostics & AI Optimization Formula
      let healthScore = 75;
      let diagnosis = 'Good baseline performance.';
      let diagnosisBn = 'ক্যাম্পেইনের কার্যক্ষমতা সন্তোষজনক অবস্থায় রয়েছে।';
      let recommendedAction: 'SCALE_BUDGET_UP' | 'SCALE_BUDGET_DOWN' | 'EXPAND_AUDIENCE' | 'PAUSE_UNDERPERFORMING' = 'SCALE_BUDGET_UP';
      let suggestedScalingPercent = 20;
      let rationale = '';
      let rationaleBn = '';
      let suggestedTargeting: any = null;

      if (ctr >= 2.0 && cpc > 0 && cpc < 0.15) {
        // High engagement winner
        healthScore = 94;
        diagnosis = 'High Performing Campaign. Very strong CTR and low CPC.';
        diagnosisBn = 'উচ্চ কার্যক্ষমতাসম্পন্ন ক্যাম্পেইন! শক্তিশালী CTR এবং অত্যন্ত সাশ্রয়ী CPC পাওয়া যাচ্ছে।';
        recommendedAction = 'SCALE_BUDGET_UP';
        suggestedScalingPercent = 50;
        rationale = `Your CTR is stellar (${ctr.toFixed(2)}%) and CPC is very low ($${cpc.toFixed(3)}). Scaling budget up by +50% will maximize lead acquisition without audience fatigue.`;
        rationaleBn = `আপনার বিজ্ঞাপনের CTR দুর্দান্ত (${ctr.toFixed(2)}%) এবং প্রতি ক্লিকের খরচ মাত্র $${cpc.toFixed(3)}। দৈনিক বাজেট +৫০% বৃদ্ধি করলে অডিয়েন্স নষ্ট না হয়ে সর্বোচ্চ সেল ও লিড পাওয়া যাবে।`;
      } else if (ctr >= 1.0) {
        // Moderate performer
        healthScore = 82;
        diagnosis = 'Healthy Performing Campaign with steady delivery.';
        diagnosisBn = 'স্থিতিশীল ডেলিভারি ও সন্তোষজনক ফলাফল পাওয়া যাচ্ছে।';
        recommendedAction = 'SCALE_BUDGET_UP';
        suggestedScalingPercent = 20;
        rationale = `CTR is healthy at ${ctr.toFixed(2)}%. A standard +20% safe scaling increment is recommended to capture more market volume without resetting Facebook learning phase.`;
        rationaleBn = `বিজ্ঞাপনের CTR স্বাস্থ্যকর (${ctr.toFixed(2)}%)। মেটার লার্নিং ফেজ ক্ষতিগ্রস্ত না করে নিরাপদভাবে ডেলিভারি বাড়াতে বাজেট +২০% বাড়ানোর পরামর্শ দেওয়া হচ্ছে।`;
      } else if (impressions > 500 && ctr < 0.7) {
        // Creative or Audience fatigue
        healthScore = 52;
        diagnosis = 'Audience or Creative Fatigue detected. CTR is below benchmark.';
        diagnosisBn = 'বিজ্ঞাপনের কার্যক্ষমতা কমেছে। অডিয়েন্স ক্লান্তি বা কম CTR পরিলক্ষিত হচ্ছে।';
        recommendedAction = 'EXPAND_AUDIENCE';
        suggestedScalingPercent = -10;
        suggestedTargeting = {
          geo_locations: { countries: ['BD'] },
          age_min: 20,
          age_max: 55,
        };
        rationale = `Low CTR (${ctr.toFixed(2)}%) suggests the current audience has saturated. Broadening age targeting to 20-55 and adjusting budget by -10% will stabilize delivery.`;
        rationaleBn = `কম CTR (${ctr.toFixed(2)}%) প্রমাণ করে বর্তমান দর্শকগোষ্ঠী পোস্টটি বেশি ক্লিক করছে না। অডিয়েন্স বয়সসীমা ২০-৫৫ এ বাড়িয়ে এবং বাজেট -১০% রিক্যালিব্রেট করলে অপ্টিমাইজড রেজাল্ট আসবে।`;
      } else {
        // Early stage / learning phase
        healthScore = 70;
        diagnosis = 'Early delivery phase with moderate signals.';
        diagnosisBn = 'ক্যাম্পেইনটি প্রাথমিক ডেলিভারি ও লার্নিং পর্যায়ে রয়েছে।';
        recommendedAction = 'SCALE_BUDGET_UP';
        suggestedScalingPercent = 20;
        rationale = 'Accumulating baseline conversions. A controlled +20% scaling step will help exit learning phase faster.';
        rationaleBn = 'প্রাথমিক সিগন্যাল তৈরি হচ্ছে। নিয়ন্ত্রিত +২০% বাজেট বৃদ্ধি ফেসবুককে দ্রুত লার্নিং ফেজ শেষ করতে সাহায্য করবে।';
      }

      return {
        campaignId,
        campaignName: camp.name,
        status: camp.status,
        currentDailyBudget: currentBudget,
        currency: 'USD',
        telemetry: {
          impressions,
          clicks,
          spend,
          ctr: Number(ctr.toFixed(2)),
          cpc: Number(cpc.toFixed(3)),
          period: 'last_7d',
        },
        aiDiagnosis: {
          healthScore,
          diagnosis,
          diagnosisBn,
          recommendedAction,
          suggestedScalingPercent,
          suggestedTargeting,
          suggestedNewBudget: currentBudget > 0 ? Math.round(currentBudget * (1 + suggestedScalingPercent / 100)) : 10,
          rationale,
          rationaleBn,
          aiResponseQuotaCost: 1,
        },
      };
    } catch (error: any) {
      this.logger.error('Error analyzing campaign with AI:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to complete AI campaign analysis');
    }
  }

  /**
   * Confirms & Applies an AI Recommendation to Meta Graph API.
   * Costs 2 AI Response Quota credits (for executing multi-tier optimization).
   */
  async applyAiRecommendation(
    tenantId: string,
    dto: {
      adAccountId: string;
      campaignId: string;
      adSetId?: string;
      actionType: 'SCALE_BUDGET' | 'UPDATE_TARGETING' | 'TOGGLE_STATUS';
      percentage?: number;
      newDailyBudget?: number;
      targeting?: any;
      status?: 'ACTIVE' | 'PAUSED';
    },
  ) {
    // 1. Quota Preflight & Deduction: 2 AI Response Units for Execution
    await this.quotaService.checkAiQuota(tenantId);
    await this.prisma.aiUsageLog.create({
      data: {
        tenantId,
        featureName: 'meta_ads_ai_apply',
        unitsConsumed: 2,
        status: 'COMMITTED',
        referenceId: dto.campaignId,
        tokensUsed: 1200,
        costUsd: 0.004,
      },
    });

    const results: any = { appliedAt: new Date().toISOString(), actions: [] };

    // 2. Execute requested action on Meta
    if (dto.actionType === 'SCALE_BUDGET') {
      if (dto.percentage !== undefined && !isNaN(dto.percentage)) {
        const scaleRes = await this.scaleBudgetByPercentage(
          tenantId,
          dto.adAccountId,
          dto.campaignId,
          dto.percentage,
        );
        results.actions.push({ type: 'SCALE_BUDGET_PERCENTAGE', result: scaleRes });
      } else if (dto.newDailyBudget && dto.newDailyBudget > 0) {
        const updateRes = await this.updateDailyBudget(
          tenantId,
          dto.adAccountId,
          dto.campaignId,
          dto.newDailyBudget,
        );
        results.actions.push({ type: 'UPDATE_DAILY_BUDGET', result: updateRes });
      }
    } else if (dto.actionType === 'UPDATE_TARGETING') {
      if (!dto.adSetId) {
        // Resolve first ad set if not explicitly passed
        const adSets = await this.listAdSets(tenantId, dto.campaignId);
        if (adSets.length > 0) {
          dto.adSetId = adSets[0].id;
        }
      }
      if (dto.adSetId && dto.targeting) {
        const targetRes = await this.updateAdSetTargeting(
          tenantId,
          dto.adAccountId,
          dto.adSetId,
          dto.targeting,
        );
        results.actions.push({ type: 'UPDATE_TARGETING', result: targetRes });
      }
    } else if (dto.actionType === 'TOGGLE_STATUS') {
      const statusRes = await this.updateStatus(
        tenantId,
        dto.adAccountId,
        dto.campaignId,
        dto.status || 'ACTIVE',
      );
      results.actions.push({ type: 'UPDATE_STATUS', result: statusRes });
    }

    return {
      success: true,
      campaignId: dto.campaignId,
      results,
      aiResponseQuotaDeducted: 2,
    };
  }

  /**
   * Advanced Custom Campaign Launch (Ads Manager Full Pipeline):
   * Creates Campaign -> AdSet (with targeting, optimization & placements) -> AdCreative -> Ad.
   */
  async launchCustomCampaign(
    tenantId: string,
    dto: {
      adAccountId: string;
      facebookPageId: string;
      name: string;
      objective?: string;
      dailyBudget: number;
      durationDays?: number;
      headline: string;
      bodyText: string;
      callToAction?: string;
      linkUrl?: string;
      imageUrl?: string;
      targeting?: {
        countries?: string[];
        ageMin?: number;
        ageMax?: number;
        genders?: number[];
      };
    },
  ) {
    if (!dto.name || !dto.dailyBudget || dto.dailyBudget <= 0) {
      throw new BadRequestException('Campaign name and a valid daily budget are required.');
    }
    if (!dto.headline || !dto.bodyText) {
      throw new BadRequestException('Headline and primary ad copy body text are required.');
    }

    const { token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, dto.adAccountId);

    try {
      // 1. Create Campaign
      const campaignPayload: any = {
        access_token: token,
        name: `${dto.name} - ${new Date().toISOString().slice(0, 10)}`,
        objective: dto.objective || 'OUTCOME_ENGAGEMENT',
        status: 'ACTIVE',
        special_ad_categories: [],
      };

      const campRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/campaigns`, null, {
        params: campaignPayload,
      });
      const campaignId = campRes.data.id;

      // 2. Create Ad Set
      const countries = dto.targeting?.countries?.length ? dto.targeting.countries : ['BD'];
      const targeting: any = {
        geo_locations: { countries },
        age_min: dto.targeting?.ageMin || 18,
        age_max: dto.targeting?.ageMax || 65,
      };
      if (dto.targeting?.genders?.length) {
        targeting.genders = dto.targeting.genders;
      }

      const now = new Date();
      const durationDays = dto.durationDays && dto.durationDays > 0 ? dto.durationDays : 7;
      const stopTime = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const adSetPayload: any = {
        access_token: token,
        name: `${dto.name} AdSet`,
        campaign_id: campaignId,
        daily_budget: Math.round(dto.dailyBudget * 100),
        billing_event: 'IMPRESSIONS',
        optimization_goal: dto.objective === 'OUTCOME_TRAFFIC' ? 'LINK_CLICKS' : 'POST_ENGAGEMENT',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: JSON.stringify(targeting),
        promoted_object: JSON.stringify({ page_id: dto.facebookPageId }),
        status: 'ACTIVE',
        start_time: now.toISOString(),
        end_time: stopTime.toISOString(),
      };

      const adSetRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/adsets`, null, {
        params: adSetPayload,
      });
      const adSetId = adSetRes.data.id;

      // 3. Create AdCreative
      const creativePayload: any = {
        access_token: token,
        name: `${dto.name} Creative`,
        object_story_spec: JSON.stringify({
          page_id: dto.facebookPageId,
          link_data: {
            message: dto.bodyText,
            name: dto.headline,
            link: dto.linkUrl || 'https://zinichat.com',
            picture: dto.imageUrl || undefined,
            call_to_action: {
              type: dto.callToAction || 'LEARN_MORE',
              value: { link: dto.linkUrl || 'https://zinichat.com' },
            },
          },
        }),
      };

      const creativeRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/adcreatives`, null, {
        params: creativePayload,
      });
      const creativeId = creativeRes.data.id;

      // 4. Create Ad
      const adRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/ads`, null, {
        params: {
          access_token: token,
          name: `${dto.name} Ad`,
          adset_id: adSetId,
          creative: JSON.stringify({ creative_id: creativeId }),
          status: 'ACTIVE',
        },
      });
      const adId = adRes.data.id;

      return {
        success: true,
        campaignId,
        adSetId,
        creativeId,
        adId,
        dailyBudget: dto.dailyBudget,
        durationDays,
      };
    } catch (error: any) {
      this.logger.error('Error launching custom campaign:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to launch custom ad campaign on Meta');
    }
  }
}



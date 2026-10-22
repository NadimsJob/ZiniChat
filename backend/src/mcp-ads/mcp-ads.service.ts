import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException, ForbiddenException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';
import { QuotaService } from '../tenants/quota.service';
import { AiService } from '../ai/ai.service';
import axios from 'axios';

@Injectable()
export class McpAdsService {
  private readonly logger = new Logger(McpAdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly marketingConfig: MetaMarketingConfigService,
    private readonly quotaService: QuotaService,
    @Optional() private readonly aiService?: AiService,
  ) {}

  private async getDecryptedTokenAndAccount(tenantId: string, adAccountId?: string) {
    await this.quotaService.checkActiveSubscription(tenantId, 'Meta Ads Manager');

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
          fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time,objective,insights{impressions,clicks,spend,cpc,ctr,actions}',
          limit: 50,
        },
      });

      let campaigns = response.data.data || [];
      if (statusFilter) {
        campaigns = campaigns.filter((c: any) => c.status === statusFilter || c.effective_status === statusFilter);
      }

      return campaigns.map((c: any) => {
        const insightsObj = c.insights?.data?.[0];
        let events: any = undefined;
        if (insightsObj) {
          const actions = insightsObj.actions || [];
          const messagesStarted = Number(actions.find((a: any) => 
            a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
            a.action_type === 'onsite_conversion.messaging_user_depth_2' ||
            a.action_type === 'messaging_conversation_started_7d'
          )?.value || 0);
          const leads = Number(actions.find((a: any) => a.action_type === 'lead')?.value || 0);
          const purchases = Number(actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase')?.value || 0);
          const postEngagement = Number(actions.find((a: any) => a.action_type === 'post_engagement')?.value || 0);
          const linkClicks = Number(actions.find((a: any) => a.action_type === 'link_click')?.value || 0);

          events = {
            impressions: Number(insightsObj.impressions || 0),
            clicks: Number(insightsObj.clicks || 0),
            spend: Number(insightsObj.spend || 0),
            cpc: Number(insightsObj.cpc || 0),
            ctr: Number(insightsObj.ctr || 0),
            messagesStarted,
            leads,
            purchases,
            postEngagement,
            linkClicks,
          };
        }

        const mapped: any = {
          id: c.id,
          name: c.name,
          status: c.status,
          effectiveStatus: c.effective_status || c.status,
          objective: c.objective,
          dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
          lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
          startTime: c.start_time,
          stopTime: c.stop_time,
        };
        if (events) {
          mapped.events = events;
        }
        return mapped;
      });
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
    await this.quotaService.checkActiveSubscription(tenantId, 'Meta Ads Manager');

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
          fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time',
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

      // 4. Fetch Insights (last 7 days performance) with full conversion events
      let insights: any = null;
      try {
        const insRes = await axios.get(`https://graph.facebook.com/${apiVersion}/${campaignId}/insights`, {
          params: {
            access_token: token,
            date_preset: 'last_7d',
            fields: 'impressions,clicks,spend,cpc,ctr,reach,actions,cost_per_action_type',
          },
        });
        insights = insRes.data.data?.[0] || null;
      } catch (insErr: any) {
        this.logger.warn(`Could not fetch campaign insights: ${insErr.message}`);
      }

      const spend = Number(insights?.spend || 0);
      const clicks = Number(insights?.clicks || 0);
      const impressions = Number(insights?.impressions || 0);
      const reach = Number(insights?.reach || impressions);
      const ctr = Number(insights?.ctr || 0);
      const cpc = Number(insights?.cpc || 0);
      const currentBudget = camp.daily_budget ? Number(camp.daily_budget) / 100 : primaryAdSet?.daily_budget ? Number(primaryAdSet.daily_budget) / 100 : 0;

      // Parse conversion events from actions
      const actions = insights?.actions || [];
      const messagesStarted = Number(actions.find((a: any) => 
        a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
        a.action_type === 'onsite_conversion.messaging_user_depth_2' ||
        a.action_type === 'messaging_conversation_started_7d'
      )?.value || 0);
      const leads = Number(actions.find((a: any) => a.action_type === 'lead')?.value || 0);
      const purchases = Number(actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase')?.value || 0);
      const postEngagement = Number(actions.find((a: any) => a.action_type === 'post_engagement')?.value || 0);
      const linkClicks = Number(actions.find((a: any) => a.action_type === 'link_click')?.value || 0);

      // Default baseline diagnostics
      let healthScore = 75;
      let diagnosis = 'Good baseline performance with room for optimization.';
      let diagnosisBn = 'ক্যাম্পেইনের কার্যক্ষমতা সন্তোষজনক অবস্থায় রয়েছে এবং অপ্টিমাইজেশনের সুযোগ আছে।';
      let recommendedAction: 'SCALE_BUDGET_UP' | 'SCALE_BUDGET_DOWN' | 'EXPAND_AUDIENCE' | 'REFINE_TARGETING' | 'PAUSE_UNDERPERFORMING' = 'SCALE_BUDGET_UP';
      let suggestedScalingPercent = 20;
      let rationale = '';
      let rationaleBn = '';
      let suggestedTargeting: any = {
        geo_locations: { countries: ['BD'] },
        age_min: 22,
        age_max: 50,
        genders: [1, 2],
        interests: ['Online shopping', 'Customer service'],
      };

      if (ctr >= 2.0 && cpc > 0 && cpc < 0.15) {
        healthScore = 94;
        diagnosis = 'High Performing Campaign. Very strong CTR, high lead engagement, and low CPC.';
        diagnosisBn = 'উচ্চ কার্যক্ষমতাসম্পন্ন ক্যাম্পেইন! শক্তিশালী CTR, উচ্চ এনগেজমেন্ট এবং সাশ্রয়ী CPC পাওয়া যাচ্ছে।';
        recommendedAction = 'SCALE_BUDGET_UP';
        suggestedScalingPercent = 50;
        rationale = `Your CTR is stellar (${ctr.toFixed(2)}%) and CPC is very low ($${cpc.toFixed(3)}). Scaling budget up by +50% will maximize lead acquisition without resetting learning.`;
        rationaleBn = `আপনার বিজ্ঞাপনের CTR দুর্দান্ত (${ctr.toFixed(2)}%) এবং খরচ মাত্র $${cpc.toFixed(3)}। বাজেট +৫০% বৃদ্ধি করলে অডিয়েন্স নষ্ট না হয়ে সর্বোচ্চ মেসেজ ও লিড পাওয়া যাবে।`;
      } else if (ctr >= 1.0) {
        healthScore = 82;
        diagnosis = 'Healthy Performing Campaign with steady delivery.';
        diagnosisBn = 'স্থিতিশীল ডেলিভারি ও সন্তোষজনক ফলাফল পাওয়া যাচ্ছে।';
        recommendedAction = 'SCALE_BUDGET_UP';
        suggestedScalingPercent = 20;
        rationale = `CTR is healthy at ${ctr.toFixed(2)}%. A standard +20% safe scaling increment is recommended to capture more market volume safely.`;
        rationaleBn = `বিজ্ঞাপনের CTR স্বাস্থ্যকর (${ctr.toFixed(2)}%)। মেটার লার্নিং ফেজ নষ্ট না করে নিরাপদে বাজেট +২০% বাড়ানো সুপারিশকৃত।`;
      } else if (impressions > 500 && ctr < 0.7) {
        healthScore = 52;
        diagnosis = 'Audience or Creative Fatigue detected. CTR is below benchmark.';
        diagnosisBn = 'বিজ্ঞাপনের কার্যক্ষমতা কমেছে। অডিয়েন্স ক্লান্তি বা কম CTR পরিলক্ষিত হচ্ছে।';
        recommendedAction = 'REFINE_TARGETING';
        suggestedScalingPercent = -10;
        suggestedTargeting = {
          geo_locations: { countries: ['BD'] },
          age_min: 24,
          age_max: 52,
          genders: [1, 2],
          interests: ['Online shopping', 'Retail'],
        };
        rationale = `Low CTR (${ctr.toFixed(2)}%) suggests current audience has saturated. Tightening age targeting to 24-52 and testing fresh creative copy will restore conversion velocity.`;
        rationaleBn = `কম CTR (${ctr.toFixed(2)}%) নির্দেশ করে অডিয়েন্স সম্পৃক্ততা কমেছে। বয়সসীমা ২৪-৫২ এ সমন্বয় করে নতুন আকর্ষণীয় কপি ব্যবহার করলে ভালো ফল আসবে।`;
      } else {
        healthScore = 70;
        diagnosis = 'Early delivery phase with moderate telemetry.';
        diagnosisBn = 'ক্যাম্পেইনটি প্রাথমিক ডেলিভারি ও লার্নিং পর্যায়ে রয়েছে।';
        recommendedAction = 'SCALE_BUDGET_UP';
        suggestedScalingPercent = 20;
        rationale = 'Accumulating baseline conversions. A controlled +20% scaling step will help exit learning phase faster.';
        rationaleBn = 'প্রাথমিক সিগন্যাল তৈরি হচ্ছে। নিয়ন্ত্রিত +২০% বাজেট বৃদ্ধি ফেসবুককে দ্রুত লার্নিং ফেজ শেষ করতে সাহায্য করবে।';
      }

      let targetingOptimization: any = {
        evaluation: 'Audience size is balanced, but fine-tuning age bracket and purchasing interests will filter out casual scrollers.',
        evaluationBn: 'অডিয়েন্স পরিধি ঠিক আছে, তবে বয়সসীমা ও শপিং সংক্রান্ত আগ্রহ যোগ করলে অপ্রয়োজনীয় মেসেজ বন্ধ হয়ে আসল ক্রেতা বাড়বে।',
        suggestedCountries: ['BD'],
        suggestedAgeMin: suggestedTargeting.age_min,
        suggestedAgeMax: suggestedTargeting.age_max,
        suggestedGenders: [1, 2],
        suggestedInterests: ['Online shopping', 'Retail', 'E-commerce'],
        rationale: 'Focuses delivery on demographic segments with verified online purchasing capability.',
        rationaleBn: 'অনলাইনে কেনাকাটায় অভ্যস্ত সক্রিয় ক্রেতাগোষ্ঠীর কাছে বিজ্ঞাপন প্রদর্শন নিশ্চিত করে।',
      };

      let creativeOptimization: any = {
        evaluation: 'Ad creative needs stronger direct-response hooks and urgency cues to capture attention in the first 2 seconds.',
        evaluationBn: 'বিজ্ঞাপনের কপি ও শিরোনামে আরও জোরালো অফার ও সীমিত সময়ের সুযোগের উল্লেখ থাকা দরকার।',
        suggestedHeadlines: [
          '🔥 সীমিত সময়ের স্পেশাল অফার - স্টক দ্রুত শেষ হচ্ছে!',
          '💯 প্রিমিয়াম কোয়ালিটি ও ১০০% অরিজিনাল গ্যারান্টি',
          '⚡ আজই অর্ডার করুন এবং উপভোগ করুন দ্রুত হোম ডেলিভারি'
        ],
        suggestedPrimaryTexts: [
          'আপনার পছন্দের পণ্য এখন সেরা দামে! কোনো অগ্রিম পেমেন্ট ছাড়াই সারা দেশে ক্যাশ অন ডেলিভারিতে অর্ডার করতে এখনই মেসেজ পাঠান।',
          'হাজারো সন্তুষ্ট গ্রাহকের বিশ্বাসে সেরা অভিজ্ঞতা। স্টক সীমিত, তাই এখনই বিস্তারিত জানতে ইনবক্স করুন।'
        ],
        suggestedCta: 'MESSAGE_PAGE',
        rationale: 'Direct-response messaging reduces hesitation and speeds up customer inquiries.',
        rationaleBn: 'সরাসরি অফার গ্রাহকের দ্বিধা দূর করে এবং ইনবক্সে যোগাযোগ বৃদ্ধি করে।',
      };

      let placementOptimization: any = {
        recommendedType: 'advantage_plus',
        advice: 'Keep Advantage+ active to allow Meta AI to route impressions to whichever platform (Feeds vs Reels) provides the lowest cost per message.',
        adviceBn: 'Advantage+ চালু রাখুন যাতে মেটার এলগরিদম স্বয়ংক্রিয়ভাবে যেখানে সবচেয়ে কম খরচে মেসেজ পাওয়া যায় সেখানে বিজ্ঞাপন দেখায়।',
      };

      // Call LLM for deep strategic reasoning if available
      if (this.aiService) {
        try {
          const prompt = `You are a Principal Meta Ads Performance Director.
Analyze this live active Facebook/Instagram campaign and provide a multi-dimensional diagnostic report covering:
1. Overall Health Score (0-100) & Diagnosis
2. Daily Budget Optimization (+/- %)
3. Audience & Demographic Targeting Refinements
4. Creative, Headline & Copy Suggestions
5. Placement Advice

Campaign Data:
- Name: "${camp.name}"
- Objective: "${camp.objective}"
- Status: "${camp.status}" (Effective: "${camp.effective_status || camp.status}")
- Daily Budget: $${currentBudget}
- 7-Day Spend: $${spend}
- Impressions: ${impressions}
- Clicks: ${clicks}
- CTR: ${ctr}%
- CPC: $${cpc}
- Messaging Conversations Started: ${messagesStarted}
- Leads: ${leads}
- Purchases: ${purchases}
- Primary AdSet Targeting: ${JSON.stringify(primaryAdSet?.targeting || {})}

Return strictly valid JSON matching this schema (no markdown, no backticks):
{
  "healthScore": 85,
  "diagnosis": "Summary in English...",
  "diagnosisBn": "বাংলায় ডায়াগনোসিস...",
  "recommendedAction": "SCALE_BUDGET_UP",
  "suggestedScalingPercent": 20,
  "suggestedNewBudget": ${currentBudget > 0 ? Math.round(currentBudget * 1.2) : 10},
  "rationale": "Why this scaling works...",
  "rationaleBn": "বাংলায় ব্যাখ্যা...",
  "targeting": {
    "evaluation": "Audience evaluation...",
    "evaluationBn": "বাংলায় অডিয়েন্স মূল্যায়ন...",
    "suggestedAgeMin": 22,
    "suggestedAgeMax": 48,
    "suggestedGenders": [1, 2],
    "suggestedCountries": ["BD"],
    "suggestedInterests": ["Online shopping", "Fashion accessories"],
    "rationale": "Why these targets succeed...",
    "rationaleBn": "বাংলায় ব্যাখ্যা..."
  },
  "creatives": {
    "evaluation": "Creative copy evaluation...",
    "evaluationBn": "বাংলায় কপি মূল্যায়ন...",
    "suggestedHeadlines": ["Headline 1", "Headline 2", "Headline 3"],
    "suggestedPrimaryTexts": ["Copy text 1", "Copy text 2"],
    "suggestedCta": "MESSAGE_PAGE",
    "rationale": "Why these hooks convert...",
    "rationaleBn": "বাংলায় ব্যাখ্যা..."
  },
  "placements": {
    "recommendedType": "advantage_plus",
    "advice": "Placements advice in English...",
    "adviceBn": "বাংলায় প্লেসমেন্ট পরামর্শ..."
  }
}`;
          const rawAi = await this.aiService.generateCompletion(prompt);
          const parsed = JSON.parse(rawAi.replace(/```json/g, '').replace(/```/g, '').trim());
          if (parsed.healthScore) {
            healthScore = Number(parsed.healthScore);
            diagnosis = parsed.diagnosis || diagnosis;
            diagnosisBn = parsed.diagnosisBn || diagnosisBn;
            if (parsed.recommendedAction) recommendedAction = parsed.recommendedAction;
            if (parsed.suggestedScalingPercent !== undefined) suggestedScalingPercent = Number(parsed.suggestedScalingPercent);
            rationale = parsed.rationale || rationale;
            rationaleBn = parsed.rationaleBn || rationaleBn;
            if (parsed.targeting) {
              targetingOptimization = {
                evaluation: parsed.targeting.evaluation || targetingOptimization.evaluation,
                evaluationBn: parsed.targeting.evaluationBn || targetingOptimization.evaluationBn,
                suggestedCountries: parsed.targeting.suggestedCountries || ['BD'],
                suggestedAgeMin: parsed.targeting.suggestedAgeMin || 22,
                suggestedAgeMax: parsed.targeting.suggestedAgeMax || 50,
                suggestedGenders: parsed.targeting.suggestedGenders || [1, 2],
                suggestedInterests: parsed.targeting.suggestedInterests || ['Online shopping'],
                rationale: parsed.targeting.rationale || targetingOptimization.rationale,
                rationaleBn: parsed.targeting.rationaleBn || targetingOptimization.rationaleBn,
              };
              suggestedTargeting = {
                geo_locations: { countries: targetingOptimization.suggestedCountries },
                age_min: targetingOptimization.suggestedAgeMin,
                age_max: targetingOptimization.suggestedAgeMax,
                genders: targetingOptimization.suggestedGenders,
                interests: targetingOptimization.suggestedInterests,
              };
            }
            if (parsed.creatives) {
              creativeOptimization = {
                evaluation: parsed.creatives.evaluation || creativeOptimization.evaluation,
                evaluationBn: parsed.creatives.evaluationBn || creativeOptimization.evaluationBn,
                suggestedHeadlines: parsed.creatives.suggestedHeadlines || creativeOptimization.suggestedHeadlines,
                suggestedPrimaryTexts: parsed.creatives.suggestedPrimaryTexts || creativeOptimization.suggestedPrimaryTexts,
                suggestedCta: parsed.creatives.suggestedCta || creativeOptimization.suggestedCta,
                rationale: parsed.creatives.rationale || creativeOptimization.rationale,
                rationaleBn: parsed.creatives.rationaleBn || creativeOptimization.rationaleBn,
              };
            }
            if (parsed.placements) {
              placementOptimization = {
                recommendedType: parsed.placements.recommendedType || placementOptimization.recommendedType,
                advice: parsed.placements.advice || placementOptimization.advice,
                adviceBn: parsed.placements.adviceBn || placementOptimization.adviceBn,
              };
            }
          }
        } catch (aiErr: any) {
          this.logger.warn(`AI campaign analysis LLM parse failed, using telemetry baseline: ${aiErr.message}`);
        }
      }

      const calculatedNewBudget = currentBudget > 0 ? Math.round(currentBudget * (1 + suggestedScalingPercent / 100)) : 10;

      // Actionable Recommendations array with pre-configured 1-click payloads
      const actionableRecommendations: any[] = [
        {
          id: 'action_budget',
          type: 'SCALE_BUDGET',
          title: suggestedScalingPercent >= 0 ? `Scale Daily Budget +${suggestedScalingPercent}%` : `Scale Daily Budget ${suggestedScalingPercent}%`,
          titleBn: suggestedScalingPercent >= 0 ? `দৈনিক বাজেট +${suggestedScalingPercent}% বৃদ্ধি করুন` : `দৈনিক বাজেট ${suggestedScalingPercent}% কমান`,
          description: `Adjust daily budget from $${currentBudget} to $${calculatedNewBudget} on Meta.`,
          descriptionBn: `মেটায় দৈনিক বাজেট $${currentBudget} থেকে $${calculatedNewBudget}-এ পরিবর্তন করুন।`,
          payload: {
            newDailyBudget: calculatedNewBudget,
            percentage: suggestedScalingPercent,
          },
        },
        {
          id: 'action_targeting',
          type: 'UPDATE_TARGETING',
          title: 'Apply AI-Refined Audience Targeting',
          titleBn: 'এআই প্রস্তাবিত নতুন অডিয়েন্স প্রয়োগ করুন',
          description: `Target Age ${targetingOptimization.suggestedAgeMin}-${targetingOptimization.suggestedAgeMax} with interests: ${targetingOptimization.suggestedInterests.slice(0, 3).join(', ')}.`,
          descriptionBn: `বয়সসীমা ${targetingOptimization.suggestedAgeMin}-${targetingOptimization.suggestedAgeMax} এবং নির্দিষ্ট কেনাকাটার আগ্রহ যুক্ত করুন।`,
          payload: {
            targeting: {
              geo_locations: { countries: targetingOptimization.suggestedCountries },
              age_min: targetingOptimization.suggestedAgeMin,
              age_max: targetingOptimization.suggestedAgeMax,
              genders: targetingOptimization.suggestedGenders,
              flexible_spec: [{ interests: targetingOptimization.suggestedInterests.map((name: string) => ({ name })) }],
            },
          },
        },
      ];

      return {
        campaignId,
        campaignName: camp.name,
        status: camp.status,
        effectiveStatus: camp.effective_status || camp.status,
        currentDailyBudget: currentBudget,
        currency: 'USD',
        telemetry: {
          impressions,
          reach,
          clicks,
          spend,
          ctr: Number(ctr.toFixed(2)),
          cpc: Number(cpc.toFixed(3)),
          messagesStarted,
          leads,
          purchases,
          postEngagement,
          linkClicks,
          period: 'last_7d',
        },
        aiDiagnosis: {
          healthScore,
          diagnosis,
          diagnosisBn,
          recommendedAction,
          suggestedScalingPercent,
          suggestedTargeting,
          suggestedNewBudget: calculatedNewBudget,
          rationale,
          rationaleBn,
          targetingOptimization,
          creativeOptimization,
          placementOptimization,
          actionableRecommendations,
          aiResponseQuotaCost: 1,
        },
      };
    } catch (error: any) {
      this.logger.error('Error analyzing campaign with AI:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to complete AI campaign analysis');
    }
  }

  /**
   * AI-Assisted Audience Re-Targeting Assistant.
   * Solves problem of untargeted messaging leads / unqualified customers,
   * generates high-intent targeting and costs 1 AI Response Credit.
   */
  async aiRetargetAudience(
    tenantId: string,
    dto: {
      adAccountId: string;
      campaignId: string;
      adSetId?: string;
      problemDescription?: string;
      targetBuyerPersona?: string;
    },
  ) {
    // 1. Quota Preflight & Deduction: 1 AI Response Unit
    await this.quotaService.checkAiQuota(tenantId);
    await this.prisma.aiUsageLog.create({
      data: {
        tenantId,
        featureName: 'meta_ads_ai_retarget',
        unitsConsumed: 1,
        status: 'COMMITTED',
        referenceId: dto.campaignId,
        tokensUsed: 750,
        costUsd: 0.002,
      },
    });

    const { token, apiVersion } = await this.getDecryptedTokenAndAccount(tenantId, dto.adAccountId);

    let targetAdSetId = dto.adSetId;
    let currentTargeting: any = {};
    try {
      const adSetsRes = await axios.get(`https://graph.facebook.com/${apiVersion}/${dto.campaignId}/adsets`, {
        params: {
          access_token: token,
          fields: 'id,name,status,targeting,daily_budget',
          limit: 10,
        },
      });
      const adSets = adSetsRes.data.data || [];
      if (adSets.length > 0) {
        targetAdSetId = targetAdSetId || adSets[0].id;
        currentTargeting = adSets[0].targeting || {};
      }
    } catch (err: any) {
      this.logger.warn(`Could not fetch ad set for retargeting: ${err.message}`);
    }

    const currentAgeMin = currentTargeting.age_min || 18;
    const currentAgeMax = currentTargeting.age_max || 65;
    const currentCountries = currentTargeting.geo_locations?.countries || ['BD'];

    let result = {
      campaignId: dto.campaignId,
      adSetId: targetAdSetId,
      currentTargeting: {
        ageMin: currentAgeMin,
        ageMax: currentAgeMax,
        countries: currentCountries,
        genders: currentTargeting.genders || [],
        raw: currentTargeting,
      },
      suggestedTargeting: {
        countries: currentCountries,
        ageMin: Math.max(22, currentAgeMin),
        ageMax: Math.min(52, currentAgeMax),
        genders: [1, 2],
        interests: ['Online shopping', 'Retail', 'Customer service', 'E-commerce'],
        raw: {
          geo_locations: { countries: currentCountries },
          age_min: Math.max(22, currentAgeMin),
          age_max: Math.min(52, currentAgeMax),
          genders: [1, 2],
          flexible_spec: [{ interests: [{ name: 'Online shopping' }, { name: 'Retail' }] }],
        },
      },
      summary: 'Adjusted demographic focus away from student age groups to purchasing-age professionals with active shopping interests.',
      summaryBn: 'অপ্রয়োজনীয় কম বয়সী বা শিক্ষার্থীর মেসেজ কমাতে বয়সসীমা ২২-৫২ এ উন্নীত করা হয়েছে এবং অনলাইন শপিং ক্রেতাদের টার্গেট করা হয়েছে।',
      rationale: 'Filters out uncommitted or non-buying leads while concentrating ad delivery on verified buyers.',
      rationaleBn: 'এর মাধ্যমে অযথা চ্যাট করা অডিয়েন্স বাদ যাবে এবং পণ্য ক্রয়ে আগ্রহী প্রকৃত গ্রাহকরাই মেসেজ পাঠাবে।',
      aiResponseQuotaCost: 1,
    };

    if (this.aiService) {
      try {
        const prompt = `You are a Meta Advertising Audience Targeting Specialist.
The merchant is running a Facebook/Instagram campaign but reporting that incoming messages are NOT from their target audience:
Merchant Problem Description: "${dto.problemDescription || 'Current leads/messages are unqualified and not purchasing'}"
Target Buyer Persona: "${dto.targetBuyerPersona || 'Affluent customers ready to buy'}"
Current Targeting: Age ${currentAgeMin}-${currentAgeMax}, Countries: ${currentCountries.join(', ')}

Provide an optimized, precise Meta Graph API targeting configuration that filters out unqualified audiences and targets high-intent buyers.
Return ONLY valid JSON matching this schema (no markdown, no backticks):
{
  "ageMin": 24,
  "ageMax": 50,
  "genders": [1, 2],
  "countries": ["BD"],
  "interests": ["Online shopping", "Luxury goods", "Retail"],
  "summary": "English summary of changes...",
  "summaryBn": "বাংলায় পরিবর্তনের সারসংক্ষেপ...",
  "rationale": "English rationale...",
  "rationaleBn": "বাংলায় যুক্তি..."
}`;
        const rawAi = await this.aiService.generateCompletion(prompt);
        const parsed = JSON.parse(rawAi.replace(/```json/g, '').replace(/```/g, '').trim());
        if (parsed.ageMin) {
          result.suggestedTargeting = {
            countries: parsed.countries || currentCountries,
            ageMin: Number(parsed.ageMin),
            ageMax: Number(parsed.ageMax),
            genders: parsed.genders || [1, 2],
            interests: parsed.interests || ['Online shopping'],
            raw: {
              geo_locations: { countries: parsed.countries || currentCountries },
              age_min: Number(parsed.ageMin),
              age_max: Number(parsed.ageMax),
              genders: parsed.genders || [1, 2],
              flexible_spec: [{ interests: (parsed.interests || ['Online shopping']).map((name: string) => ({ name })) }],
            },
          };
          result.summary = parsed.summary || result.summary;
          result.summaryBn = parsed.summaryBn || result.summaryBn;
          result.rationale = parsed.rationale || result.rationale;
          result.rationaleBn = parsed.rationaleBn || result.rationaleBn;
        }
      } catch (aiErr: any) {
        this.logger.warn(`AI audience retargeting fallback: ${aiErr.message}`);
      }
    }

    return result;
  }

  /**
   * Updates an active campaign and its primary ad set directly on Meta Graph API.
   * Can update campaign name, status, daily budget, and audience targeting.
   */
  async updateCampaignDetails(
    tenantId: string,
    campaignId: string,
    dto: {
      adAccountId: string;
      name?: string;
      status?: 'ACTIVE' | 'PAUSED';
      dailyBudget?: number;
      adSetId?: string;
      targeting?: {
        countries?: string[];
        ageMin?: number;
        ageMax?: number;
        genders?: number[];
        interests?: string[];
      };
    },
  ) {
    const { token, apiVersion } = await this.getDecryptedTokenAndAccount(tenantId, dto.adAccountId);

    try {
      // 1. Update Campaign attributes if provided
      if (dto.name || dto.status) {
        const campParams: any = { access_token: token };
        if (dto.name) campParams.name = dto.name;
        if (dto.status) campParams.status = dto.status;
        await axios.post(`https://graph.facebook.com/${apiVersion}/${campaignId}`, null, {
          params: campParams,
        });
      }

      // 2. Update AdSet attributes if budget or targeting provided
      if (dto.dailyBudget || dto.targeting) {
        let targetAdSetId = dto.adSetId;
        if (!targetAdSetId) {
          const adSetsRes = await axios.get(`https://graph.facebook.com/${apiVersion}/${campaignId}/adsets`, {
            params: { access_token: token, fields: 'id', limit: 5 },
          });
          targetAdSetId = adSetsRes.data.data?.[0]?.id;
        }

        if (targetAdSetId) {
          const adSetParams: any = { access_token: token };
          if (dto.dailyBudget && dto.dailyBudget > 0) {
            adSetParams.daily_budget = Math.round(dto.dailyBudget * 100);
          }
          if (dto.targeting) {
            const targetingObj: any = {
              geo_locations: { countries: dto.targeting.countries?.length ? dto.targeting.countries : ['BD'] },
              age_min: dto.targeting.ageMin || 18,
              age_max: dto.targeting.ageMax || 65,
            };
            if (dto.targeting.genders?.length) {
              targetingObj.genders = dto.targeting.genders;
            }
            if (dto.targeting.interests?.length) {
              targetingObj.flexible_spec = [{ interests: dto.targeting.interests.map((name: string) => ({ name })) }];
            }
            adSetParams.targeting = JSON.stringify(targetingObj);
          }

          await axios.post(`https://graph.facebook.com/${apiVersion}/${targetAdSetId}`, null, {
            params: adSetParams,
          });
        }
      }

      return {
        success: true,
        campaignId,
        adSetId: dto.adSetId,
        updatedFields: {
          name: dto.name,
          status: dto.status,
          dailyBudget: dto.dailyBudget,
          targeting: dto.targeting,
        },
      };
    } catch (error: any) {
      this.logger.error('Error updating campaign details:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to update campaign details on Meta');
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
   * Fetches all Meta Pixels associated with the tenant's connected Ad Accounts.
   */
  async getAdAccountPixels(tenantId: string, adAccountId?: string) {
    await this.quotaService.checkActiveSubscription(tenantId, 'Meta Ads Manager');

    let accounts: any[] = [];
    if (adAccountId) {
      const acc = await this.prisma.tenantMetaAdAccount.findFirst({
        where: { tenantId, adAccountId, status: 'active' },
      });
      if (acc) accounts = [acc];
    } else {
      accounts = await this.prisma.tenantMetaAdAccount.findMany({
        where: { tenantId, status: 'active' },
      });
    }

    if (accounts.length === 0) {
      return {
        isMetaConnected: false,
        pixels: [],
        message: 'No active Meta Ad Account found for this tenant.',
      };
    }

    const config = await this.marketingConfig.getConfig();
    const apiVersion = config.apiVersion || 'v21.0';

    const allPixels: Array<{
      id: string;
      name: string;
      isUnavailable?: boolean;
      creationTime?: string;
      lastFiredTime?: string;
      adAccountId: string;
      adAccountName: string;
    }> = [];

    for (const acc of accounts) {
      try {
        const decryptedToken = this.crypto.decrypt(acc.accessToken);
        const cleanId = acc.adAccountId.startsWith('act_') ? acc.adAccountId : `act_${acc.adAccountId}`;

        const response = await axios.get(`https://graph.facebook.com/${apiVersion}/${cleanId}/adspixels`, {
          params: {
            access_token: decryptedToken,
            fields: 'id,name,creation_time,is_unavailable,last_fired_time',
          },
          timeout: 8000,
        });

        const pixelsData = response.data?.data || [];
        for (const p of pixelsData) {
          allPixels.push({
            id: p.id,
            name: p.name || `Pixel (${p.id})`,
            isUnavailable: Boolean(p.is_unavailable),
            creationTime: p.creation_time,
            lastFiredTime: p.last_fired_time,
            adAccountId: acc.adAccountId,
            adAccountName: acc.adAccountName || 'Ad Account',
          });
        }
      } catch (err: any) {
        this.logger.warn(`Could not fetch pixels for ad account ${acc.adAccountId}: ${err.response?.data?.error?.message || err.message}`);
      }
    }

    // Deduplicate pixels by ID
    const uniquePixels = Array.from(new Map(allPixels.map(p => [p.id, p])).values());

    return {
      isMetaConnected: true,
      pixels: uniquePixels,
    };
  }

  /**
   * Pre-flight AI Copy & Campaign Evaluation:
   * Analyzes campaign objective, hooks, multiple primary texts, audience targeting, and budget.
   * Deducts 1 AI Response Credit from aiUsageLog (Rule 4: independent pool, strictly AI credits).
   */
  async reviewAdWithAi(
    tenantId: string,
    dto: {
      adAccountId: string;
      campaignName?: string;
      objective: string;
      headlines?: string[];
      primaryTexts?: string[];
      headline?: string;
      bodyText?: string;
      callToAction?: string;
      targetAudience?: any;
      dailyBudget?: number;
      destinationUrl?: string;
      creativeSource?: 'upload' | 'existing_post';
      pagePostId?: string;
    },
  ) {
    // 1. Quota Preflight & Deduction: 1 AI Response Unit
    await this.quotaService.checkAiQuota(tenantId);
    await this.prisma.aiUsageLog.create({
      data: {
        tenantId,
        featureName: 'meta_ads_ai_copy_review',
        unitsConsumed: 1,
        status: 'COMMITTED',
        referenceId: dto.campaignName || `ad_review_${Date.now()}`,
        tokensUsed: 650,
        costUsd: 0.002,
      },
    });

    const primaryTexts = dto.primaryTexts && dto.primaryTexts.length > 0
      ? dto.primaryTexts.filter(t => t.trim().length > 0)
      : (dto.bodyText ? [dto.bodyText] : []);
    const headlines = dto.headlines && dto.headlines.length > 0
      ? dto.headlines.filter(h => h.trim().length > 0)
      : (dto.headline ? [dto.headline] : []);

    const primaryText = primaryTexts[0] || '';
    const headline = headlines[0] || '';

    let aiResponseText = '';
    if (this.aiService) {
      try {
        const prompt = `You are an elite Meta Advertising Director and Direct-Response Copywriting Specialist.
Analyze this Facebook/Instagram Ad setup and provide an actionable pre-flight analysis.

Campaign Setup:
- Campaign Name: ${dto.campaignName || 'Untitled Campaign'}
- Objective: ${dto.objective || 'OUTCOME_ENGAGEMENT'}
- Primary Copy Text(s): ${JSON.stringify(primaryTexts)}
- Headline(s): ${JSON.stringify(headlines)}
- Call To Action: ${dto.callToAction || 'LEARN_MORE'}
- Daily Budget: $${dto.dailyBudget || 5}
- Target Countries: ${dto.targetAudience?.countries || 'BD'}
- Target Age: ${dto.targetAudience?.ageMin || 18} - ${dto.targetAudience?.ageMax || 65}
- Target Gender: ${dto.targetAudience?.gender || 'all'}
- Creative Type: ${dto.creativeSource === 'existing_post' ? 'Boost Existing Page Post' : 'Upload Image / Media Banner'}

Return ONLY a valid JSON object matching this schema (no markdown formatting, no code fences):
{
  "overallScore": 88,
  "hookScore": 85,
  "clarityScore": 90,
  "policyRisk": "LOW",
  "policyFeedback": "No sensationalist or prohibited claims detected under Meta Advertising Policies.",
  "policyFeedbackBn": "মেটা বিজ্ঞাপন নীতিমালা অনুযায়ী কোনো নীতিবিরোধী বা বিভ্রান্তিকর দাবি পরিলক্ষিত হয়নি।",
  "strengths": ["Clear value proposition", "Action-oriented call to action"],
  "strengthsBn": ["স্পষ্ট অফার ও ভ্যালু প্রপোজিশন", "অ্যাকশন-ভিত্তিক কল-টু-অ্যাকশন"],
  "weaknesses": ["Could add stronger scarcity or social proof element"],
  "weaknessesBn": ["অফারটিতে জরুরি প্রয়োজন (Urgency) বা সামাজিক গ্রহণযোগ্যতা আরও বাড়ানো যেতে পারে"],
  "suggestedVariations": [
    {
      "hookType": "Direct Urgency & FOMO",
      "headline": "Exclusive Limited-Time Offer!",
      "primaryText": "Don't miss out on our best-selling collection. Shop today before stock runs out!",
      "rationale": "High urgency triggers immediate action and cuts decision friction.",
      "rationaleBn": "সীমিত সময়ের অফার তাৎক্ষণিক সিদ্ধান্ত নিতে সহায়তা করে এবং সেল বৃদ্ধি করে।"
    },
    {
      "hookType": "Social Proof & Trust",
      "headline": "Loved by Thousands of Customers",
      "primaryText": "Join our happy community! 100% genuine quality with easy return warranty.",
      "rationale": "Overcomes buyer skepticism by highlighting social proof and risk reversal.",
      "rationaleBn": "কাস্টমারদের আস্থা অর্জন করতে ও নিরাপদ অনুভূতির সৃষ্টি করতে সহায়ক।"
    },
    {
      "hookType": "Benefit-Driven & Solution",
      "headline": "The Smarter Choice for Everyday Life",
      "primaryText": "Upgrade your experience with premium quality designed to save your time and money.",
      "rationale": "Focuses on tangible benefits and emotional satisfaction.",
      "rationaleBn": "গ্রাহকের সুবিধা ও সরাসরি উপকারিতার ওপর জোর দেয়।"
    }
  ]
}`;
        aiResponseText = await this.aiService.generateCompletion(prompt);
      } catch (err: any) {
        this.logger.warn(`AI Service generateCompletion failed, falling back to heuristic engine: ${err.message}`);
      }
    }

    let parsedResult: any = null;
    if (aiResponseText) {
      try {
        const cleaned = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(cleaned);
      } catch {
        parsedResult = null;
      }
    }

    if (!parsedResult) {
      const textLen = primaryText.length;
      const hasDiscount = /(%|off|ছাড়|অফার|offer|discount|free|ফ্রি|save)/i.test(primaryText + headline);
      const hasUrgency = /(today|now|limited|hurry|আজই|দ্রুত|সীমিত|এখনই)/i.test(primaryText + headline);
      const hasQuestion = /(\?|কেন|কীভাবে|how|why)/i.test(primaryText);
      const allCaps = headline.length > 5 && headline === headline.toUpperCase();

      let overallScore = 76;
      let hookScore = 72;
      let clarityScore = 80;

      if (hasDiscount) { overallScore += 8; hookScore += 10; }
      if (hasUrgency) { overallScore += 7; hookScore += 10; }
      if (hasQuestion) { hookScore += 8; }
      if (textLen >= 40 && textLen <= 300) { clarityScore += 10; overallScore += 5; }
      if (allCaps) { overallScore -= 8; }

      overallScore = Math.min(Math.max(overallScore, 60), 96);
      hookScore = Math.min(Math.max(hookScore, 55), 95);
      clarityScore = Math.min(Math.max(clarityScore, 65), 98);

      const policyRisk = allCaps ? 'MEDIUM' : 'LOW';
      const policyFeedback = allCaps
        ? 'Avoid using excessive ALL CAPS in headlines as Meta may limit distribution.'
        : 'Copy follows standard Meta Advertising Policies. Clean and compliant.';
      const policyFeedbackBn = allCaps
        ? 'হেডলাইনে সব বড় হাতের অক্ষর (ALL CAPS) ব্যবহার করা থেকে বিরত থাকুন, মেটা এটি সীমাবদ্ধ করতে পারে।'
        : 'বিজ্ঞাপনের কপি মেটার সাধারণ বিজ্ঞাপন নীতিমালা অনুসরণ করে তৈরি হয়েছে। কোনো জটিলতা নেই।';

      const strengths = [
        hasDiscount ? 'Strong commercial incentive / discount present' : 'Clear product focus',
        hasUrgency ? 'Creates healthy purchasing urgency' : 'Engaging tone of voice',
      ];
      const strengthsBn = [
        hasDiscount ? 'আকর্ষণীয় অফার ও মূল্যছাড়ের উপস্থিতি' : 'পণ্যের মূল বিষয়ের ওপর স্পষ্ট ফোকাস',
        hasUrgency ? 'গ্রাহককে দ্রুত সিদ্ধান্ত নিতে উৎসাহিত করে' : 'সহজ ও আকর্ষণীয় বক্তব্য',
      ];

      const weaknesses = [
        primaryTexts.length < 2 ? 'Adding 2-3 primary text variations allows Meta algorithm to optimize delivery' : 'Consider testing video media in future',
        !hasUrgency ? 'Add time-limited phrasing to boost click-through rate' : 'Ensure landing page matches the promised offer',
      ];
      const weaknessesBn = [
        primaryTexts.length < 2 ? '২-৩টি প্রাইমারি টেক্সট অপশন দিলে মেটার এলগরিদম সবচেয়ে ভালোটি বেশি মানুষের কাছে পৌঁছায়' : 'ভবিষ্যতে ভিডিও কনটেন্ট যুক্ত করতে পারেন',
        !hasUrgency ? 'ক্লিক-থ্রু রেট বাড়াতে সীমিত সময়ের সুযোগের কথা যুক্ত করুন' : 'ল্যান্ডিং পেইজের অফার যেন বিজ্ঞাপনের সাথে হুবহু মিলে',
      ];

      const cleanHeadline = headline || 'Special Promotion';
      const cleanBody = primaryText || 'Check out our latest premium offerings!';

      parsedResult = {
        overallScore,
        hookScore,
        clarityScore,
        policyRisk,
        policyFeedback,
        policyFeedbackBn,
        strengths,
        strengthsBn,
        weaknesses,
        weaknessesBn,
        suggestedVariations: [
          {
            hookType: 'Direct Urgency & FOMO',
            headline: `⚡ সীমিত সময়ের অফার: ${cleanHeadline}`,
            primaryText: `🔥 মিস করবেন না! ${cleanBody}\n\n👉 স্টক সীমিত! অফারটি লুফে নিতে এখনই ভিজিট করুন বা অর্ডার করুন।`,
            rationale: 'Injects urgent phrasing to drive immediate click-through.',
            rationaleBn: 'সীমিত সময়ের সুযোগ গ্রাহককে দ্রুত ক্লিক করতে বাধ্য করে।'
          },
          {
            hookType: 'Social Proof & Trust',
            headline: `⭐ হাজারো সন্তুষ্ট গ্রাহকের পছন্দ: ${cleanHeadline}`,
            primaryText: `শত শত গ্রাহক আমাদের পণ্য গ্রহণ করে সন্তুষ্ট! ${cleanBody}\n\n✅ ১০০% জেনুইন কোয়ালিটি ও সহজ রিটার্ন সুবিধা।`,
            rationale: 'Overcomes hesitation and builds rapid trust.',
            rationaleBn: 'সামাজিক গ্রহণযোগ্যতা তুলে ধরে নতুন কাস্টমারের সংশয় দূর করে।'
          },
          {
            hookType: 'Benefit-Driven & Solution',
            headline: `🎁 আপনার জন্য সেরা সমাধান: ${cleanHeadline}`,
            primaryText: `আপনার কেনাকাটায় সর্বোচ্চ কোয়ালিটি এবং দারুণ সুবিধা পেতে বেছে নিন আমাদের সার্ভিস। ${cleanBody}`,
            rationale: 'Focuses directly on convenience and customer benefits.',
            rationaleBn: 'গ্রাহকের মূল সমস্যা সমাধান ও আর্থিক সাশ্রয়ের ওপর আলোকপাত করে।'
          }
        ]
      };
    }

    return {
      success: true,
      campaignName: dto.campaignName,
      ...parsedResult,
      aiResponseQuotaDeducted: 1,
    };
  }

  /**
   * Advanced Custom Campaign Launch (Ads Manager Full Pipeline):
   * Supports:
   * - Single/Multiple Primary Texts
   * - Single/Multiple Headlines
   * - Creative Source: Upload / Image URL vs. Existing Page Post (object_story_id)
   * - Detailed targeting & placements
   * - Pixel Conversion Tracking specs
   */
  async launchCustomCampaign(
    tenantId: string,
    dto: {
      adAccountId: string;
      facebookPageId?: string;
      name: string;
      objective?: string;
      dailyBudget: number;
      durationDays?: number;
      headline?: string;
      headlines?: string[];
      bodyText?: string;
      primaryTexts?: string[];
      description?: string;
      callToAction?: string;
      linkUrl?: string;
      imageUrl?: string;
      creativeSource?: 'upload' | 'existing_post';
      pagePostId?: string;
      pagePostIds?: string[];
      targeting?: {
        countries?: string[];
        ageMin?: number;
        ageMax?: number;
        genders?: number[];
        interests?: string[];
      };
      placements?: string[];
      pixelId?: string;
    },
  ) {
    if (!dto.name || !dto.dailyBudget || dto.dailyBudget <= 0) {
      throw new BadRequestException('Campaign name and a valid daily budget are required.');
    }

    const { account, token, apiVersion, formattedAdAccountId } = await this.getDecryptedTokenAndAccount(tenantId, dto.adAccountId);

    // Resolve Facebook Page ID
    let targetPageId: string | null = dto.facebookPageId || account.facebookPageId || null;
    if (!targetPageId) {
      const messengerChannel = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: 'messenger', status: 'active' },
      });
      targetPageId = messengerChannel?.externalAccountId || null;
    }
    if (!targetPageId) {
      throw new BadRequestException('No Facebook Page found. Please connect your Facebook Page in Channel Integration or Meta Ads.');
    }

    const postIds: string[] = (dto.pagePostIds && dto.pagePostIds.length > 0)
      ? dto.pagePostIds
      : (dto.pagePostId ? [dto.pagePostId] : []);
    const isExistingPost = dto.creativeSource === 'existing_post' && postIds.length > 0;

    // Primary Text & Headline resolution
    const primaryTexts = dto.primaryTexts && dto.primaryTexts.length > 0
      ? dto.primaryTexts.filter(t => t.trim().length > 0)
      : (dto.bodyText ? [dto.bodyText] : []);
    const headlines = dto.headlines && dto.headlines.length > 0
      ? dto.headlines.filter(h => h.trim().length > 0)
      : (dto.headline ? [dto.headline] : []);

    const primaryText = primaryTexts[0] || '';
    const headline = headlines[0] || (dto.name ? `${dto.name} Offer` : 'Special Offer');

    if (!isExistingPost && !primaryText) {
      throw new BadRequestException('Primary ad copy text is required when creating a new creative.');
    }

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

      // 2. Create Ad Set with targeting & manual placements support
      const countries = dto.targeting?.countries?.length ? dto.targeting.countries : ['BD'];
      const targeting: any = {
        geo_locations: { countries },
        age_min: dto.targeting?.ageMin || 18,
        age_max: dto.targeting?.ageMax || 65,
      };
      if (dto.targeting?.genders?.length) {
        targeting.genders = dto.targeting.genders;
      }
      if (dto.targeting?.interests?.length) {
        targeting.flexible_spec = [{ interests: dto.targeting.interests.map((name: string) => ({ name })) }];
      }

      // Manual Placements mapping
      if (dto.placements?.length && !dto.placements.includes('advantage_plus')) {
        const publisherPlatforms: string[] = [];
        const facebookPositions: string[] = [];
        const instagramPositions: string[] = [];
        const messengerPositions: string[] = [];

        for (const p of dto.placements) {
          if (p.includes('facebook') || p.startsWith('fb_')) {
            if (!publisherPlatforms.includes('facebook')) publisherPlatforms.push('facebook');
            if (p.includes('feed')) facebookPositions.push('feed');
            if (p.includes('story') || p.includes('stories')) facebookPositions.push('story');
            if (p.includes('reel')) facebookPositions.push('facebook_reels');
            if (p.includes('marketplace')) facebookPositions.push('marketplace');
            if (p.includes('right_column')) facebookPositions.push('right_hand_column');
          }
          if (p.includes('instagram') || p.startsWith('ig_')) {
            if (!publisherPlatforms.includes('instagram')) publisherPlatforms.push('instagram');
            if (p.includes('feed')) instagramPositions.push('stream');
            if (p.includes('story') || p.includes('stories')) instagramPositions.push('story');
            if (p.includes('reel')) instagramPositions.push('reels');
            if (p.includes('explore')) instagramPositions.push('explore');
          }
          if (p.includes('messenger') || p.startsWith('msg_')) {
            if (!publisherPlatforms.includes('messenger')) publisherPlatforms.push('messenger');
            if (p.includes('inbox') || p.includes('home')) messengerPositions.push('messenger_home');
            if (p.includes('story')) messengerPositions.push('story');
          }
          if (p.includes('audience_network')) {
            if (!publisherPlatforms.includes('audience_network')) publisherPlatforms.push('audience_network');
          }
        }

        if (publisherPlatforms.length > 0) {
          targeting.publisher_platforms = publisherPlatforms;
          if (facebookPositions.length > 0) targeting.facebook_positions = Array.from(new Set(facebookPositions));
          if (instagramPositions.length > 0) targeting.instagram_positions = Array.from(new Set(instagramPositions));
          if (messengerPositions.length > 0) targeting.messenger_positions = Array.from(new Set(messengerPositions));
          targeting.device_platforms = ['mobile', 'desktop'];
        }
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
        optimization_goal: dto.objective === 'OUTCOME_TRAFFIC'
          ? 'LINK_CLICKS'
          : (dto.objective === 'OUTCOME_LEADS' ? 'LEAD_GENERATION' : (dto.objective === 'OUTCOME_SALES' ? 'OFFSITE_CONVERSIONS' : 'POST_ENGAGEMENT')),
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: JSON.stringify(targeting),
        promoted_object: JSON.stringify({ page_id: targetPageId }),
        status: 'ACTIVE',
        start_time: now.toISOString(),
        end_time: stopTime.toISOString(),
      };

      const adSetRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/adsets`, null, {
        params: adSetPayload,
      });
      const adSetId = adSetRes.data.id;

      // 3 & 4. Create AdCreative(s) and Ad(s)
      let firstCreativeId = '';
      let firstAdId = '';
      const createdAds: any[] = [];

      if (isExistingPost) {
        // Multi-Post Creative Support: iterate through all selected posts
        for (let i = 0; i < postIds.length; i++) {
          const pid = postIds[i];
          const fullStoryId = pid.startsWith(`${targetPageId}_`)
            ? pid
            : (pid.includes('_')
                ? `${targetPageId}_${pid.slice(pid.indexOf('_') + 1)}`
                : `${targetPageId}_${pid}`);

          const creativePayload = {
            access_token: token,
            name: `${dto.name} Creative (Post ${i + 1})`,
            object_story_id: fullStoryId,
          };

          const creativeRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/adcreatives`, null, {
            params: creativePayload,
          });
          const cId = creativeRes.data.id;
          if (!firstCreativeId) firstCreativeId = cId;

          const adPayload: any = {
            access_token: token,
            name: postIds.length > 1 ? `${dto.name} Ad (${i + 1})` : `${dto.name} Ad`,
            adset_id: adSetId,
            creative: JSON.stringify({ creative_id: cId }),
            status: 'ACTIVE',
          };

          if (dto.pixelId) {
            adPayload.tracking_specs = JSON.stringify([
              { 'action.type': ['offsite_conversion'], fb_pixel: [dto.pixelId] },
            ]);
          }

          const adRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/ads`, null, {
            params: adPayload,
          });
          const aId = adRes.data.id;
          if (!firstAdId) firstAdId = aId;
          createdAds.push({ adId: aId, creativeId: cId, pagePostId: pid });
        }
      } else {
        // Standard link / image ad with multi-text support
        const creativePayload = {
          access_token: token,
          name: `${dto.name} Creative`,
          object_story_spec: JSON.stringify({
            page_id: targetPageId,
            ...(account.instagramActorId ? { instagram_actor_id: account.instagramActorId } : {}),
            link_data: {
              message: primaryText,
              name: headline,
              description: dto.description || undefined,
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
        firstCreativeId = creativeRes.data.id;

        const adPayload: any = {
          access_token: token,
          name: `${dto.name} Ad`,
          adset_id: adSetId,
          creative: JSON.stringify({ creative_id: firstCreativeId }),
          status: 'ACTIVE',
        };

        if (dto.pixelId) {
          adPayload.tracking_specs = JSON.stringify([
            { 'action.type': ['offsite_conversion'], fb_pixel: [dto.pixelId] },
          ]);
        }

        const adRes = await axios.post(`https://graph.facebook.com/${apiVersion}/${formattedAdAccountId}/ads`, null, {
          params: adPayload,
        });
        firstAdId = adRes.data.id;
        createdAds.push({ adId: firstAdId, creativeId: firstCreativeId });
      }

      return {
        success: true,
        campaignId,
        adSetId,
        creativeId: firstCreativeId,
        adId: firstAdId,
        createdAds,
        creativeSource: isExistingPost ? 'existing_post' : 'upload',
        creativesCount: isExistingPost ? postIds.length : 1,
        dailyBudget: dto.dailyBudget,
        durationDays,
        headline,
        primaryTextsCount: primaryTexts.length,
      };
    } catch (error: any) {
      this.logger.error('Error launching custom campaign:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to launch custom ad campaign on Meta');
    }
  }
}



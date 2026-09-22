import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';
import axios from 'axios';

@Injectable()
export class McpAdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly marketingConfig: MetaMarketingConfigService,
  ) {}

  private async getDecryptedTokenAndAccount(tenantId: string, adAccountId: string) {
    const config = await this.marketingConfig.getConfig();
    if (!config.isEnabled) {
      throw new ForbiddenException('Meta Marketing API is currently disabled platform-wide.');
    }

    const account = await this.prisma.tenantMetaAdAccount.findFirst({
      where: {
        tenantId,
        adAccountId,
        status: 'active',
      },
    });

    if (!account) {
      throw new NotFoundException(`Ad account ${adAccountId} not found or inactive for this tenant.`);
    }

    const decryptedToken = this.crypto.decrypt(account.accessToken);
    const apiVersion = config.apiVersion || 'v21.0';
    // Meta ad account IDs require 'act_' prefix if not already prefixed
    const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

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
}


import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { FeatureRolloutService } from '../feature-rollout/feature-rollout.service';
import { QuotaService } from '../tenants/quota.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

const DEFAULT_EVENT_DEFINITIONS = [
  {
    eventName: 'Purchase',
    isEnabled: true,
    sourceOrderCompleted: true,
    sourceInboxAiIntent: true,
    sourceLeadCreated: false,
    sourceWidgetForm: false,
    sourceExternalWebhook: true,
    includeValue: true,
    includeCurrency: true,
    includeOrderId: true,
    includeUserData: true,
  },
  {
    eventName: 'Lead',
    isEnabled: true,
    sourceOrderCompleted: false,
    sourceInboxAiIntent: false,
    sourceLeadCreated: true,
    sourceWidgetForm: true,
    sourceExternalWebhook: true,
    includeValue: false,
    includeCurrency: false,
    includeOrderId: false,
    includeUserData: true,
  },
  {
    eventName: 'Contact',
    isEnabled: true,
    sourceOrderCompleted: false,
    sourceInboxAiIntent: true,
    sourceLeadCreated: false,
    sourceWidgetForm: true,
    sourceExternalWebhook: true,
    includeValue: false,
    includeCurrency: false,
    includeOrderId: false,
    includeUserData: true,
  },
  {
    eventName: 'InitiateCheckout',
    isEnabled: true,
    sourceOrderCompleted: false,
    sourceInboxAiIntent: true,
    sourceLeadCreated: false,
    sourceWidgetForm: false,
    sourceExternalWebhook: true,
    includeValue: true,
    includeCurrency: true,
    includeOrderId: false,
    includeUserData: true,
  },
  {
    eventName: 'AddToCart',
    isEnabled: true,
    sourceOrderCompleted: false,
    sourceInboxAiIntent: true,
    sourceLeadCreated: false,
    sourceWidgetForm: false,
    sourceExternalWebhook: true,
    includeValue: true,
    includeCurrency: true,
    includeOrderId: false,
    includeUserData: false,
  },
  {
    eventName: 'ViewContent',
    isEnabled: true,
    sourceOrderCompleted: false,
    sourceInboxAiIntent: true,
    sourceLeadCreated: false,
    sourceWidgetForm: true,
    sourceExternalWebhook: true,
    includeValue: false,
    includeCurrency: false,
    includeOrderId: false,
    includeUserData: false,
  },
];

@Injectable()
export class CapiHubService {
  private readonly logger = new Logger(CapiHubService.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private featureRollout: FeatureRolloutService,
    private quotaService: QuotaService,
    @InjectQueue('capi-events') private capiQueue: Queue
  ) {}

  async createOrUpdateIntegration(tenantId: string, data: {
    pixelId: string;
    accessToken: string;
    datasetId?: string;
    testEventCode?: string;
  }) {
    await this.quotaService.checkActiveSubscription(tenantId, 'CAPI Hub');
    const isEnabled = await this.featureRollout.isFeatureEnabled(tenantId, 'capi_hub');
    if (!isEnabled) throw new ForbiddenException('CAPI Hub feature is not enabled for this tenant');

    const encryptedToken = this.cryptoService.encrypt(data.accessToken);

    const existing = await this.prisma.tenantCapiIntegration.findUnique({ where: { tenantId } });

    let integration: any;
    let unhashedWebhookSecret: string | undefined;

    if (existing) {
      integration = await this.prisma.tenantCapiIntegration.update({
        where: { tenantId },
        data: {
          pixelId: data.pixelId,
          accessToken: encryptedToken,
          datasetId: data.datasetId,
          testEventCode: data.testEventCode,
          isActive: true,
        },
      });
    } else {
      const webhookSecret = crypto.randomBytes(32).toString('hex');
      const hashedSecret = await bcrypt.hash(webhookSecret, 10);
      unhashedWebhookSecret = webhookSecret;
      
      integration = await this.prisma.tenantCapiIntegration.create({
        data: {
          tenantId,
          pixelId: data.pixelId,
          accessToken: encryptedToken,
          datasetId: data.datasetId,
          testEventCode: data.testEventCode,
          webhookSecret: hashedSecret,
          isActive: true,
        },
      });
    }

    // Auto-initialize standard event configs with enabled defaults so tracking begins with ZERO manual friction
    await this.initializeDefaultEventConfigs(tenantId, integration.id);

    return unhashedWebhookSecret 
      ? { ...integration, unhashedWebhookSecret }
      : integration;
  }

  private async initializeDefaultEventConfigs(tenantId: string, integrationId: string) {
    try {
      const existingConfigs = await this.prisma.tenantCapiEventConfig.findMany({ where: { tenantId } });
      const missingDefs = DEFAULT_EVENT_DEFINITIONS.filter(
        def => !existingConfigs.some(c => c.eventName === def.eventName)
      );

      if (missingDefs.length > 0) {
        await this.prisma.tenantCapiEventConfig.createMany({
          data: missingDefs.map(def => ({
            tenantId,
            integrationId,
            ...def,
          })),
          skipDuplicates: true,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to auto-initialize CAPI event configs for tenant ${tenantId}: ${err.message}`);
    }
  }

  async getIntegration(tenantId: string) {
    const integration = await this.prisma.tenantCapiIntegration.findUnique({
      where: { tenantId },
    });
    if (integration) {
      // Don't return access token back to frontend
      (integration as any).accessToken = '********';
      (integration as any).webhookSecret = '********';
    }
    return integration;
  }

  async getEventConfigs(tenantId: string) {
    const integration = await this.prisma.tenantCapiIntegration.findUnique({ where: { tenantId } });
    if (!integration) {
      // Gracefully return empty list if integration not yet saved to prevent frontend crash
      return [];
    }
    
    // Auto-create defaults if missing
    await this.initializeDefaultEventConfigs(tenantId, integration.id);
    return this.prisma.tenantCapiEventConfig.findMany({ 
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async updateEventConfig(tenantId: string, eventName: string, data: any) {
    await this.quotaService.checkActiveSubscription(tenantId, 'CAPI Hub');
    const integration = await this.prisma.tenantCapiIntegration.findUnique({ where: { tenantId } });
    if (!integration) throw new NotFoundException('CAPI integration not found');

    return this.prisma.tenantCapiEventConfig.upsert({
      where: { tenantId_eventName: { tenantId, eventName } },
      create: {
        tenantId,
        integrationId: integration.id,
        eventName,
        isEnabled: data.isEnabled ?? true,
        sourceInboxAiIntent: data.sourceInboxAiIntent ?? false,
        sourceOrderCompleted: data.sourceOrderCompleted ?? false,
        sourceLeadCreated: data.sourceLeadCreated ?? false,
        sourceWidgetForm: data.sourceWidgetForm ?? false,
        sourceExternalWebhook: data.sourceExternalWebhook ?? true,
        includeValue: data.includeValue ?? true,
        includeCurrency: data.includeCurrency ?? true,
        includeOrderId: data.includeOrderId ?? false,
        includeUserData: data.includeUserData ?? true,
        ...data,
      },
      update: data,
    });
  }

  async sendTestEvent(tenantId: string, testEventCodeOverride?: string) {
    await this.quotaService.checkActiveSubscription(tenantId, 'CAPI Hub');
    const isEnabled = await this.featureRollout.isFeatureEnabled(tenantId, 'capi_hub');
    if (!isEnabled) throw new ForbiddenException('CAPI Hub feature is not enabled for this tenant');

    const integration = await this.prisma.tenantCapiIntegration.findUnique({ where: { tenantId } });
    if (!integration || !integration.isActive) {
      throw new NotFoundException('No active CAPI integration found. Please enter Pixel ID & Access Token first.');
    }

    const testEventCode = testEventCodeOverride || integration.testEventCode || undefined;
    const eventId = `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const nowUnix = Math.floor(Date.now() / 1000);

    const testPayload = {
      data: [
        {
          event_name: 'TestServerEvent',
          event_time: nowUnix,
          event_id: eventId,
          event_source_url: 'https://zinichat.com/dashboard/settings/capi-hub',
          action_source: 'system_generated',
          user_data: {
            em: crypto.createHash('sha256').update('test_merchant@zinichat.com').digest('hex'),
            ph: crypto.createHash('sha256').update('8801700000000').digest('hex'),
          },
          custom_data: {
            currency: 'BDT',
            value: 100,
            test_note: 'Verified from ZiniChat CAPI Hub 1-Click Verification Ping',
          },
        },
      ],
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    };

    const log = await this.prisma.capiEventLog.create({
      data: {
        tenantId,
        integrationId: integration.id,
        eventName: 'TestServerEvent',
        eventId,
        source: 'test_ping',
        status: 'pending',
      },
    });

    const decryptedToken = this.cryptoService.decrypt(integration.accessToken);

    try {
      const url = `https://graph.facebook.com/v19.0/${integration.pixelId}/events?access_token=${decryptedToken}`;
      const response = await axios.post(url, testPayload);

      await this.prisma.capiEventLog.update({
        where: { id: log.id },
        data: {
          status: 'sent',
          responseCode: response.status,
        },
      });

      return {
        success: true,
        eventId,
        responseCode: response.status,
        data: response.data,
        message: 'Test event successfully dispatched and acknowledged by Meta Conversions API',
      };
    } catch (err: any) {
      const responseCode = err.response?.status;
      const errorMessage = err.response?.data?.error?.message || err.message;

      await this.prisma.capiEventLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          responseCode: responseCode || 500,
          errorMessage,
        },
      });

      throw new Error(`Meta Conversions API Error: ${errorMessage}`);
    }
  }

  async fireEvent(tenantId: string, eventName: string, payload: any, source: string) {
    // 1. Check feature flag & subscription active status
    const isEnabled = await this.featureRollout.isFeatureEnabled(tenantId, 'capi_hub');
    if (!isEnabled) return;

    const subCheck = await this.quotaService.isTenantSubscriptionActive(tenantId);
    if (!subCheck.isActive) {
      this.logger.warn(`Skipping CAPI event '${eventName}' for tenant ${tenantId}: Subscription expired or inactive.`);
      return;
    }

    // 2. Check integration
    const integration = await this.prisma.tenantCapiIntegration.findUnique({ where: { tenantId } });
    if (!integration || !integration.isActive) return;

    // 3. Check event config
    const config = await this.prisma.tenantCapiEventConfig.findUnique({
      where: { tenantId_eventName: { tenantId, eventName } }
    });
    if (!config || !config.isEnabled) return;

    // Source filtering based on config
    if (source === 'inbox_ai' && !config.sourceInboxAiIntent) return;
    if (source === 'order' && !config.sourceOrderCompleted) return;
    if (source === 'lead' && !config.sourceLeadCreated) return;
    if (source === 'widget' && !config.sourceWidgetForm) return;
    if (source === 'webhook' && config.sourceExternalWebhook === false) return;

    const eventId = payload.event_id || crypto.randomUUID();

    // 4. Hash user data (email, phone, etc.)
    const hashedUserData = this.hashUserData(payload.user_data);
    
    const capiPayload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: payload.event_source_url,
          action_source: payload.action_source || 'system_generated',
          user_data: config.includeUserData ? hashedUserData : {},
          custom_data: {
            ...(config.includeValue ? { value: payload.custom_data?.value } : {}),
            ...(config.includeCurrency ? { currency: payload.custom_data?.currency } : {}),
            ...(config.includeOrderId ? { order_id: payload.custom_data?.order_id } : {}),
            ...(config.includeContentIds ? { content_ids: payload.custom_data?.content_ids } : {})
          }
        }
      ],
      test_event_code: integration.testEventCode
    };

    // 5. Create Event Log as 'pending' (or enqueue to bullmq)
    const log = await this.prisma.capiEventLog.create({
      data: {
        tenantId,
        integrationId: integration.id,
        eventName,
        eventId,
        source,
        status: 'pending'
      }
    });

    // 6. Enqueue BullMQ
    await this.capiQueue.add('send-capi-event', {
      logId: log.id,
      tenantId,
      pixelId: integration.pixelId,
      accessToken: this.cryptoService.decrypt(integration.accessToken),
      payload: capiPayload
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
  }

  private hashUserData(userData: any) {
    if (!userData) return {};
    const hashed: any = { ...userData };
    
    // Hash fields that Meta requires to be SHA256 hashed
    const fieldsToHash = ['em', 'ph', 'fn', 'ln', 'ge', 'db', 'ct', 'st', 'zp', 'country'];
    for (const field of fieldsToHash) {
      if (hashed[field]) {
        if (typeof hashed[field] === 'string') {
          hashed[field] = this.hashSingleField(field, hashed[field]);
        } else if (Array.isArray(hashed[field])) {
          hashed[field] = hashed[field].map((val: any) => 
            typeof val === 'string' ? this.hashSingleField(field, val) : val
          );
        }
      }
    }
    return hashed;
  }

  private hashSingleField(field: string, rawVal: string): string {
    let val = rawVal.trim().toLowerCase();
    if (field === 'ph') {
      // E.164 normalization before SHA256 hashing
      const digits = val.replace(/\D/g, '');
      if (digits.startsWith('01') && digits.length === 11) {
        val = '88' + digits; // Bangladesh E.164
      } else if (digits.length > 0) {
        val = digits;
      }
    } else if (field === 'em') {
      val = val.replace(/\s+/g, '');
    }
    return crypto.createHash('sha256').update(val).digest('hex');
  }

  async getEventLogs(tenantId: string) {
    return this.prisma.capiEventLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  /**
   * Auto-discovers Meta Pixels from connected Meta Ad Accounts or Facebook Page channels.
   * Completely eliminates the hassle of manually copying/pasting Pixel IDs or Access Tokens.
   */
  async getDiscoveredPixels(tenantId: string) {
    const isEnabled = await this.featureRollout.isFeatureEnabled(tenantId, 'capi_hub');
    if (!isEnabled) throw new ForbiddenException('CAPI Hub feature is not enabled for this tenant');

    const adAccounts = await this.prisma.tenantMetaAdAccount.findMany({
      where: { tenantId, status: 'active' },
    });

    const messengerChannel = await this.prisma.channelConnection.findFirst({
      where: {
        tenantId,
        channelType: { in: ['messenger', 'instagram'] },
        status: 'active',
      },
    });

    if (adAccounts.length === 0 && !messengerChannel) {
      return {
        isMetaConnected: false,
        connectedAccounts: [],
        pixels: [],
        message: 'No Meta Ad Account or Facebook Page connected yet.',
      };
    }

    const allPixels: Array<{
      id: string;
      name: string;
      isUnavailable?: boolean;
      creationTime?: string;
      lastFiredTime?: string;
      adAccountId?: string;
      adAccountName?: string;
    }> = [];

    // 1. Fetch pixels from all active Meta Ad Accounts
    for (const acc of adAccounts) {
      try {
        const decryptedToken = this.cryptoService.decrypt(acc.accessToken);
        const cleanId = acc.adAccountId.startsWith('act_') ? acc.adAccountId : `act_${acc.adAccountId}`;

        const response = await axios.get(`https://graph.facebook.com/v21.0/${cleanId}/adspixels`, {
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

    // Deduplicate by pixel ID
    const uniquePixels = Array.from(new Map(allPixels.map(p => [p.id, p])).values());

    return {
      isMetaConnected: true,
      connectedAccounts: adAccounts.map(a => ({ adAccountId: a.adAccountId, name: a.adAccountName })),
      hasFacebookPage: Boolean(messengerChannel),
      facebookPageName: messengerChannel?.displayName,
      pixels: uniquePixels,
    };
  }

  /**
   * 1-Click Connect a Discovered Meta Pixel:
   * Uses the already-authenticated Meta OAuth token from tenantMetaAdAccount or channelConnection.
   * Merchant does not have to copy or paste tokens!
   */
  async connectDiscoveredPixel(
    tenantId: string,
    data: { pixelId: string; adAccountId?: string; testEventCode?: string },
  ) {
    if (!data.pixelId) {
      throw new BadRequestException('pixelId is required');
    }

    let tokenToUse: string | null = null;

    if (data.adAccountId) {
      const acc = await this.prisma.tenantMetaAdAccount.findFirst({
        where: { tenantId, adAccountId: data.adAccountId, status: 'active' },
      });
      if (acc) tokenToUse = this.cryptoService.decrypt(acc.accessToken);
    }

    if (!tokenToUse) {
      const firstAcc = await this.prisma.tenantMetaAdAccount.findFirst({
        where: { tenantId, status: 'active' },
      });
      if (firstAcc) tokenToUse = this.cryptoService.decrypt(firstAcc.accessToken);
    }

    if (!tokenToUse) {
      const channel = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: 'messenger', status: 'active' },
      });
      if (channel?.accessTokenEncrypted) {
        tokenToUse = this.cryptoService.decrypt(channel.accessTokenEncrypted);
      }
    }

    if (!tokenToUse) {
      throw new BadRequestException('No active Meta authorization token found. Please connect your Meta Ad Account or Facebook Page first.');
    }

    return this.createOrUpdateIntegration(tenantId, {
      pixelId: data.pixelId.trim(),
      accessToken: tokenToUse,
      testEventCode: data.testEventCode?.trim(),
    });
  }
}

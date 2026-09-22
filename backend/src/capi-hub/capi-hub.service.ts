import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { FeatureRolloutService } from '../feature-rollout/feature-rollout.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CapiHubService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private featureRollout: FeatureRolloutService,
    @InjectQueue('capi-events') private capiQueue: Queue
  ) {}

  async createOrUpdateIntegration(tenantId: string, data: {
    pixelId: string;
    accessToken: string;
    datasetId?: string;
    testEventCode?: string;
  }) {
    const isEnabled = await this.featureRollout.isFeatureEnabled('capi_hub', tenantId);
    if (!isEnabled) throw new ForbiddenException('CAPI Hub feature is not enabled for this tenant');

    const encryptedToken = this.cryptoService.encrypt(data.accessToken);

    const existing = await this.prisma.tenantCapiIntegration.findUnique({ where: { tenantId } });

    if (existing) {
      return this.prisma.tenantCapiIntegration.update({
        where: { tenantId },
        data: {
          pixelId: data.pixelId,
          accessToken: encryptedToken,
          datasetId: data.datasetId,
          testEventCode: data.testEventCode,
        },
      });
    } else {
      const webhookSecret = crypto.randomBytes(32).toString('hex');
      const hashedSecret = await bcrypt.hash(webhookSecret, 10);
      
      const integration = await this.prisma.tenantCapiIntegration.create({
        data: {
          tenantId,
          pixelId: data.pixelId,
          accessToken: encryptedToken,
          datasetId: data.datasetId,
          testEventCode: data.testEventCode,
          webhookSecret: hashedSecret,
        },
      });
      // Return unhashed secret once to the user
      return { ...integration, unhashedWebhookSecret: webhookSecret };
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
    if (!integration) throw new NotFoundException('CAPI integration not found');
    
    // Auto-create defaults if missing
    const defaultEvents = ['Purchase', 'Lead', 'ViewContent', 'InitiateCheckout'];
    const configs = await this.prisma.tenantCapiEventConfig.findMany({ where: { tenantId } });
    
    const missing = defaultEvents.filter(name => !configs.some(c => c.eventName === name));
    if (missing.length > 0) {
      await this.prisma.tenantCapiEventConfig.createMany({
        data: missing.map(eventName => ({
          tenantId,
          integrationId: integration.id,
          eventName,
        })),
        skipDuplicates: true
      });
      return this.prisma.tenantCapiEventConfig.findMany({ where: { tenantId } });
    }
    return configs;
  }

  async updateEventConfig(tenantId: string, eventName: string, data: any) {
    return this.prisma.tenantCapiEventConfig.update({
      where: { tenantId_eventName: { tenantId, eventName } },
      data,
    });
  }

  async fireEvent(tenantId: string, eventName: string, payload: any, source: string) {
    // 1. Check feature flag
    const isEnabled = await this.featureRollout.isFeatureEnabled('capi_hub', tenantId);
    if (!isEnabled) return;

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
      if (hashed[field] && typeof hashed[field] === 'string') {
        const val = hashed[field].trim().toLowerCase();
        hashed[field] = crypto.createHash('sha256').update(val).digest('hex');
      }
    }
    return hashed;
  }

  async getEventLogs(tenantId: string) {
    return this.prisma.capiEventLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }
}

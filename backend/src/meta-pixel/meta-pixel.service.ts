import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class MetaPixelService {
  private readonly logger = new Logger(MetaPixelService.name);

  constructor(private prisma: PrismaService) {}

  // Cryptographic utilities using AES-256-CBC
  private getEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'zinichat-meta-pixel-default-32B-key';
    return crypto.createHash('sha256').update(secret).digest();
  }

  encrypt(text: string | null | undefined): string {
    if (!text) return '';
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (err) {
      this.logger.error(`Encryption error: ${err.message}`);
      return text;
    }
  }

  decrypt(text: string | null | undefined): string {
    if (!text) return '';
    if (!text.includes(':')) return text; // return as-is if not encrypted format
    try {
      const [ivHex, encryptedText] = text.split(':');
      if (!ivHex || !encryptedText) return text;
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      this.logger.error(`Decryption error: ${err.message}`);
      return text;
    }
  }

  hashPii(value: string | null | undefined): string {
    if (!value) return '';
    const normalized = value.trim().toLowerCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  async getPixelConfig() {
    let config = await this.prisma.metaPixelConfig.findFirst();
    if (!config) {
      config = await this.prisma.metaPixelConfig.create({
        data: {
          pixelId: null,
          pixelAccessToken: null,
          isActive: false,
          isCapiEnabled: false,
          capiAccessToken: null,
          datasetId: null,
          trackPageView: true,
          trackSignup: true,
          trackCompleteReg: true,
          trackLogin: true,
        },
      });
    }
    return config;
  }

  async savePixelConfig(data: {
    pixelId?: string;
    pixelAccessToken?: string;
    isActive?: boolean;
    isCapiEnabled?: boolean;
    capiAccessToken?: string;
    datasetId?: string;
    trackPageView?: boolean;
    trackSignup?: boolean;
    trackCompleteReg?: boolean;
    trackLogin?: boolean;
  }) {
    const existing = await this.prisma.metaPixelConfig.findFirst();

    const encryptedPixelToken = data.pixelAccessToken ? this.encrypt(data.pixelAccessToken) : existing?.pixelAccessToken;
    const encryptedCapiToken = data.capiAccessToken ? this.encrypt(data.capiAccessToken) : existing?.capiAccessToken;

    const payload = {
      pixelId: data.pixelId ?? existing?.pixelId ?? null,
      pixelAccessToken: encryptedPixelToken ?? null,
      isActive: data.isActive ?? existing?.isActive ?? false,
      isCapiEnabled: data.isCapiEnabled ?? existing?.isCapiEnabled ?? false,
      capiAccessToken: encryptedCapiToken ?? null,
      datasetId: data.datasetId ?? existing?.datasetId ?? null,
      trackPageView: data.trackPageView ?? existing?.trackPageView ?? true,
      trackSignup: data.trackSignup ?? existing?.trackSignup ?? true,
      trackCompleteReg: data.trackCompleteReg ?? existing?.trackCompleteReg ?? true,
      trackLogin: data.trackLogin ?? existing?.trackLogin ?? true,
      setupCompletedAt: new Date(),
    };

    if (existing) {
      return this.prisma.metaPixelConfig.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      return this.prisma.metaPixelConfig.create({
        data: payload,
      });
    }
  }

  async testPixelConnection(): Promise<{ success: boolean; pixelId: string; message: string }> {
    const config = await this.getPixelConfig();
    if (!config.pixelId || !config.pixelAccessToken) {
      return {
        success: false,
        pixelId: config.pixelId || '',
        message: 'Pixel ID or Access Token is missing',
      };
    }

    const decryptedToken = this.decrypt(config.pixelAccessToken);
    try {
      const url = `https://graph.facebook.com/v18.0/${config.pixelId}?access_token=${decryptedToken}`;
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok && !result.error) {
        await this.prisma.metaPixelConfig.update({
          where: { id: config.id },
          data: { lastTestedAt: new Date() },
        });
        return {
          success: true,
          pixelId: config.pixelId,
          message: `Successfully connected to Meta Pixel (${result.name || config.pixelId})`,
        };
      } else {
        return {
          success: false,
          pixelId: config.pixelId,
          message: result.error?.message || 'Meta Pixel verification failed',
        };
      }
    } catch (err) {
      return {
        success: false,
        pixelId: config.pixelId,
        message: `Network/API Error: ${err.message}`,
      };
    }
  }

  async testCapiConnection(): Promise<{ success: boolean; datasetId: string; message: string }> {
    const config = await this.getPixelConfig();
    const targetId = config.datasetId || config.pixelId;
    const rawToken = config.capiAccessToken || config.pixelAccessToken;

    if (!targetId || !rawToken) {
      return {
        success: false,
        datasetId: targetId || '',
        message: 'CAPI Dataset ID/Pixel ID or Access Token missing',
      };
    }

    const decryptedToken = this.decrypt(rawToken);
    try {
      const url = `https://graph.facebook.com/v18.0/${targetId}/events?access_token=${decryptedToken}`;
      const payload = {
        data: [
          {
            event_name: 'TestEvent',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            user_data: {
              em: [this.hashPii('test@zinichat.com')],
            },
          },
        ],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok && !result.error) {
        await this.prisma.metaPixelConfig.update({
          where: { id: config.id },
          data: { lastTestedAt: new Date() },
        });
        return {
          success: true,
          datasetId: targetId,
          message: 'CAPI Test event sent successfully to Meta',
        };
      } else {
        return {
          success: false,
          datasetId: targetId,
          message: result.error?.message || 'CAPI Test event failed',
        };
      }
    } catch (err) {
      return {
        success: false,
        datasetId: targetId,
        message: `Network Error: ${err.message}`,
      };
    }
  }

  async sendEventToMeta(eventName: string, eventData: any): Promise<boolean> {
    const config = await this.getPixelConfig();
    if (!config.isActive || !config.isCapiEnabled) {
      this.logger.log('Meta Pixel or CAPI tracking disabled in config');
      return false;
    }

    const targetId = config.datasetId || config.pixelId;
    const rawToken = config.capiAccessToken || config.pixelAccessToken;

    if (!targetId || !rawToken) {
      this.logger.warn('Meta Pixel ID or Token missing for event dispatch');
      return false;
    }

    const decryptedToken = this.decrypt(rawToken);
    try {
      const url = `https://graph.facebook.com/v18.0/${targetId}/events?access_token=${decryptedToken}`;
      
      const userData: any = {};
      if (eventData.tenantEmail) {
        userData.em = [this.hashPii(eventData.tenantEmail)];
      }
      if (eventData.fbClickId) {
        userData.fbc = eventData.fbClickId;
      }
      if (eventData.fbPageId) {
        userData.fbp = eventData.fbPageId;
      }

      const eventPayload: any = {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: eventData.eventSourceUrl || 'https://zinichat.com',
        user_data: userData,
        custom_data: eventData.customData || {},
      };

      if (eventData.metaEventId) {
        eventPayload.event_id = eventData.metaEventId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [eventPayload] }),
      });

      const resJson = await response.json();
      if (response.ok && !resJson.error) {
        return true;
      } else {
        this.logger.error(`Meta API Error dispatching ${eventName}: ${JSON.stringify(resJson)}`);
        return false;
      }
    } catch (err) {
      this.logger.error(`Network Exception dispatching Meta event ${eventName}: ${err.message}`);
      return false;
    }
  }

  async logAcquisitionEvent(data: {
    tenantId?: string;
    tenantEmail?: string;
    eventName: string;
    eventData: any;
    status?: string;
    sentToMeta?: boolean;
    metaEventId?: string;
    fbClickId?: string;
    fbPageId?: string;
  }) {
    return this.prisma.tenantAcquisitionEvent.create({
      data: {
        tenantId: data.tenantId || null,
        tenantEmail: data.tenantEmail || null,
        eventName: data.eventName,
        eventData: data.eventData || {},
        status: data.status || 'pending',
        sentToMeta: data.sentToMeta || false,
        metaEventId: data.metaEventId || null,
        fbClickId: data.fbClickId || null,
        fbPageId: data.fbPageId || null,
      },
    });
  }

  async getStatsLast24h() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const events = await this.prisma.tenantAcquisitionEvent.findMany({
      where: {
        createdAt: { gte: last24h },
      },
    });

    let pageViews = 0;
    let signups = 0;
    let registrations = 0;
    let logins = 0;

    for (const ev of events) {
      if (ev.eventName === 'PageView') pageViews++;
      else if (ev.eventName === 'SignUp' || ev.eventName === 'Lead') signups++;
      else if (ev.eventName === 'CompleteRegistration') registrations++;
      else if (ev.eventName === 'Login' || ev.eventName === 'Purchase') logins++;
    }

    const conversionRate = pageViews > 0 ? parseFloat(((logins / pageViews) * 100).toFixed(2)) : 0;

    return {
      pageViews,
      signups,
      registrations,
      logins,
      conversionRate,
    };
  }

  async getEventLogs(limit = 50, offset = 0, eventName?: string, search?: string) {
    const where: any = {};
    if (eventName) {
      where.eventName = eventName;
    }
    if (search) {
      where.OR = [
        { tenantEmail: { contains: search, mode: 'insensitive' } },
        { metaEventId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      this.prisma.tenantAcquisitionEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.prisma.tenantAcquisitionEvent.count({ where }),
    ]);

    const page = Math.floor(offset / limit) + 1;

    return {
      events,
      total,
      page,
      limit,
    };
  }

  async resetPixelConfig() {
    const config = await this.prisma.metaPixelConfig.findFirst();
    if (config) {
      await this.prisma.metaPixelConfig.delete({
        where: { id: config.id },
      });
    }
  }
}

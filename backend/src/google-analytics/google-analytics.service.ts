import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class GoogleAnalyticsService {
  private readonly logger = new Logger(GoogleAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  private getEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'zinichat-ga-default-32B-key-secret';
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
    if (!text.includes(':')) return text;
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

  async getConfig() {
    let config = await this.prisma.googleAnalyticsConfig.findFirst();
    if (!config) {
      config = await this.prisma.googleAnalyticsConfig.create({
        data: {
          measurementId: null,
          apiSecret: null,
          isActive: false,
          trackPageView: true,
          trackSignup: true,
          trackCompleteReg: true,
          trackLogin: true,
        },
      });
    }
    return config;
  }

  async saveConfig(data: {
    measurementId?: string;
    apiSecret?: string;
    isActive?: boolean;
    trackPageView?: boolean;
    trackSignup?: boolean;
    trackCompleteReg?: boolean;
    trackLogin?: boolean;
  }) {
    const existing = await this.prisma.googleAnalyticsConfig.findFirst();

    const encryptedSecret = data.apiSecret ? this.encrypt(data.apiSecret) : existing?.apiSecret;

    const payload = {
      measurementId: data.measurementId ?? existing?.measurementId ?? null,
      apiSecret: encryptedSecret ?? null,
      isActive: data.isActive ?? existing?.isActive ?? false,
      trackPageView: data.trackPageView ?? existing?.trackPageView ?? true,
      trackSignup: data.trackSignup ?? existing?.trackSignup ?? true,
      trackCompleteReg: data.trackCompleteReg ?? existing?.trackCompleteReg ?? true,
      trackLogin: data.trackLogin ?? existing?.trackLogin ?? true,
      setupCompletedAt: new Date(),
    };

    if (existing) {
      return this.prisma.googleAnalyticsConfig.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      return this.prisma.googleAnalyticsConfig.create({
        data: payload,
      });
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig();
    if (!config.measurementId) {
      return { success: false, message: 'Measurement ID (G-XXXXXXXXXX) is required.' };
    }
    if (!config.apiSecret) {
      return { success: false, message: 'API Secret is required.' };
    }

    const rawSecret = this.decrypt(config.apiSecret);
    const testClientId = 'zinichat_test_' + Date.now();

    try {
      // Use Google Analytics Measurement Protocol Debug endpoint for validation
      const url = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${encodeURIComponent(
        config.measurementId,
      )}&api_secret=${encodeURIComponent(rawSecret)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: testClientId,
          events: [
            {
              name: 'test_connection',
              params: {
                source: 'zinichat_backend',
                timestamp: new Date().toISOString(),
              },
            },
          ],
        }),
      });

      const responseData = await response.json().catch(() => ({}));
      const validationMessages = responseData?.validationMessages || [];

      if (response.status === 200 && validationMessages.length === 0) {
        await this.prisma.googleAnalyticsConfig.update({
          where: { id: config.id },
          data: {
            lastTestedAt: new Date(),
            testResult: 'success',
          },
        });
        return { success: true, message: 'Google Analytics Measurement Protocol connection successful!' };
      } else if (response.status === 200 && validationMessages.length > 0) {
        const errorDetails = validationMessages.map((m: any) => m.description || m.validationCode).join(', ');
        await this.prisma.googleAnalyticsConfig.update({
          where: { id: config.id },
          data: {
            lastTestedAt: new Date(),
            testResult: `failed: ${errorDetails}`,
          },
        });
        return { success: false, message: `GA Measurement Protocol Validation Warning: ${errorDetails}` };
      }

      await this.prisma.googleAnalyticsConfig.update({
        where: { id: config.id },
        data: {
          lastTestedAt: new Date(),
          testResult: `failed: HTTP ${response.status}`,
        },
      });
      return { success: false, message: `Connection failed with HTTP ${response.status}` };
    } catch (err: any) {
      const errMsg = err.message || 'Unknown network error';
      await this.prisma.googleAnalyticsConfig.update({
        where: { id: config.id },
        data: {
          lastTestedAt: new Date(),
          testResult: `failed: ${errMsg}`,
        },
      });
      return { success: false, message: `Google Analytics test failed: ${errMsg}` };
    }
  }

  async sendEventToGA(data: {
    eventName: string;
    eventParams?: Record<string, any>;
    tenantId?: string;
    tenantEmail?: string;
    clientId?: string;
  }): Promise<boolean> {
    const config = await this.getConfig();
    if (!config.isActive || !config.measurementId || !config.apiSecret) {
      this.logger.debug('Google Analytics is not active or unconfigured. Skipping event.');
      return false;
    }

    const rawSecret = this.decrypt(config.apiSecret);
    const clientId = data.clientId || data.tenantId || 'zinichat_anon_' + Date.now();

    const payload = {
      client_id: clientId,
      events: [
        {
          name: data.eventName,
          params: {
            engagement_time_msec: '100',
            session_id: Date.now().toString(),
            ...(data.eventParams || {}),
          },
        },
      ],
    };

    let logEntry;
    try {
      logEntry = await this.prisma.googleAnalyticsEvent.create({
        data: {
          tenantId: data.tenantId || null,
          tenantEmail: data.tenantEmail || null,
          eventName: data.eventName,
          eventParams: data.eventParams || {},
          status: 'pending',
          sentToGA: false,
        },
      });
    } catch (err) {
      this.logger.warn(`Could not log initial GA event: ${err.message}`);
    }

    try {
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
        config.measurementId,
      )}&api_secret=${encodeURIComponent(rawSecret)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const isSuccess = response.status === 200 || response.status === 204;

      if (logEntry) {
        await this.prisma.googleAnalyticsEvent.update({
          where: { id: logEntry.id },
          data: {
            status: isSuccess ? 'sent' : 'failed',
            sentToGA: isSuccess,
            responseStatus: response.status,
          },
        });
      }

      return isSuccess;
    } catch (err: any) {
      const errMsg = err.message;
      this.logger.error(`Failed to send GA Measurement Protocol event (${data.eventName}): ${errMsg}`);

      if (logEntry) {
        await this.prisma.googleAnalyticsEvent.update({
          where: { id: logEntry.id },
          data: {
            status: 'failed',
            sentToGA: false,
            errorMessage: errMsg,
            responseStatus: 500,
          },
        });
      }

      return false;
    }
  }

  async getStatsLast24h() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, sent, failed, pageViews, signups, completeRegs, purchases] = await Promise.all([
      this.prisma.googleAnalyticsEvent.count({ where: { createdAt: { gte: since } } }),
      this.prisma.googleAnalyticsEvent.count({ where: { createdAt: { gte: since }, status: 'sent' } }),
      this.prisma.googleAnalyticsEvent.count({ where: { createdAt: { gte: since }, status: 'failed' } }),
      this.prisma.googleAnalyticsEvent.count({ where: { createdAt: { gte: since }, eventName: 'page_view' } }),
      this.prisma.googleAnalyticsEvent.count({ where: { createdAt: { gte: since }, eventName: 'sign_up' } }),
      this.prisma.googleAnalyticsEvent.count({ where: { createdAt: { gte: since }, eventName: 'view_item' } }),
      this.prisma.googleAnalyticsEvent.count({ where: { createdAt: { gte: since }, eventName: 'purchase' } }),
    ]);

    return {
      total,
      sent,
      failed,
      breakdown: {
        pageViews,
        signups,
        completeRegs,
        purchases,
      },
    };
  }

  async getEventLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.prisma.googleAnalyticsEvent.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.googleAnalyticsEvent.count(),
    ]);

    return {
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async resetConfig() {
    await this.prisma.googleAnalyticsConfig.deleteMany();
    return this.prisma.googleAnalyticsConfig.create({
      data: {
        measurementId: null,
        apiSecret: null,
        isActive: false,
        trackPageView: true,
        trackSignup: true,
        trackCompleteReg: true,
        trackLogin: true,
      },
    });
  }
}

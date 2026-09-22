import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import axios from 'axios';

@Injectable()
export class MetaMarketingConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getConfig() {
    let config = await this.prisma.metaMarketingApiConfig.findFirst();
    if (!config) {
      config = await this.prisma.metaMarketingApiConfig.create({
        data: {
          appId: '',
          apiVersion: 'v21.0',
          adRunUnitCost: 10,
          autoScaleUnitCost: 5,
        },
      });
    }

    // Return decrypted secrets to superadmin for display (or mask them as needed)
    return {
      ...config,
      appSecret: config.appSecret ? this.crypto.decrypt(config.appSecret) : '',
      systemUserToken: config.systemUserToken ? this.crypto.decrypt(config.systemUserToken) : '',
    };
  }

  async updateConfig(dto: any, userId: string) {
    const existing = await this.prisma.metaMarketingApiConfig.findFirst();
    const id = existing?.id;
    if (!id) throw new BadRequestException('Config not initialized');

    const updateData: any = {
      appId: dto.appId,
      apiVersion: dto.apiVersion,
      webhookVerifyToken: dto.webhookVerifyToken,
      isEnabled: dto.isEnabled,
      adRunUnitCost: dto.adRunUnitCost,
      autoScaleUnitCost: dto.autoScaleUnitCost,
      updatedByUserId: userId,
    };

    if (dto.appSecret) {
      updateData.appSecret = this.crypto.encrypt(dto.appSecret);
    }
    if (dto.systemUserToken) {
      updateData.systemUserToken = this.crypto.encrypt(dto.systemUserToken);
    }

    const config = await this.prisma.metaMarketingApiConfig.update({
      where: { id },
      data: updateData,
    });

    await this.auditLogs.createSuperadminLog(
      'META_MARKETING_CONFIG_UPDATED',
      'Meta Marketing API config was updated.',
      userId,
      { isEnabled: dto.isEnabled, appId: dto.appId }
    );

    return config;
  }

  async testConnection() {
    const config = await this.prisma.metaMarketingApiConfig.findFirst();
    if (!config) {
      throw new BadRequestException('Configuration not found.');
    }

    if (config.systemUserToken) {
      const token = this.crypto.decrypt(config.systemUserToken);
      try {
        const response = await axios.get(`https://graph.facebook.com/${config.apiVersion || 'v21.0'}/me`, {
          params: { access_token: token }
        });

        const successMsg = `Connected as ${response.data.name || response.data.id}`;
        await this.prisma.metaMarketingApiConfig.update({
          where: { id: config.id },
          data: {
            lastTestedAt: new Date(),
            lastTestStatus: 'success',
            lastTestMessage: successMsg
          }
        });

        return { success: true, message: successMsg };
      } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        await this.prisma.metaMarketingApiConfig.update({
          where: { id: config.id },
          data: {
            lastTestedAt: new Date(),
            lastTestStatus: 'failed',
            lastTestMessage: errorMessage
          }
        });
        return { success: false, message: errorMessage };
      }
    }

    if (config.appId && config.appSecret) {
      const appSecret = this.crypto.decrypt(config.appSecret);
      try {
        const response = await axios.get(`https://graph.facebook.com/${config.apiVersion || 'v21.0'}/oauth/access_token`, {
          params: {
            client_id: config.appId,
            client_secret: appSecret,
            grant_type: 'client_credentials'
          }
        });

        if (response.data?.access_token) {
          const successMsg = `Meta App ID (${config.appId}) & App Secret verified with Meta Graph API.`;
          await this.prisma.metaMarketingApiConfig.update({
            where: { id: config.id },
            data: {
              lastTestedAt: new Date(),
              lastTestStatus: 'success',
              lastTestMessage: successMsg
            }
          });
          return { success: true, message: successMsg };
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        await this.prisma.metaMarketingApiConfig.update({
          where: { id: config.id },
          data: {
            lastTestedAt: new Date(),
            lastTestStatus: 'failed',
            lastTestMessage: errorMessage
          }
        });
        return { success: false, message: errorMessage };
      }
    }

    throw new BadRequestException('Please enter App ID and App Secret first, then click Save Configuration.');
  }

  async isMcpEnabled() {
    const config = await this.prisma.metaMarketingApiConfig.findFirst();
    return config?.isEnabled || false;
  }

  async getEnabledTools() {
    return this.prisma.mcpToolRegistry.findMany();
  }

  async updateTool(toolKey: string, isEnabled: boolean) {
    return this.prisma.mcpToolRegistry.update({
      where: { toolKey },
      data: { isEnabled }
    });
  }
}

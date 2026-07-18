import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { BillingService } from '../../billing/billing.service';

@Injectable()
export class MessengerAuthService {
  private readonly logger = new Logger(MessengerAuthService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private billingService: BillingService
  ) {}

  async getConnections(tenantId: string) {
    return this.prisma.channelConnection.findMany({
      where: { tenantId, channelType: 'messenger' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        externalAccountId: true,
        status: true,
        connectionMethod: true,
        verifyToken: true,
        createdAt: true,
      }
    });
  }

  private async checkQuota(tenantId: string) {
    const quotas = await this.billingService.getTenantQuotas(tenantId);
    
    const currentConnections = await this.prisma.channelConnection.count({
      where: { tenantId, channelType: 'messenger' }
    });

    if (currentConnections >= quotas.channelLimit) {
      throw new ForbiddenException(`Channel limit reached (${quotas.channelLimit}). Please upgrade your plan to connect more Messenger Pages.`);
    }
  }

  async connectManual(tenantId: string, data: any) {
    await this.checkQuota(tenantId);

    const { pageId, accessToken, displayName, verifyToken } = data;

    if (!pageId || !accessToken) {
      throw new BadRequestException('Missing required Meta Page API credentials');
    }

    try {
      // Verify Page token
      const response = await fetch(`https://graph.facebook.com/v21.0/${pageId}?access_token=${accessToken}`);

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error('Meta API verification failed:', errorData);
        throw new BadRequestException(`Meta API Error: ${errorData.error?.message || 'Invalid credentials'}`);
      }

      const existing = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: 'messenger', externalAccountId: pageId }
      });

      if (existing) {
        throw new BadRequestException('This Messenger Page is already connected');
      }

      const connection = await this.prisma.channelConnection.create({
        data: {
          tenantId,
          channelType: 'messenger',
          externalAccountId: pageId,
          accessTokenEncrypted: accessToken,
          displayName: displayName || 'Messenger Page',
          verifyToken: verifyToken || null,
          connectionMethod: 'manual',
          status: 'active'
        }
      });

      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      this.notificationsService.createSystemNotificationForSuperadmins(
        'New Messenger Connection',
        `Tenant "${tenant?.businessName}" connected a new Messenger Page (${pageId}) via Manual setup.`,
        'info'
      ).catch(e => this.logger.error('Failed to send notification', e));

      return { success: true, connectionId: connection.id };
    } catch (error) {
      this.logger.error('Failed to connect Messenger manually', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('Failed to connect to Meta API. Please verify your Page ID and Token.');
    }
  }

  async connectViaFacebook(tenantId: string, code: string) {
    await this.checkQuota(tenantId);

    const fbConfig = await this.prisma.facebookAuthConfig.findFirst();
    if (!fbConfig || !fbConfig.isEnabled) {
      throw new BadRequestException('Facebook Authentication is not enabled on this platform');
    }
    
    if (!fbConfig.appId) {
      throw new BadRequestException('Facebook App ID is not configured');
    }

    this.logger.log(`Exchanging OAuth code for tenant ${tenantId} using App ID: ${fbConfig.appId}`);
    
    try {
      // Mock OAuth exchange for demonstration
      const mockAccessToken = `mock_system_token_${Date.now()}`;
      const mockPageId = `mock_page_${Math.floor(Math.random() * 100000)}`;

      const connection = await this.prisma.channelConnection.create({
        data: {
          tenantId,
          channelType: 'messenger',
          externalAccountId: mockPageId,
          accessTokenEncrypted: mockAccessToken,
          displayName: `Auto-Connected Page`,
          verifyToken: `auto_${Date.now()}`,
          connectionMethod: 'facebook_login',
          status: 'active'
        }
      });

      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      this.notificationsService.createSystemNotificationForSuperadmins(
        'New Messenger Connection',
        `Tenant "${tenant?.businessName}" connected a new Messenger Page (${mockPageId}) via Facebook OAuth.`,
        'info'
      ).catch(e => this.logger.error('Failed to send notification', e));

      return { success: true, connectionId: connection.id };
    } catch (error) {
      this.logger.error('Failed to exchange Messenger code', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('OAuth exchange failed');
    }
  }

  async deleteConnection(tenantId: string, id: string) {
    const connection = await this.prisma.channelConnection.findUnique({
      where: { id, tenantId, channelType: 'messenger' }
    });

    if (!connection) throw new NotFoundException('Connection not found');

    await this.prisma.channelConnection.delete({ where: { id } });
    return { success: true };
  }
}

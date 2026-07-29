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
        isAiAutoReplyEnabled: true,
      }
    });
  }

  private async checkQuota(tenantId: string) {
    const quotas = await this.billingService.getTenantQuotas(tenantId);
    
    const currentConnections = await this.prisma.channelConnection.count({
      where: { tenantId, channelType: 'messenger' }
    });

    if (currentConnections >= quotas.messengerLimit) {
      throw new ForbiddenException(`Messenger limit reached (${quotas.messengerLimit}). Please upgrade your plan to connect more Messenger Pages.`);
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

      // Notify tenant admins/owners
      const tenantAdmins = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
      for (const admin of tenantAdmins) {
        this.notificationsService.createNotification(
          admin.id,
          '✅ Messenger Page Connected',
          `Your Messenger Page (${displayName || pageId}) has been successfully connected.`,
          'system'
        ).catch(() => {});
      }

      return { success: true, connectionId: connection.id };
    } catch (error) {
      this.logger.error('Failed to connect Messenger manually', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('Failed to connect to Meta API. Please verify your Page ID and Token.');
    }
  }

  async connectViaFacebook(tenantId: string, accessToken: string) {
    await this.checkQuota(tenantId);

    const fbConfig = await this.prisma.facebookAuthConfig.findFirst();
    if (!fbConfig || !fbConfig.isEnabled) {
      throw new BadRequestException('Facebook Authentication is not enabled on this platform');
    }
    
    if (!fbConfig.appId) {
      throw new BadRequestException('Facebook App ID is not configured');
    }

    this.logger.log(`Exchanging OAuth token for tenant ${tenantId} using App ID: ${fbConfig.appId}`);
    
    try {
      // Step 1: Exchange short-lived token for long-lived token
      const longLivedRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${fbConfig.appId}&client_secret=${fbConfig.appSecret}&fb_exchange_token=${accessToken}`
      );
      
      const longLivedData = await longLivedRes.json();
      if (longLivedData.error) {
        throw new Error(longLivedData.error.message);
      }
      
      const finalToken = longLivedData.access_token || accessToken;

      // Step 2: Get user's pages
      const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${finalToken}`);
      const pagesData = await pagesRes.json();
      
      if (pagesData.error) {
        throw new Error(pagesData.error.message);
      }

      if (!pagesData.data || pagesData.data.length === 0) {
        throw new BadRequestException('No Facebook Pages found for this account.');
      }

      // Connect the first Page found
      const page = pagesData.data[0];
      const pageId = page.id;
      const pageToken = page.access_token;
      const pageName = page.name || 'Facebook Page';

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
          accessTokenEncrypted: pageToken,
          displayName: pageName,
          connectionMethod: 'facebook_login',
          status: 'active'
        }
      });

      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      this.notificationsService.createSystemNotificationForSuperadmins(
        'New Messenger Connection',
        `Tenant "${tenant?.businessName}" connected a new Messenger Page (${pageName}) via Facebook OAuth.`,
        'info'
      ).catch(e => this.logger.error('Failed to send notification', e));

      // Notify tenant admins/owners
      const tenantAdmins = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
      for (const admin of tenantAdmins) {
        this.notificationsService.createNotification(
          admin.id,
          '✅ Messenger Page Connected',
          `Your Messenger Page "${pageName}" has been successfully connected via Facebook.`,
          'system'
        ).catch(() => {});
      }

      return { success: true, connectionId: connection.id };
    } catch (error: any) {
      this.logger.error('Failed to exchange Messenger token', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException(`OAuth exchange failed: ${error.message}`);
    }
  }

  async deleteConnection(tenantId: string, id: string) {
    const connection = await this.prisma.channelConnection.findUnique({
      where: { id, tenantId, channelType: 'messenger' }
    });

    if (!connection) throw new NotFoundException('Connection not found');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    await this.prisma.channelConnection.delete({ where: { id } });

    // Notify tenant admins/owners
    const tenantAdmins = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
    for (const admin of tenantAdmins) {
      this.notificationsService.createNotification(
        admin.id,
        '⚠️ Messenger Channel Disconnected',
        `Messenger connection "${connection.displayName || id}" has been removed.`,
        'system'
      ).catch(() => {});
    }
    this.notificationsService.createSystemNotificationForSuperadmins(
      'Messenger Channel Removed',
      `Tenant "${tenant?.businessName}" removed Messenger Page "${connection.displayName}"`,
      'info'
    ).catch(() => {});

    return { success: true };
  }

  async toggleAiReply(tenantId: string, connectionId: string, isEnabled: boolean) {
    const connection = await this.prisma.channelConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection || connection.tenantId !== tenantId) {
      throw new NotFoundException('Connection not found');
    }

    return this.prisma.channelConnection.update({
      where: { id: connectionId },
      data: { isAiAutoReplyEnabled: isEnabled }
    });
  }
}

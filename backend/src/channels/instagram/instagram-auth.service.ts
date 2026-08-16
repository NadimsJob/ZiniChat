import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { BillingService } from '../../billing/billing.service';

@Injectable()
export class InstagramAuthService {
  private readonly logger = new Logger(InstagramAuthService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private billingService: BillingService
  ) {}

  private async checkAccessControlAndQuota(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
          orderBy: { currentPeriodEnd: 'desc' },
          take: 1
        }
      }
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const activePlan = tenant.subscriptions[0]?.plan;
    let allowedFeatures: string[] = [];

    if (tenant.customFeatures) {
      allowedFeatures = tenant.customFeatures as string[];
    } else if (activePlan && activePlan.features) {
      allowedFeatures = activePlan.features as string[];
    }

    if (!allowedFeatures.includes('instagram_dm')) {
      throw new ForbiddenException('Your current plan does not support Instagram DM Integration. Please upgrade your plan.');
    }

    const quotas = await this.billingService.getTenantQuotas(tenantId);
    const currentConnections = await this.prisma.channelConnection.count({
      where: { tenantId, channelType: 'instagram' }
    });

    if (currentConnections >= quotas.instagramLimit) {
      throw new ForbiddenException(`Instagram limit reached (${quotas.instagramLimit}). Please upgrade your plan to connect more channels.`);
    }
  }

  async getConnections(tenantId: string) {
    return this.prisma.channelConnection.findMany({
      where: { tenantId, channelType: 'instagram' },
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

  async connectManual(tenantId: string, data: any) {
    await this.checkAccessControlAndQuota(tenantId);

    const { accountId, accessToken, displayName, verifyToken } = data;

    if (!accountId || !accessToken) {
      throw new BadRequestException('Missing required Instagram Graph API credentials');
    }

    try {
      // Verify Instagram account token
      const response = await fetch(`https://graph.facebook.com/v21.0/${accountId}?access_token=${accessToken}`);

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error('Meta API verification failed:', errorData);
        throw new BadRequestException(`Meta API Error: ${errorData.error?.message || 'Invalid credentials'}`);
      }

      const existing = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: 'instagram', externalAccountId: accountId }
      });

      if (existing) {
        throw new BadRequestException('This Instagram Account is already connected');
      }

      const connection = await this.prisma.channelConnection.create({
        data: {
          tenantId,
          channelType: 'instagram',
          externalAccountId: accountId,
          accessTokenEncrypted: accessToken,
          displayName: displayName || 'Instagram Account',
          verifyToken: verifyToken || null,
          connectionMethod: 'manual',
          status: 'active'
        }
      });

      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      this.notificationsService.createSystemNotificationForSuperadmins(
        'New Instagram Connection',
        `Tenant "${tenant?.businessName}" connected a new Instagram Account (${accountId}) via Manual setup.`,
        'info'
      ).catch(e => this.logger.error('Failed to send notification', e));

      // Notify tenant admins/owners
      const tenantAdmins = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
      for (const admin of tenantAdmins) {
        this.notificationsService.createNotification(
          admin.id,
          '✅ Instagram Account Connected',
          `Your Instagram account (${displayName || accountId}) has been successfully connected.`,
          'system'
        ).catch(() => {});
      }

      return { success: true, connectionId: connection.id };
    } catch (error) {
      this.logger.error('Failed to connect Instagram manually', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('Failed to connect to Meta API. Please verify your Account ID and Token.');
    }
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

  async connectViaFacebook(tenantId: string, accessToken: string) {
    await this.checkAccessControlAndQuota(tenantId);

    try {
      // Step 1: Exchange short-lived token for long-lived token
      const fbConfig = await this.prisma.facebookAuthConfig.findFirst();
      if (!fbConfig) {
        throw new BadRequestException('Platform Facebook Auth not configured');
      }

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

      // We'll just connect the first Instagram Business Account found linked to these pages for simplicity
      // Or we can connect all of them. Let's find the first one that has an instagram_business_account
      let igAccountId = null;
      let igDisplayName = 'Instagram Account';

      for (const page of pagesData.data) {
        const pageToken = page.access_token;
        const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${pageToken}`);
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
          igAccountId = igData.instagram_business_account.id;
          
          // Get the IG account username
          const igUserRes = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}?fields=username&access_token=${pageToken}`);
          const igUserData = await igUserRes.json();
          if (igUserData.username) {
            igDisplayName = igUserData.username;
          }
          break; // Just connect the first one found for now to simplify
        }
      }

      if (!igAccountId) {
         throw new BadRequestException('No Instagram Business Accounts linked to your Facebook Pages. Please link your Instagram account to a Facebook Page first.');
      }

      const existing = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: 'instagram', externalAccountId: igAccountId }
      });

      if (existing) {
        throw new BadRequestException('This Instagram Account is already connected');
      }

      const connection = await this.prisma.channelConnection.create({
        data: {
          tenantId,
          channelType: 'instagram',
          externalAccountId: igAccountId,
          accessTokenEncrypted: finalToken, // Storing the user long-lived token
          displayName: igDisplayName,
          connectionMethod: 'facebook_login',
          status: 'active'
        }
      });

      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      this.notificationsService.createSystemNotificationForSuperadmins(
        'New Instagram Connection',
        `Tenant "${tenant?.businessName}" connected Instagram (${igDisplayName}) via Facebook Login.`,
        'info'
      ).catch(e => this.logger.error('Failed to send notification', e));

      // Notify tenant admins/owners
      const tenantAdmins = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
      for (const admin of tenantAdmins) {
        this.notificationsService.createNotification(
          admin.id,
          '✅ Instagram Account Connected',
          `Your Instagram account "${igDisplayName}" has been successfully connected via Facebook.`,
          'system'
        ).catch(() => {});
      }

      return { success: true, connectionId: connection.id };

    } catch (error: any) {
      this.logger.error('Facebook Login Error:', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException(`Facebook Login Failed: ${error.message}`);
    }
  }

  async deleteConnection(tenantId: string, id: string) {
    const connection = await this.prisma.channelConnection.findUnique({
      where: { id }
    });

    if (!connection || connection.tenantId !== tenantId) {
      throw new NotFoundException('Connection not found');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    await this.prisma.channelConnection.delete({ where: { id } });

    // Notify tenant admins/owners
    const tenantAdmins = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
    for (const admin of tenantAdmins) {
      this.notificationsService.createNotification(
        admin.id,
        '⚠️ Instagram Channel Disconnected',
        `Instagram connection "${connection.displayName || id}" has been removed.`,
        'system'
      ).catch(() => {});
    }
    this.notificationsService.createSystemNotificationForSuperadmins(
      'Instagram Channel Removed',
      `Tenant "${tenant?.businessName}" removed Instagram connection "${connection.displayName}"`,
      'info'
    ).catch(() => {});

    return { success: true };
  }
}

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

  async connectViaFacebook(tenantId: string, accessToken: string, selectedIgAccountId?: string) {
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

      // Step 2: Get all Facebook Pages of the user
      const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${finalToken}`);
      const pagesData = await pagesRes.json();
      
      if (pagesData.error) {
        throw new Error(pagesData.error.message);
      }

      if (!pagesData.data || pagesData.data.length === 0) {
        throw new BadRequestException('No Facebook Pages found for this account.');
      }

      // Step 3: Collect all Instagram Business Accounts linked to those pages
      const igAccounts: Array<{ igId: string; username: string; pageId: string; pageToken: string; pageName: string }> = [];

      for (const page of pagesData.data) {
        const pageToken = page.access_token;
        const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${pageToken}`);
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
          const igId = igData.instagram_business_account.id;

          // Get the IG account username
          const igUserRes = await fetch(`https://graph.facebook.com/v21.0/${igId}?fields=username,name&access_token=${pageToken}`);
          const igUserData = await igUserRes.json();
          const username = igUserData.username || igUserData.name || `ig_${igId}`;

          // Skip already-connected accounts
          const alreadyConnected = await this.prisma.channelConnection.findFirst({
            where: { tenantId, channelType: 'instagram', externalAccountId: igId }
          });
          if (alreadyConnected) continue;

          igAccounts.push({
            igId,
            username,
            pageId: page.id,
            pageToken,
            pageName: page.name,
          });
        }
      }

      if (igAccounts.length === 0) {
        throw new BadRequestException('No Instagram Business Accounts found (they may already be connected, or no Instagram account is linked to your Facebook Pages).');
      }

      // Step 4: If no specific account selected, return list for user to choose
      if (!selectedIgAccountId) {
        return {
          requiresSelection: true,
          accounts: igAccounts.map(a => ({ id: a.igId, username: a.username, pageName: a.pageName, pageId: a.pageId })),
          token: finalToken, // Pass token back to use in step 2
        };
      }

      // Step 5: Connect the selected Instagram account
      const selected = igAccounts.find(a => a.igId === selectedIgAccountId);
      if (!selected) {
        throw new BadRequestException('Selected Instagram account not found. Please try again.');
      }

      const connection = await this.prisma.channelConnection.create({
        data: {
          tenantId,
          channelType: 'instagram',
          externalAccountId: selected.igId,
          // IMPORTANT: Store the Page Access Token (NOT the user token).
          // Instagram Messaging API (/{ig-id}/messages) requires a Page Access Token.
          // The pageToken from /me/accounts (called with a long-lived user token)
          // is itself a long-lived Page Access Token (no expiry).
          accessTokenEncrypted: selected.pageToken,
          displayName: selected.username,
          // Store the Facebook Page ID in verifyToken for webhook resubscription.
          verifyToken: selected.pageId,
          connectionMethod: 'facebook_login',
          status: 'active',
          isCommentAutoReplyEnabled: true,
          hasCommentPermissions: true,
        }
      });

      // Subscribe the linked Facebook Page to Instagram messaging webhooks
      await this.subscribePageForInstagram(selected.pageId, selected.pageToken);

      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      this.notificationsService.createSystemNotificationForSuperadmins(
        'New Instagram Connection',
        `Tenant "${tenant?.businessName}" connected Instagram (@${selected.username}) via Facebook Login.`,
        'info'
      ).catch(e => this.logger.error('Failed to send notification', e));

      // Notify tenant admins/owners
      const tenantAdmins = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
      for (const admin of tenantAdmins) {
        this.notificationsService.createNotification(
          admin.id,
          '✅ Instagram Account Connected',
          `Your Instagram account "@${selected.username}" has been successfully connected via Facebook.`,
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

  /**
   * Subscribe the linked Facebook Page to Instagram messaging webhook fields.
   * Instagram DM webhooks require the LINKED Facebook Page to subscribe with
   * instagram_messaging fields — Instagram Business Account ID alone is not enough.
   */
  private async subscribePageForInstagram(pageId: string, pageToken: string): Promise<void> {
    try {
      const fields = 'messages,messaging_postbacks,message_deliveries,message_reads,feed';
      const url = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?subscribed_fields=${encodeURIComponent(fields)}&access_token=${pageToken}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.logger.log(`Successfully subscribed page ${pageId} to Instagram messaging webhooks`);
      } else {
        this.logger.warn(`Webhook subscription for page ${pageId} returned: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to subscribe page ${pageId} for Instagram webhooks: ${err.message}`);
    }
  }

  /**
   * Re-subscribe existing Instagram connection's linked Facebook Page to receive DM webhooks.
   * Use this for connections made before webhook subscription was implemented.
   */
  async resubscribeWebhooks(tenantId: string, connectionId: string) {
    const connection = await this.prisma.channelConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection || connection.tenantId !== tenantId) {
      throw new NotFoundException('Connection not found');
    }

    // For facebook_login connections, verifyToken stores the Facebook Page ID
    // and accessTokenEncrypted stores the Page Access Token.
    const pageId = connection.verifyToken;
    const pageToken = connection.accessTokenEncrypted;

    if (!pageId) {
      throw new BadRequestException(
        'No linked Facebook Page ID found for this connection. Please disconnect and reconnect via Facebook Login to fix this.'
      );
    }

    try {
      await this.subscribePageForInstagram(pageId, pageToken);
      await this.prisma.channelConnection.update({
        where: { id: connectionId },
        data: { isCommentAutoReplyEnabled: true, hasCommentPermissions: true }
      });
      this.logger.log(`Re-subscribed page ${pageId} for IG account ${connection.externalAccountId}`);
      return { success: true, message: 'Webhook subscription refreshed. Instagram DMs will now appear in the inbox.' };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Resubscription failed: ${error.message}`);
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

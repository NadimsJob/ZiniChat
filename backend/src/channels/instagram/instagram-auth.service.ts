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
          where: { status: { in: ['active', 'trialing'] } },
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
      where: { tenantId, channelType: 'instagram', status: { in: ['active', 'connected'] } }
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

      // Diagnostic: Check token scopes using Meta debug_token API
      try {
        const debugRes = await fetch(
          `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${fbConfig.appId}|${fbConfig.appSecret}`
        );
        const debugData = await debugRes.json();
        if (debugData.data) {
          this.logger.log(`Meta debug_token for Instagram connection tenant ${tenantId}: is_valid=${debugData.data.is_valid}, scopes=${JSON.stringify(debugData.data.scopes)}, granular_scopes=${JSON.stringify(debugData.data.granular_scopes)}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to inspect debug_token: ${err.message}`);
      }

      // Step 1: Exchange short-lived token for long-lived token
      let finalToken = accessToken;
      try {
        const longLivedRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${fbConfig.appId}&client_secret=${fbConfig.appSecret}&fb_exchange_token=${accessToken}`
        );
        const longLivedData = await longLivedRes.json();
        if (longLivedData.access_token) {
          finalToken = longLivedData.access_token;
        } else if (longLivedData.error) {
          this.logger.warn(`Meta long-lived exchange warning for IG: ${longLivedData.error.message}`);
        }
      } catch (err) {
        this.logger.warn(`Failed long-lived token exchange for IG: ${err.message}`);
      }

      // Step 2: Retrieve user's pages trying multiple Meta Graph API paths & tokens
      let rawPagesList: any[] = [];

      // Path A: /me/accounts with short-lived access token directly
      const pagesResA = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,tasks,category&access_token=${accessToken}`);
      const pagesDataA = await pagesResA.json();
      if (pagesDataA.data && Array.isArray(pagesDataA.data) && pagesDataA.data.length > 0) {
        rawPagesList = pagesDataA.data;
        this.logger.log(`Path A (/me/accounts short-lived for IG) returned ${rawPagesList.length} pages`);
      }

      // Path B: /me/accounts with final/long-lived access token
      if (rawPagesList.length === 0 && finalToken !== accessToken) {
        const pagesResB = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,tasks,category&access_token=${finalToken}`);
        const pagesDataB = await pagesResB.json();
        if (pagesDataB.data && Array.isArray(pagesDataB.data) && pagesDataB.data.length > 0) {
          rawPagesList = pagesDataB.data;
          this.logger.log(`Path B (/me/accounts long-lived for IG) returned ${rawPagesList.length} pages`);
        }
      }

      // Path D: /me/businesses (Fetch pages linked via Meta Business Manager / Portfolios)
      try {
        const bizRes = await fetch(`https://graph.facebook.com/v21.0/me/businesses?fields=id,name,owned_pages{id,name,access_token,tasks,category},client_pages{id,name,access_token,tasks,category}&access_token=${accessToken}`);
        const bizData = await bizRes.json();
        if (bizData.data && Array.isArray(bizData.data)) {
          for (const biz of bizData.data) {
            const pagesInBiz = [
              ...(biz.owned_pages?.data || []),
              ...(biz.client_pages?.data || [])
            ];
            for (const p of pagesInBiz) {
              if (p.id && !rawPagesList.some(existing => existing.id === p.id)) {
                rawPagesList.push(p);
              }
            }
          }
          this.logger.log(`Path D (/me/businesses for IG) merged pages total: ${rawPagesList.length}`);
        }
      } catch (bizErr: any) {
        this.logger.warn(`Path D /me/businesses for IG failed: ${bizErr.message}`);
      }

      this.logger.log(`Meta total pages found for Instagram: ${rawPagesList.length} for tenant ${tenantId}`);

      if (rawPagesList.length === 0) {
        throw new BadRequestException('No Facebook Pages found for this account. Make sure you are an admin/editor of the page and opted in during Facebook login.');
      }

      const pagesData = { data: rawPagesList };

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

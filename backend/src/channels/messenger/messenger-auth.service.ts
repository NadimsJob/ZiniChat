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

  private async subscribePageToWebhooks(pageId: string, pageToken: string) {
    try {
      const url = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_deliveries,message_reads,feed&access_token=${pageToken}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.logger.log(`Successfully subscribed Facebook Page ${pageId} to Meta Webhooks`);
      } else {
        this.logger.warn(`Failed to subscribe Facebook Page ${pageId} to Webhooks: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      this.logger.error(`Error subscribing Facebook Page ${pageId} to Webhooks: ${err.message}`);
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

      // Auto-subscribe Meta App to Page Webhooks so Meta forwards incoming Page messages to ZiniChat
      await this.subscribePageToWebhooks(pageId, accessToken);

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

  async connectViaFacebook(tenantId: string, accessToken: string, targetPageId?: string) {
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

      // If multiple pages exist and no targetPageId is provided, return the pages list for selection
      if (pagesData.data.length > 1 && !targetPageId) {
        // Find pages that are not already connected to this tenant
        const connectedConnections = await this.prisma.channelConnection.findMany({
          where: { tenantId, channelType: 'messenger' },
          select: { externalAccountId: true }
        });
        const connectedPageIds = connectedConnections.map(c => c.externalAccountId);
        const availablePages = pagesData.data.filter((p: any) => !connectedPageIds.includes(p.id));

        if (availablePages.length > 0) {
          return {
            requiresSelection: true,
            pages: availablePages.map((p: any) => ({ id: p.id, name: p.name }))
          };
        }
      }

      // Connect the selected page or the first available one
      const page = targetPageId 
        ? pagesData.data.find((p: any) => p.id === targetPageId)
        : pagesData.data[0];

      if (!page) {
        throw new BadRequestException('Selected Facebook Page was not found or is not authorized.');
      }

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

      // Auto-subscribe Meta App to Page Webhooks so Meta forwards incoming Page messages to ZiniChat
      await this.subscribePageToWebhooks(pageId, pageToken);

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

  /**
   * Re-subscribe the Facebook Page to Meta Webhooks (including 'feed' for comment events).
   * Use when comments are not showing up in the inbox.
   */
  async resubscribeWebhooks(tenantId: string, connectionId: string) {
    const connection = await this.prisma.channelConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection || connection.tenantId !== tenantId) {
      throw new NotFoundException('Connection not found');
    }

    const pageId = connection.externalAccountId;
    const pageToken = connection.accessTokenEncrypted;

    if (!pageId || !pageToken) {
      throw new BadRequestException('Connection is missing page credentials');
    }

    try {
      const fields = 'messages,messaging_postbacks,message_deliveries,message_reads,feed';
      const url = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?subscribed_fields=${encodeURIComponent(fields)}&access_token=${pageToken}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        this.logger.log(`Re-subscribed Facebook Page ${pageId} to Meta Webhooks (including feed/comments)`);
        return { success: true, message: 'Webhook subscription refreshed. Facebook comments should now appear in the inbox.' };
      } else {
        this.logger.warn(`Resubscribe returned: ${JSON.stringify(data)}`);
        throw new BadRequestException(`Meta API returned: ${JSON.stringify(data.error || data)}`);
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Resubscription failed: ${err.message}`);
    }
  }
}

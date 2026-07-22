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
      where: { tenantId }
    });

    if (currentConnections >= quotas.channelLimit) {
      throw new ForbiddenException(`Channel limit reached (${quotas.channelLimit}). Please upgrade your plan to connect more channels.`);
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

      return { success: true, connectionId: connection.id };
    } catch (error) {
      this.logger.error('Failed to connect Instagram manually', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('Failed to connect to Meta API. Please verify your Account ID and Token.');
    }
  }
}

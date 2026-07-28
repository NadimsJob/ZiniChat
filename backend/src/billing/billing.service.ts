import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        tenant: true,
        plan: true,
      },
      orderBy: { currentPeriodEnd: 'desc' },
    });
  }

  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthlyBdt: 'asc' },
    });
  }

  async getPayments() {
    return this.prisma.payment.findMany({
      include: {
        tenant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenantQuotas(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'trialing'] },
        currentPeriodEnd: { gt: new Date() }
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' }
    });

    const plan = activeSubscription?.plan;

    // Current channel connection counts (active only)
    const [currentWhatsapp, currentMessenger, currentInstagram, currentWebsiteWidget] = await Promise.all([
      this.prisma.channelConnection.count({
        where: { tenantId, channelType: 'whatsapp', status: { in: ['active', 'connected'] } }
      }),
      this.prisma.channelConnection.count({
        where: { tenantId, channelType: 'messenger', status: { in: ['active', 'connected'] } }
      }),
      this.prisma.channelConnection.count({
        where: { tenantId, channelType: 'instagram', status: { in: ['active', 'connected'] } }
      }),
      this.prisma.websiteWidget.count({
        where: { tenantId, isActive: true }
      }),
    ]);

    return {
      subscription: activeSubscription,
      whatsappLimit: tenant?.customWhatsappLimit ?? plan?.whatsappLimit ?? 1,
      messengerLimit: tenant?.customMessengerLimit ?? plan?.messengerLimit ?? 1,
      instagramLimit: tenant?.customInstagramLimit ?? plan?.instagramLimit ?? 1,
      websiteWidgetLimit: tenant?.customWebsiteWidgetLimit ?? plan?.websiteWidgetLimit ?? 0,
      messageQuota: tenant?.customMessageQuota ?? plan?.messageQuota ?? 100,
      aiQuota: tenant?.customAiQuota ?? plan?.aiQuota ?? 50,
      seatLimit: tenant?.customSeatLimit ?? plan?.seatLimit ?? 1,
      storageLimitMb: tenant?.customStorageLimitMb ?? plan?.storageLimitMb ?? 500,
      allowByok: tenant?.customAllowByok ?? plan?.allowByok ?? false,
      features: (tenant?.customFeatures as any) ?? plan?.features ?? [],
      customPlanName: tenant?.customPlanName,
      customPriceUsd: tenant?.customPriceUsd,
      basePlan: plan,
      // Current usage counts for channel connections
      currentWhatsapp,
      currentMessenger,
      currentInstagram,
      currentWebsiteWidget,
    };
  }


  /**
   * Returns the current billing period start/end for quota usage calculations.
   * - For active subscriptions: uses the subscription's currentPeriodStart → currentPeriodEnd
   * - For Free plan (no active subscription): falls back to the calendar month start → end
   * This ensures that renewing a subscription always resets the usage window.
   */
  async getActivePeriod(tenantId: string): Promise<{
    periodStart: Date;
    periodEnd: Date;
    messageQuota: number;
    aiQuota: number;
    subscription: any;
  }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
        currentPeriodEnd: { gt: new Date() }
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' }
    });

    const plan = activeSubscription?.plan;

    // Determine period boundaries
    let periodStart: Date;
    let periodEnd: Date;

    if (activeSubscription?.currentPeriodStart) {
      periodStart = new Date(activeSubscription.currentPeriodStart);
      periodEnd = new Date(activeSubscription.currentPeriodEnd);
    } else {
      // Free plan fallback: use current calendar month
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return {
      periodStart,
      periodEnd,
      messageQuota: tenant?.customMessageQuota ?? plan?.messageQuota ?? 100,
      aiQuota: tenant?.customAiQuota ?? plan?.aiQuota ?? 50,
      subscription: activeSubscription
    };
  }
}


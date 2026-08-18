import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        tenant: {
          include: {
            users: {
              where: { role: { in: ['owner', 'admin'] } },
              select: { name: true, email: true, role: true }
            }
          }
        },
        plan: true,
      },
      orderBy: { currentPeriodEnd: 'desc' },
    });
  }

  async getAdminBillingOverview() {
    const [subscriptions, successfulPayments, pendingPayments] = await Promise.all([
      this.getSubscriptions(),
      this.prisma.payment.aggregate({
        where: { status: 'success' },
        _sum: { amountBdt: true },
        _count: { _all: true }
      }),
      this.prisma.payment.aggregate({
        where: { status: 'pending' },
        _sum: { amountBdt: true },
        _count: { _all: true }
      })
    ]);

    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let mrrBdt = 0;
    let activeSubscriptionsCount = 0;
    let trialingCount = 0;
    let expiringSoonCount = 0;

    subscriptions.forEach(sub => {
      const price = Number(sub.plan?.priceMonthlyBdt || 0);
      const isPaid = price > 0;
      if (sub.status === 'active' || sub.status === 'trialing') {
        if (!isPaid || sub.status === 'trialing') {
          trialingCount++;
        } else {
          activeSubscriptionsCount++;
          if (sub.billingCycle === 'yearly') {
            mrrBdt += Math.round(price / 12);
          } else {
            mrrBdt += price;
          }
        }

        if (sub.currentPeriodEnd >= now && sub.currentPeriodEnd <= next7Days) {
          expiringSoonCount++;
        }
      }
    });

    return {
      subscriptions,
      stats: {
        mrrBdt,
        totalCollectedBdt: Number(successfulPayments._sum.amountBdt || 0),
        pendingCollectedBdt: Number(pendingPayments._sum.amountBdt || 0),
        activeSubscriptionsCount,
        trialingCount,
        expiringSoonCount,
        successfulPaymentsCount: successfulPayments._count._all,
        pendingPaymentsCount: pendingPayments._count._all,
      }
    };
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

    const activePeriod = await this.getActivePeriod(tenantId);
    const [messagesUsed, aiUsed] = await Promise.all([
      this.prisma.message.count({
        where: {
          direction: 'outbound',
          conversation: { tenantId },
          createdAt: { gte: activePeriod.periodStart }
        }
      }).then(async (directCount) => {
        const broadcastCount = await this.prisma.broadcastRecipient.count({
          where: {
            broadcast: { tenantId, createdAt: { gte: activePeriod.periodStart } },
            status: { notIn: ['pending', 'failed'] }
          }
        });
        return directCount + broadcastCount;
      }),
      this.prisma.aiUsageLog.count({
        where: {
          tenantId,
          createdAt: { gte: activePeriod.periodStart }
        }
      })
    ]);

    const baseMessageQuota = tenant?.customMessageQuota ?? plan?.messageQuota ?? 100;
    const baseAiQuota = tenant?.customAiQuota ?? plan?.aiQuota ?? 50;

    return {
      subscription: activeSubscription,
      whatsappLimit: tenant?.customWhatsappLimit ?? plan?.whatsappLimit ?? 1,
      messengerLimit: tenant?.customMessengerLimit ?? plan?.messengerLimit ?? 1,
      instagramLimit: tenant?.customInstagramLimit ?? plan?.instagramLimit ?? 1,
      websiteWidgetLimit: tenant?.customWebsiteWidgetLimit ?? plan?.websiteWidgetLimit ?? 0,
      productCatalogLimit: tenant?.customProductCatalogLimit ?? plan?.productCatalogLimit ?? 50,
      contactsLimit: tenant?.customContactsLimit ?? plan?.contactsLimit ?? null,
      messageQuota: baseMessageQuota + (activeSubscription?.carriedForwardMessageQuota ?? 0),
      aiQuota: baseAiQuota + (activeSubscription?.carriedForwardAiQuota ?? 0),
      messagesUsed,
      aiUsed,
      carriedForwardMessageQuota: activeSubscription?.carriedForwardMessageQuota ?? 0,
      carriedForwardAiQuota: activeSubscription?.carriedForwardAiQuota ?? 0,
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

    const baseMessageQuota = tenant?.customMessageQuota ?? plan?.messageQuota ?? 100;
    const baseAiQuota = tenant?.customAiQuota ?? plan?.aiQuota ?? 50;

    return {
      periodStart,
      periodEnd,
      messageQuota: baseMessageQuota + (activeSubscription?.carriedForwardMessageQuota ?? 0),
      aiQuota: baseAiQuota + (activeSubscription?.carriedForwardAiQuota ?? 0),
      subscription: activeSubscription
    };
  }
}


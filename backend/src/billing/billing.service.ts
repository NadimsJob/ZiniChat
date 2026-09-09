import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
      hasUsedFreePlan: (tenant as any)?.hasUsedFreePlan ?? false,
      basePlan: plan,
      // Current usage counts for channel connections
      currentWhatsapp,
      currentMessenger,
      currentInstagram,
      currentWebsiteWidget,
      quotaResetInfo: {
        subPeriodStart: activePeriod.periodStart,
        subPeriodEnd: activePeriod.periodEnd,
        isYearlySubPeriod: activePeriod.isYearlySubPeriod ?? false,
        billingCycle: activeSubscription?.billingCycle || 'monthly',
        fullPeriodStart: activePeriod.fullPeriodStart,
        fullPeriodEnd: activePeriod.fullPeriodEnd,
      },
    };
  }

  /**
   * Helper to compute the current 30-day sub-period slice for long-term (yearly) subscriptions.
   */
  getCurrentSubPeriod(subStart: Date, subEnd: Date, intervalDays: number = 30): { subPeriodStart: Date; subPeriodEnd: Date } {
    const now = new Date();
    let cursor = new Date(subStart);
    const msPerDay = 86400000;

    while (true) {
      const next = new Date(cursor.getTime() + intervalDays * msPerDay);
      const clampedEnd = next > subEnd ? subEnd : next;

      if (now < clampedEnd || next >= subEnd) {
        return {
          subPeriodStart: cursor,
          subPeriodEnd: clampedEnd
        };
      }
      cursor = next;
    }
  }

  /**
   * Returns the current billing period start/end for quota usage calculations.
   * - For active subscriptions: uses currentPeriodStart → currentPeriodEnd.
   *   For yearly subscriptions, dynamically calculates the current 30-day sub-period slice.
   * - For Free plan (no active subscription): falls back to calendar month start → end
   * This ensures that yearly subscribers receive automatic monthly quota resets every 30 days.
   */
  async getActivePeriod(tenantId: string): Promise<{
    periodStart: Date;
    periodEnd: Date;
    messageQuota: number;
    aiQuota: number;
    subscription: any;
    isYearlySubPeriod?: boolean;
    fullPeriodStart?: Date;
    fullPeriodEnd?: Date;
  }> {
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

    // Determine period boundaries
    let periodStart: Date;
    let periodEnd: Date;
    let isYearlySubPeriod = false;
    let fullPeriodStart: Date | undefined;
    let fullPeriodEnd: Date | undefined;

    if (activeSubscription?.currentPeriodStart) {
      const fullStart = new Date(activeSubscription.currentPeriodStart);
      const fullEnd = new Date(activeSubscription.currentPeriodEnd);

      if (activeSubscription.billingCycle === 'yearly') {
        const subPeriod = this.getCurrentSubPeriod(fullStart, fullEnd, 30);
        periodStart = subPeriod.subPeriodStart;
        periodEnd = subPeriod.subPeriodEnd;
        isYearlySubPeriod = true;
        fullPeriodStart = fullStart;
        fullPeriodEnd = fullEnd;
      } else {
        periodStart = fullStart;
        periodEnd = fullEnd;
      }
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
      subscription: activeSubscription,
      isYearlySubPeriod,
      fullPeriodStart,
      fullPeriodEnd,
    };
  }

  async extendSubscription(tenantId: string, days: number, actorUserId?: string) {
    if (!days || days <= 0) {
      throw new BadRequestException('Days must be greater than 0');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          orderBy: { currentPeriodEnd: 'desc' },
          take: 1
        }
      }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const latestSub = tenant.subscriptions[0];
    const now = new Date();

    let baseDate = now;
    if (latestSub && new Date(latestSub.currentPeriodEnd) > now) {
      baseDate = new Date(latestSub.currentPeriodEnd);
    }

    const newPeriodEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    if (latestSub) {
      await this.prisma.subscription.update({
        where: { id: latestSub.id },
        data: {
          status: 'active',
          currentPeriodStart: new Date(latestSub.currentPeriodEnd) < now ? now : latestSub.currentPeriodStart,
          currentPeriodEnd: newPeriodEnd
        }
      });
    } else {
      let planId = tenant.planId;
      if (!planId) {
        const defaultPlan = await this.prisma.plan.findFirst({ where: { isDefault: true } });
        if (defaultPlan) planId = defaultPlan.id;
      }
      if (!planId) {
        const anyPlan = await this.prisma.plan.findFirst();
        if (anyPlan) planId = anyPlan.id;
      }

      if (planId) {
        await this.prisma.subscription.create({
          data: {
            tenantId,
            planId,
            status: 'active',
            billingCycle: 'monthly',
            currentPeriodStart: now,
            currentPeriodEnd: newPeriodEnd
          }
        });
      }
    }

    if (tenant.status !== 'active') {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'active' }
      });
    }

    if (actorUserId) {
      await this.prisma.auditLog.create({
        data: {
          actorUserId,
          targetTenantId: tenantId,
          action: 'SUPERADMIN_EXTEND_SUBSCRIPTION',
          metadataJson: { extendedDays: days, newPeriodEnd: newPeriodEnd.toISOString() }
        }
      }).catch(() => {});
    }

    return {
      success: true,
      message: `Tenant subscription extended by ${days} days`,
      newPeriodEnd
    };
  }
}


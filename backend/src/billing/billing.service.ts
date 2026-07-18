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
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
        currentPeriodEnd: { gt: new Date() }
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' }
    });

    if (activeSubscription && activeSubscription.plan) {
      return {
        channelLimit: activeSubscription.plan.channelLimit,
        messageQuota: activeSubscription.plan.messageQuota,
        aiQuota: activeSubscription.plan.aiQuota,
        seatLimit: activeSubscription.plan.seatLimit,
        features: activeSubscription.plan.features,
      };
    }

    // Fallback for no active subscription (e.g., Free Tier or expired)
    return {
      channelLimit: 1,
      messageQuota: 100,
      aiQuota: 50,
      seatLimit: 1,
      features: [],
    };
  }
}

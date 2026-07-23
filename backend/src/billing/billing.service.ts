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
        status: 'active',
        currentPeriodEnd: { gt: new Date() }
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' }
    });

    const plan = activeSubscription?.plan;

    return {
      subscription: activeSubscription,
      channelLimit: plan?.channelLimit ?? 1,
      messageQuota: tenant?.customMessageQuota ?? plan?.messageQuota ?? 100,
      aiQuota: tenant?.customAiQuota ?? plan?.aiQuota ?? 50,
      seatLimit: tenant?.customSeatLimit ?? plan?.seatLimit ?? 1,
      storageLimitMb: tenant?.customStorageLimitMb ?? plan?.storageLimitMb ?? 500,
      features: (tenant?.customFeatures as any) ?? plan?.features ?? [],
      customPlanName: tenant?.customPlanName,
      customPriceUsd: tenant?.customPriceUsd,
      basePlan: plan
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const defaultPlan = await this.prisma.plan.findFirst({
      where: { OR: [{ isDefault: true }, { priceMonthlyBdt: 0 }] }
    });

    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: { in: ['owner', 'admin'] } },
          select: { email: true, name: true },
          take: 1
        },
        _count: {
          select: { users: true, conversations: true },
        },
        subscriptions: {
          orderBy: { currentPeriodEnd: 'desc' },
          include: { plan: true }
        },
        usageLogs: {
          where: { createdAt: { gte: startOfMonth } },
          select: { id: true }
        },
        assistants: {
          select: { byokApiKeyEncrypted: true }
        }
      },
    });

    return tenants.map(t => {
      const activeSub = t.subscriptions.find((s: any) => s.status === 'active' || s.status === 'trialing');
      const latestSub = t.subscriptions[0];
      const effectivePlan = activeSub?.plan || defaultPlan || latestSub?.plan || null;
      const subStatus = activeSub ? activeSub.status : (latestSub ? latestSub.status : 'none');
      const aiLimit = effectivePlan?.aiQuota || 50;
      const aiUsed = t.usageLogs.length;

      return {
        id: t.id,
        name: t.businessName,
        email: t.users[0]?.email || 'N/A',
        ownerName: t.users[0]?.name || 'Unknown',
        createdAt: t.createdAt,
        status: t.status,
        _count: t._count,
        customAiConfigId: t.customAiConfigId,
        hasByok: t.assistants.some(a => a.byokApiKeyEncrypted !== null),
        aiQuota: {
          limit: aiLimit,
          used: aiUsed
        },
        subscriptionStatus: subStatus,
        currentPeriodEnd: (activeSub || latestSub)?.currentPeriodEnd || null,
        planName: effectivePlan?.name || 'No Plan',
        customPlanName: t.customPlanName,
        customPriceUsd: t.customPriceUsd,
        customMessageQuota: t.customMessageQuota,
        customAiQuota: t.customAiQuota,
        customStorageLimitMb: t.customStorageLimitMb,
        customSeatLimit: t.customSeatLimit,
        customWhatsappLimit: t.customWhatsappLimit,
        customMessengerLimit: t.customMessengerLimit,
        customInstagramLimit: t.customInstagramLimit,
        customAllowByok: t.customAllowByok,
        customFeatures: t.customFeatures,
        trialEndsAt: t.trialEndsAt,
        basePlan: effectivePlan
      };
    });
  }

  async findOne(id: string) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: { in: ['owner', 'admin'] } },
          select: { name: true, email: true, role: true, createdAt: true }
        },
        subscriptions: {
          orderBy: { currentPeriodEnd: 'desc' },
          include: { plan: true }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { users: true, conversations: true, contacts: true, orders: true }
        }
      }
    });

    if (!tenant) return null;

    const aiUsage = await this.prisma.aiUsageLog.aggregate({
      where: { 
        tenantId: id,
        createdAt: { gte: startOfMonth }
      },
      _count: { _all: true }
    });

    // Convert BigInt to string/number to avoid JSON serialization errors
    return {
      ...tenant,
      storageUsedBytes: Number(tenant.storageUsedBytes),
      usage: {
        messagesUsed: tenant.messageCount,
        aiUsed: aiUsage._count._all,
        storageUsedBytes: Number(tenant.storageUsedBytes)
      }
    };
  }

  async updateStatus(id: string, status: string, actorUserId: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status },
    });

    // Log the audit action
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        targetTenantId: id,
        action: `UPDATED_TENANT_STATUS_TO_${status.toUpperCase()}`,
        metadataJson: { previousStatus: tenant.status, newStatus: status },
      },
    });

    return tenant;
  }

  async customizePlan(id: string, data: any, actorUserId: string) {
    const updateData: any = {};
    
    if (data.customPlanName !== undefined) updateData.customPlanName = data.customPlanName;
    if (data.customPriceUsd !== undefined) updateData.customPriceUsd = data.customPriceUsd;
    if (data.customMessageQuota !== undefined) updateData.customMessageQuota = data.customMessageQuota;
    if (data.customAiQuota !== undefined) updateData.customAiQuota = data.customAiQuota;
    if (data.customSeatLimit !== undefined) updateData.customSeatLimit = data.customSeatLimit;
    if (data.customStorageLimitMb !== undefined) updateData.customStorageLimitMb = data.customStorageLimitMb;
    if (data.customWhatsappLimit !== undefined) updateData.customWhatsappLimit = data.customWhatsappLimit;
    if (data.customMessengerLimit !== undefined) updateData.customMessengerLimit = data.customMessengerLimit;
    if (data.customInstagramLimit !== undefined) updateData.customInstagramLimit = data.customInstagramLimit;
    if (data.customFeatures !== undefined) updateData.customFeatures = data.customFeatures;
    if (data.customAllowByok !== undefined) updateData.customAllowByok = data.customAllowByok;
    if (data.billingCycleStart !== undefined) updateData.trialEndsAt = new Date(data.billingCycleStart); // using trialEndsAt to mark billing start if needed or just use it to track overriding.

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        targetTenantId: id,
        action: 'CUSTOMIZED_TENANT_PLAN',
        metadataJson: data,
      },
    });

    return tenant;
  }

  async updateAiConfig(id: string, customAiConfigId: string | null, actorUserId: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { customAiConfigId },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        targetTenantId: id,
        action: 'UPDATED_TENANT_AI_CONFIG',
        metadataJson: { customAiConfigId },
      },
    });

    return tenant;
  }
}

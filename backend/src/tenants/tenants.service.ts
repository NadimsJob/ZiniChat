import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

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
          where: { status: 'active' },
          include: { plan: true },
          take: 1
        },
        usageLogs: {
          where: { createdAt: { gte: startOfMonth } },
          select: { id: true }
        }
      },
    });

    return tenants.map(t => {
      const activeSub = t.subscriptions[0];
      const aiLimit = activeSub?.plan?.aiQuota || 50;
      const aiUsed = t.usageLogs.length;

      return {
        id: t.id,
        name: t.businessName,
        email: t.users[0]?.email || 'N/A',
        ownerName: t.users[0]?.name || 'Unknown',
        createdAt: t.createdAt,
        status: t.status,
        _count: t._count,
        aiQuota: {
          limit: aiLimit,
          used: aiUsed
        }
      };
    });
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
    if (data.customFeatures !== undefined) updateData.customFeatures = data.customFeatures;
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
}

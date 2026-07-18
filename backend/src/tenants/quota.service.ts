import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkMessageQuota(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { 
        subscriptions: { where: { status: 'active' }, include: { plan: true }, take: 1 } 
      }
    });

    if (!tenant) throw new ForbiddenException('Tenant not found');
    if (tenant.status === 'suspended') throw new ForbiddenException('Account suspended');

    const activePlan = tenant.subscriptions?.[0]?.plan;
    const limit = tenant.customMessageQuota ?? activePlan?.messageQuota ?? 0;
    if (tenant.messageCount >= limit) {
      throw new ForbiddenException('Message quota exceeded. Please upgrade your plan.');
    }
  }

  async incrementMessageCount(tenantId: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { messageCount: { increment: 1 } }
    });
  }

  async checkAiQuota(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { 
        subscriptions: { where: { status: 'active' }, include: { plan: true }, take: 1 } 
      }
    });

    if (!tenant) throw new ForbiddenException('Tenant not found');
    if (tenant.status === 'suspended') throw new ForbiddenException('Account suspended');

    const activePlan = tenant.subscriptions?.[0]?.plan;
    const limit = tenant.customAiQuota ?? activePlan?.aiQuota ?? 0;
    
    // Calculate AI usage this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usageResult = await this.prisma.aiUsageLog.aggregate({
      where: { 
        tenantId,
        createdAt: { gte: startOfMonth }
      },
      _count: { id: true }
    });

    const aiUsed = usageResult._count.id || 0;
    if (aiUsed >= limit) {
      throw new ForbiddenException('AI quota exceeded. Please upgrade your plan.');
    }
  }

  async checkStorageQuota(tenantId: string, additionalBytes: number = 0): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { 
        subscriptions: { where: { status: 'active' }, include: { plan: true }, take: 1 } 
      }
    });

    if (!tenant) throw new ForbiddenException('Tenant not found');

    const activePlan = tenant.subscriptions?.[0]?.plan;
    const limitMb = tenant.customStorageLimitMb ?? activePlan?.storageLimitMb ?? 500;
    const limitBytes = BigInt(limitMb) * BigInt(1024 * 1024);
    
    const usedBytes = tenant.storageUsedBytes || BigInt(0);
    const totalBytes = usedBytes + BigInt(Math.floor(additionalBytes));

    if (totalBytes > limitBytes) {
      throw new ForbiddenException('Storage quota exceeded. Please clear some space or upgrade your plan.');
    }
  }

  async incrementStorage(tenantId: string, bytes: number): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { storageUsedBytes: { increment: Math.floor(bytes) } }
    });
  }
  
  async decrementStorage(tenantId: string, bytes: number): Promise<void> {
    // get current to prevent negative
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return;
    
    const current = tenant.storageUsedBytes || BigInt(0);
    const toSubtract = BigInt(Math.floor(bytes));
    
    const newValue = current - toSubtract < BigInt(0) ? BigInt(0) : current - toSubtract;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { storageUsedBytes: newValue }
    });
  }

  async checkFeature(tenantId: string, featureKey: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { 
        subscriptions: { where: { status: 'active' }, include: { plan: true }, take: 1 } 
      }
    });

    if (!tenant) return false;

    if (tenant.customFeatures) {
      const customFeatures = tenant.customFeatures as string[];
      if (Array.isArray(customFeatures) && customFeatures.includes(featureKey)) {
        return true;
      }
    }

    const activePlan = tenant.subscriptions?.[0]?.plan;
    if (activePlan?.features) {
      const planFeatures = activePlan.features as string[];
      if (Array.isArray(planFeatures) && planFeatures.includes(featureKey)) {
        return true;
      }
    }

    return false;
  }
}

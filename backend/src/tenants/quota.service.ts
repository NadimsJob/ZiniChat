import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  /**
   * Message Quota = Outbound Messages (agent + AI) + Broadcast Recipients (non-failed)
   * Period = subscription billing period (currentPeriodStart → currentPeriodEnd)
   * Resets automatically when subscription renews because period start changes.
   */
  async checkMessageQuota(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new ForbiddenException('Tenant not found');
    if (tenant.status === 'suspended') throw new ForbiddenException('Account suspended');

    const { periodStart, messageQuota } = await this.billingService.getActivePeriod(tenantId);
    const used = await this.getMessageUsage(tenantId, periodStart);

    if (used >= messageQuota) {
      throw new ForbiddenException(`Message quota exceeded (${used}/${messageQuota}). Please upgrade your plan.`);
    }
  }

  /** Public passthrough so other services can get active period without depending on BillingService directly */
  async getActivePeriodForTenant(tenantId: string) {
    return this.billingService.getActivePeriod(tenantId);
  }

  /**
   * Returns total outbound messages + broadcast recipients in the current billing period.
   * Exported so stats services can use it without re-implementing.
   */
  async getMessageUsage(tenantId: string, periodStart: Date): Promise<number> {
    const [directMessages, broadcastMessages] = await Promise.all([
      // Direct outbound messages (agent + AI replies)
      this.prisma.message.count({
        where: {
          direction: 'outbound',
          conversation: { tenantId },
          createdAt: { gte: periodStart }
        }
      }),
      // Broadcast messages (sent/delivered, not failed/pending)
      this.prisma.broadcastRecipient.count({
        where: {
          broadcast: { 
            tenantId,
            createdAt: { gte: periodStart }
          },
          status: { notIn: ['pending', 'failed'] }
        }
      })
    ]);

    return directMessages + broadcastMessages;
  }

  /**
   * AI Quota = number of AI auto-replies logged in the billing period.
   */
  async checkAiQuota(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new ForbiddenException('Tenant not found');
    if (tenant.status === 'suspended') throw new ForbiddenException('Account suspended');

    const { periodStart, aiQuota } = await this.billingService.getActivePeriod(tenantId);

    const aiUsed = await this.prisma.aiUsageLog.count({
      where: {
        tenantId,
        createdAt: { gte: periodStart }
      }
    });

    if (aiUsed >= aiQuota) {
      throw new ForbiddenException(`AI quota exceeded (${aiUsed}/${aiQuota}). Please upgrade your plan.`);
    }
  }

  // --- Storage Quota (unchanged) ---

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

  async resetStorage(tenantId: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { storageUsedBytes: BigInt(0) }
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

    if (tenant.customFeatures !== null) {
      const customFeatures = tenant.customFeatures as string[];
      return Array.isArray(customFeatures) && customFeatures.includes(featureKey);
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


import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmtpService } from '../smtp/smtp.service';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly notificationsService: NotificationsService,
    private readonly smtpService: SmtpService,
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
      // Notify tenant admins/owners (fire & forget)
      this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } })
        .then(admins => {
          for (const admin of admins) {
            this.notificationsService.createNotification(
              admin.id,
              '🚨 Message Quota Limit Reached',
              `Your monthly message quota has been fully used (${used}/${messageQuota}). Please upgrade your plan to continue sending messages.`,
              'system'
            ).catch(() => {});
          }
        })
        .catch(() => {});
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
   * Checks if tenant subscription or trial is active.
   * Returns { isActive: true } if within trialEndsAt or has active/trialing subscription with periodEnd > NOW().
   * Returns { isActive: false, reason: 'SUBSCRIPTION_EXPIRED' | 'TENANT_SUSPENDED' | 'TENANT_NOT_FOUND' } otherwise.
   */
  async isTenantSubscriptionActive(tenantId: string): Promise<{ isActive: boolean; reason?: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: {
            status: { in: ['active', 'trialing'] },
            currentPeriodEnd: { gt: new Date() }
          },
          take: 1
        }
      }
    });

    if (!tenant) {
      return { isActive: false, reason: 'TENANT_NOT_FOUND' };
    }

    if (tenant.status === 'suspended') {
      return { isActive: false, reason: 'TENANT_SUSPENDED' };
    }

    const now = new Date();
    const isWithinTrial = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) > now : false;
    const hasActiveSubscription = Array.isArray(tenant.subscriptions) && tenant.subscriptions.length > 0;

    if (isWithinTrial || hasActiveSubscription) {
      return { isActive: true };
    }

    return { isActive: false, reason: 'SUBSCRIPTION_EXPIRED' };
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
      // Notify tenant admins/owners (fire & forget)
      this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } })
        .then(admins => {
          for (const admin of admins) {
            this.notificationsService.createNotification(
              admin.id,
              '🚨 AI Quota Limit Reached',
              `Your monthly AI response quota has been fully used (${aiUsed}/${aiQuota}). Please upgrade your plan to continue using AI auto-replies.`,
              'system'
            ).catch(() => {});
          }
        })
        .catch(() => {});
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

    // Calculate usage percentage for warnings
    const usagePercent = limitBytes > BigInt(0)
      ? Number((totalBytes * BigInt(100)) / limitBytes)
      : 0;
    const usedMb = (Number(usedBytes) / (1024 * 1024)).toFixed(1);
    const limitMbStr = String(limitMb);

    // ── 100% Warning (fire & forget) ──────────────────────────────
    if (usagePercent >= 100 && !tenant.storageWarning100Notified) {
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { storageWarning100Notified: true }
      }).catch(() => {});

      // Fetch owner/admin users for email notifications
      this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } })
        .then(admins => {
          for (const admin of admins) {
            this.notificationsService.createNotification(
              admin.id,
              '🚨 স্টোরেজ সম্পূর্ণ পূর্ণ! ফাইল আপলোড বন্ধ',
              `আপনার স্টোরেজ ${usedMb} MB / ${limitMbStr} MB — সম্পূর্ণ পূর্ণ। নতুন ফাইল আপলোড করতে পুরনো ফাইল মুছুন বা প্ল্যান আপগ্রেড করুন।`,
              'system'
            ).catch(() => {});

            if (admin.email) {
              this.smtpService.triggerStorageWarningEmail(
                admin.email,
                tenant.name || tenant.slug,
                100,
                usedMb,
                limitMbStr
              ).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }

    // ── 80% Warning (fire & forget, only if 100% not yet hit) ─────
    if (usagePercent >= 80 && usagePercent < 100 && !tenant.storageWarning80Notified) {
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { storageWarning80Notified: true }
      }).catch(() => {});

      this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } })
        .then(admins => {
          for (const admin of admins) {
            this.notificationsService.createNotification(
              admin.id,
              '⚠️ স্টোরেজ ৮০% পূর্ণ হয়ে গেছে',
              `আপনার স্টোরেজ ${usedMb} MB / ${limitMbStr} MB (${usagePercent}%) ব্যবহৃত হয়েছে। পুরনো ফাইল মুছুন অথবা প্ল্যান আপগ্রেড করুন।`,
              'system'
            ).catch(() => {});

            if (admin.email) {
              this.smtpService.triggerStorageWarningEmail(
                admin.email,
                tenant.name || tenant.slug,
                usagePercent,
                usedMb,
                limitMbStr
              ).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }

    // ── Block upload if over limit ─────────────────────────────────
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

    // Calculate new usage percent to determine if we should reset warning flags
    const limitMb = tenant.customStorageLimitMb ?? 500;
    const limitBytes = BigInt(limitMb) * BigInt(1024 * 1024);
    const newPercent = limitBytes > BigInt(0)
      ? Number((newValue * BigInt(100)) / limitBytes)
      : 0;

    const resetFlags: any = { storageUsedBytes: newValue };
    // Reset 80% flag so user gets warned again if they fill up again
    if (newPercent < 80) resetFlags.storageWarning80Notified = false;
    // Reset 100% flag if below 100%
    if (newPercent < 100) resetFlags.storageWarning100Notified = false;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: resetFlags
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

  /**
   * Product Catalog Quota = total products created by tenant
   */
  async checkProductCatalogQuota(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new ForbiddenException('Tenant not found');
    if (tenant.status === 'suspended') throw new ForbiddenException('Account suspended');

    const quotas = await this.billingService.getTenantQuotas(tenantId);
    const currentCount = await this.prisma.product.count({ where: { tenantId } });

    if (currentCount >= quotas.productCatalogLimit) {
      // Notify tenant admins/owners (fire & forget)
      this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } })
        .then(admins => {
          for (const admin of admins) {
            this.notificationsService.createNotification(
              admin.id,
              '🚨 Product Catalog Limit Reached',
              `Your product catalog limit has been reached (${currentCount}/${quotas.productCatalogLimit}). Upgrade your plan to add more products.`,
              'system'
            ).catch(() => {});
          }
        })
        .catch(() => {});
      throw new ForbiddenException(
        `Product catalog limit reached (${currentCount}/${quotas.productCatalogLimit}). Upgrade your plan to add more products.`
      );
    }
  }
}


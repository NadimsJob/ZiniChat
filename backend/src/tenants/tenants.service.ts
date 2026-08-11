import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmtpService } from '../smtp/smtp.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
    private notificationsService: NotificationsService,
    private smtpService: SmtpService,
    private jwtService: JwtService,
  ) {}

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

    const defaultAiConfig = await this.prisma.aiConfig.findFirst({ where: { isActive: true } }) || await this.prisma.aiConfig.findFirst();

    return tenants.map(t => {
      const activeSub = t.subscriptions.find((s: any) => s.status === 'active' || s.status === 'trialing');
      const latestSub = t.subscriptions[0];
      const effectivePlan = activeSub?.plan || defaultPlan || latestSub?.plan || null;
      const subStatus = activeSub ? activeSub.status : (latestSub ? latestSub.status : 'none');
      const aiLimit = t.customAiQuota ?? effectivePlan?.aiQuota ?? 50;
      const aiUsed = t.usageLogs.length;

      const isCustomized = t.customFeatures !== null || 
        t.customPriceUsd !== null || 
        t.customMessageQuota !== null || 
        t.customPlanName !== null || 
        t.customSeatLimit !== null || 
        t.customWhatsappLimit !== null ||
        t.customMessengerLimit !== null ||
        t.customInstagramLimit !== null ||
        t.customWebsiteWidgetLimit !== null ||
        t.customStorageLimitMb !== null ||
        t.customProductCatalogLimit !== null ||
        t.customContactsLimit !== null ||
        t.customAllowByok !== null;

      return {
        id: t.id,
        name: t.businessName,
        email: t.users[0]?.email || 'N/A',
        ownerName: t.users[0]?.name || 'Unknown',
        createdAt: t.createdAt,
        status: t.status,
        _count: t._count,
        customAiConfigId: t.customAiConfigId || defaultAiConfig?.id || null,
        hasByok: t.assistants.some(a => a.byokApiKeyEncrypted !== null),
        aiQuota: {
          limit: aiLimit,
          used: aiUsed
        },
        subscriptionStatus: subStatus,
        currentPeriodEnd: (activeSub || latestSub)?.currentPeriodEnd || null,
        logoUrl: (t as any).logoUrl || null,
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
        customWebsiteWidgetLimit: t.customWebsiteWidgetLimit,
        customProductCatalogLimit: t.customProductCatalogLimit,
        customContactsLimit: t.customContactsLimit,
        customAllowByok: t.customAllowByok,
        customFeatures: t.customFeatures,
        customPlanUpdatedAt: t.customPlanUpdatedAt,
        customPlanUpdatedBy: t.customPlanUpdatedBy,
        isCustomized,
        trialEndsAt: t.trialEndsAt,
        basePlan: effectivePlan
      };
    });
  }

  async getPublicClientLogos() {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        businessName: true,
        brandName: true,
        logoUrl: true,
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return tenants
      .filter((t: any) => t.businessName || t.logoUrl)
      .map((t: any) => ({
        id: t.id,
        name: t.brandName || t.businessName,
        logoUrl: t.logoUrl || null,
      }));
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

  async getForCustomizeModal(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true }
        },
        subscriptions: {
          orderBy: { currentPeriodEnd: 'desc' },
          include: { plan: true }
        }
      }
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const quotas = await this.billingService.getTenantQuotas(id);
    const activeSub = tenant.subscriptions.find((s: any) => s.status === 'active' || s.status === 'trialing');
    const basePlan = activeSub?.plan || tenant.subscriptions[0]?.plan || null;

    // Current usage calculations
    const { periodStart } = await this.billingService.getActivePeriod(id);
    
    const [directMessages, broadcastMessages, aiUsed, productsCount, contactsCount] = await Promise.all([
      this.prisma.message.count({
        where: { direction: 'outbound', conversation: { tenantId: id }, createdAt: { gte: periodStart } }
      }),
      this.prisma.broadcastRecipient.count({
        where: { broadcast: { tenantId: id, createdAt: { gte: periodStart } }, status: { notIn: ['pending', 'failed'] } }
      }),
      this.prisma.aiUsageLog.count({
        where: { tenantId: id, createdAt: { gte: periodStart } }
      }),
      this.prisma.product.count({ where: { tenantId: id } }),
      this.prisma.contact.count({ where: { tenantId: id } })
    ]);

    const messagesUsed = directMessages + broadcastMessages;
    const seatsUsed = tenant.users.length;
    const storageUsedMb = Math.round(Number(tenant.storageUsedBytes) / (1024 * 1024));

    return {
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        brandName: tenant.brandName,
        logoUrl: tenant.logoUrl,
        customPlanName: tenant.customPlanName,
        customPriceUsd: tenant.customPriceUsd,
        customMessageQuota: tenant.customMessageQuota,
        customAiQuota: tenant.customAiQuota,
        customSeatLimit: tenant.customSeatLimit,
        customStorageLimitMb: tenant.customStorageLimitMb,
        customWhatsappLimit: tenant.customWhatsappLimit,
        customMessengerLimit: tenant.customMessengerLimit,
        customInstagramLimit: tenant.customInstagramLimit,
        customWebsiteWidgetLimit: tenant.customWebsiteWidgetLimit,
        customProductCatalogLimit: tenant.customProductCatalogLimit,
        customContactsLimit: tenant.customContactsLimit,
        customAllowByok: tenant.customAllowByok,
        customFeatures: tenant.customFeatures,
        customPlanUpdatedAt: tenant.customPlanUpdatedAt,
        customPlanUpdatedBy: tenant.customPlanUpdatedBy,
        trialEndsAt: tenant.trialEndsAt,
      },
      basePlan,
      currentUsage: {
        seatsUsed,
        messagesUsed,
        aiUsed,
        storageUsedMb,
        currentWhatsapp: quotas.currentWhatsapp,
        currentMessenger: quotas.currentMessenger,
        currentInstagram: quotas.currentInstagram,
        currentWebsiteWidget: quotas.currentWebsiteWidget,
        productsCount,
        contactsCount,
      }
    };
  }

  async getEffectivePlan(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: { where: { role: { in: ['owner', 'admin'] } }, select: { name: true, email: true } }
      }
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const quotas = await this.billingService.getTenantQuotas(tenantId);
    
    // Resolve email of superadmin who updated custom plan if set
    let customPlanUpdatedByEmail: string | null = null;
    if (tenant.customPlanUpdatedBy) {
      const actor = await this.prisma.user.findUnique({
        where: { id: tenant.customPlanUpdatedBy },
        select: { email: true, name: true }
      });
      if (actor) customPlanUpdatedByEmail = actor.email;
    }

    const isCustomized = tenant.customFeatures !== null || 
      tenant.customPriceUsd !== null || 
      tenant.customMessageQuota !== null || 
      tenant.customPlanName !== null || 
      tenant.customSeatLimit !== null || 
      tenant.customWhatsappLimit !== null ||
      tenant.customMessengerLimit !== null ||
      tenant.customInstagramLimit !== null ||
      tenant.customStorageLimitMb !== null ||
      tenant.customProductCatalogLimit !== null ||
      tenant.customContactsLimit !== null ||
      tenant.customAllowByok !== null;

    return {
      isCustomized,
      customPlanUpdatedAt: tenant.customPlanUpdatedAt,
      customPlanUpdatedByEmail,
      planName: tenant.customPlanName || quotas.basePlan?.name || 'Standard Plan',
      seatLimit: quotas.seatLimit,
      whatsappLimit: quotas.whatsappLimit,
      messengerLimit: quotas.messengerLimit,
      instagramLimit: quotas.instagramLimit,
      websiteWidgetLimit: quotas.websiteWidgetLimit,
      messageQuota: quotas.messageQuota,
      aiQuota: quotas.aiQuota,
      storageLimitMb: quotas.storageLimitMb,
      productCatalogLimit: quotas.productCatalogLimit,
      contactsLimit: quotas.contactsLimit,
      allowByok: quotas.allowByok,
      features: quotas.features,
      basePlan: quotas.basePlan,
    };
  }

  async updateStatus(id: string, status: string, actorUserId: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status },
      include: {
        users: { where: { role: { in: ['owner', 'admin'] } }, select: { id: true, email: true } }
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        targetTenantId: id,
        action: `UPDATED_TENANT_STATUS_TO_${status.toUpperCase()}`,
        metadataJson: { newStatus: status },
      },
    });

    // Notify tenant admins/owners
    const statusLabel = status === 'suspended' ? 'Suspended' : status === 'active' ? 'Reactivated' : status;
    const notifTitle = status === 'suspended' ? '⚠️ Account Suspended' : '✅ Account Reactivated';
    const notifMsg = status === 'suspended'
      ? 'Your ZiniChat account has been suspended. Please contact support for assistance.'
      : `Your ZiniChat account status has been updated to: ${statusLabel}.`;

    for (const user of (tenant as any).users || []) {
      this.notificationsService.createNotification(user.id, notifTitle, notifMsg, 'system').catch(() => {});
    }

    return tenant;
  }

  async customizePlan(id: string, data: any, actorUserId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { where: { role: { in: ['owner', 'admin'] } }, select: { id: true, email: true, name: true } }
      }
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    // Validation 1: customMessageQuota cannot be less than current usage this period
    if (data.customMessageQuota !== undefined && data.customMessageQuota !== null) {
      const newQuota = parseInt(String(data.customMessageQuota), 10);
      if (!isNaN(newQuota)) {
        const { periodStart } = await this.billingService.getActivePeriod(id);
        const [directMessages, broadcastMessages] = await Promise.all([
          this.prisma.message.count({
            where: { direction: 'outbound', conversation: { tenantId: id }, createdAt: { gte: periodStart } }
          }),
          this.prisma.broadcastRecipient.count({
            where: { broadcast: { tenantId: id, createdAt: { gte: periodStart } }, status: { notIn: ['pending', 'failed'] } }
          })
        ]);
        const currentUsage = directMessages + broadcastMessages;
        if (newQuota < currentUsage) {
          throw new BadRequestException(
            `Cannot reduce message quota to ${newQuota}. Tenant has already used ${currentUsage} messages in the current billing period.`
          );
        }
      }
    }

    // Validation 2: customSeatLimit cannot be less than current active team members
    if (data.customSeatLimit !== undefined && data.customSeatLimit !== null) {
      const newSeats = parseInt(String(data.customSeatLimit), 10);
      if (!isNaN(newSeats)) {
        if (newSeats < 1) {
          throw new BadRequestException('Seat limit must be at least 1.');
        }
        const activeUsersCount = await this.prisma.user.count({
          where: { tenantId: id }
        });
        if (newSeats < activeUsersCount) {
          throw new BadRequestException(
            `Cannot reduce seat limit to ${newSeats}. Tenant currently has ${activeUsersCount} active team members.`
          );
        }
      }
    }
    if (data.customAiQuota !== undefined && data.customAiQuota !== null && parseInt(String(data.customAiQuota), 10) < 0) {
      throw new BadRequestException('AI quota cannot be negative.');
    }
    if (data.customStorageLimitMb !== undefined && data.customStorageLimitMb !== null && parseInt(String(data.customStorageLimitMb), 10) < 10) {
      throw new BadRequestException('Storage limit must be at least 10 MB.');
    }

    const updateData: any = {
      customPlanUpdatedAt: new Date(),
      customPlanUpdatedBy: actorUserId,
    };

    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.businessName !== undefined) updateData.businessName = data.businessName;
    if (data.brandName !== undefined) updateData.brandName = data.brandName;
    if (data.customPlanName !== undefined) updateData.customPlanName = data.customPlanName;
    if (data.customPriceUsd !== undefined) updateData.customPriceUsd = data.customPriceUsd;
    if (data.customMessageQuota !== undefined) updateData.customMessageQuota = data.customMessageQuota;
    if (data.customAiQuota !== undefined) updateData.customAiQuota = data.customAiQuota;
    if (data.customSeatLimit !== undefined) updateData.customSeatLimit = data.customSeatLimit;
    if (data.customStorageLimitMb !== undefined) updateData.customStorageLimitMb = data.customStorageLimitMb;
    if (data.customWhatsappLimit !== undefined) updateData.customWhatsappLimit = data.customWhatsappLimit;
    if (data.customMessengerLimit !== undefined) updateData.customMessengerLimit = data.customMessengerLimit;
    if (data.customInstagramLimit !== undefined) updateData.customInstagramLimit = data.customInstagramLimit;
    if (data.customWebsiteWidgetLimit !== undefined) updateData.customWebsiteWidgetLimit = data.customWebsiteWidgetLimit;
    if (data.customProductCatalogLimit !== undefined) updateData.customProductCatalogLimit = data.customProductCatalogLimit;
    if (data.customContactsLimit !== undefined) updateData.customContactsLimit = data.customContactsLimit;
    if (data.customFeatures !== undefined) updateData.customFeatures = data.customFeatures === null ? Prisma.DbNull : data.customFeatures;
    if (data.customAllowByok !== undefined) updateData.customAllowByok = data.customAllowByok;
    if (data.billingCycleStart !== undefined) updateData.trialEndsAt = new Date(data.billingCycleStart);

    const updatedTenant = await this.prisma.tenant.update({
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

    // Notify tenant admins/owners
    const notificationTitle = 'Your Subscription Plan Limits Have Been Updated';
    const notificationMsg = `ZiniChat Support has updated your subscription plan limits. Check your Subscription settings for details.`;

    const customDetailsList: string[] = [];
    if (data.customSeatLimit !== undefined) customDetailsList.push(`• Team Members: ${data.customSeatLimit}`);
    if (data.customMessageQuota !== undefined) customDetailsList.push(`• Message Quota: ${data.customMessageQuota}/mo`);
    if (data.customAiQuota !== undefined) customDetailsList.push(`• AI Responses: ${data.customAiQuota}/mo`);
    if (data.customWhatsappLimit !== undefined) customDetailsList.push(`• WhatsApp Channels: ${data.customWhatsappLimit}`);
    if (data.customMessengerLimit !== undefined) customDetailsList.push(`• Messenger Channels: ${data.customMessengerLimit}`);
    if (data.customInstagramLimit !== undefined) customDetailsList.push(`• Instagram Channels: ${data.customInstagramLimit}`);
    if (data.customStorageLimitMb !== undefined) customDetailsList.push(`• Storage: ${data.customStorageLimitMb} MB`);
    
    const customDetailsStr = customDetailsList.length > 0 ? customDetailsList.join('\n') : '• Custom plan overrides applied.';

    for (const u of tenant.users) {
      try {
        await this.notificationsService.createNotification(u.id, notificationTitle, notificationMsg, 'info');
      } catch (e) {
        console.error(`Failed to create notification for user ${u.id}:`, e);
      }

      if (u.email) {
        try {
          await this.smtpService.triggerPlanCustomizedEmail(u.email, tenant.businessName, customDetailsStr);
        } catch (e) {
          console.error(`Failed to send customization email to ${u.email}:`, e);
        }
      }
    }

    return updatedTenant;
  }

  async resetCustomizations(id: string, actorUserId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { where: { role: { in: ['owner', 'admin'] } }, select: { id: true, email: true } }
      }
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const resetData = {
      customPlanName: null,
      customPriceUsd: null,
      customMessageQuota: null,
      customAiQuota: null,
      customStorageLimitMb: null,
      customSeatLimit: null,
      customWhatsappLimit: null,
      customMessengerLimit: null,
      customInstagramLimit: null,
      customWebsiteWidgetLimit: null,
      customProductCatalogLimit: null,
      customContactsLimit: null,
      customFeatures: Prisma.DbNull,
      customAllowByok: null,
      customPlanUpdatedAt: new Date(),
      customPlanUpdatedBy: actorUserId,
    };

    const updatedTenant = await this.prisma.tenant.update({
      where: { id },
      data: resetData,
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        targetTenantId: id,
        action: 'RESET_TENANT_CUSTOM_PLAN',
        metadataJson: { resetToDefault: true },
      },
    });

    // Notify tenant admins/owners
    for (const u of tenant.users) {
      try {
        await this.notificationsService.createNotification(
          u.id,
          'Plan Customizations Reset to Default',
          'Your account limits have been reset to your base plan default values.',
          'info'
        );
      } catch (e) {}
    }

    return updatedTenant;
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

  async impersonateTenant(id: string, actorUserId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const targetUser = tenant.users.find(u => u.role === 'owner') ||
                       tenant.users.find(u => u.role === 'admin') ||
                       tenant.users[0];

    if (!targetUser) {
      throw new BadRequestException('No active user found for this tenant');
    }

    const payload = {
      email: targetUser.email,
      sub: targetUser.id,
      role: targetUser.role,
      tenantId: targetUser.tenantId,
      permissions: targetUser.permissions || [],
      impersonatedBy: actorUserId,
    };

    const impersonationToken = this.jwtService.sign(payload, { expiresIn: '2h' });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        targetTenantId: id,
        action: 'SUPERADMIN_IMPERSONATED_TENANT',
        metadataJson: {
          targetUserId: targetUser.id,
          targetUserEmail: targetUser.email,
          tenantName: tenant.name,
        },
      },
    });

    return {
      access_token: impersonationToken,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
    };
  }
}


import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private smtpService: SmtpService,
    private notificationsService: NotificationsService,
  ) {}

  async getConfig() {
    let config = await this.prisma.paymentGatewayConfig.findFirst();
    if (!config) {
      config = await this.prisma.paymentGatewayConfig.create({ data: {} });
    }
    return config;
  }

  async updateConfig(data: any) {
    const config = await this.getConfig();
    return this.prisma.paymentGatewayConfig.update({ where: { id: config.id }, data });
  }

  private async getTenantAdminsAndOwners(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, role: { in: ['owner', 'admin'] } }
    });
  }

  async submitManualPayment(tenantId: string, planId: string, trxId: string, billingCycle: string, couponCode?: string) {
    // 1. Get plan info
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new BadRequestException('Plan not found');

    const successfulPaymentsCount = await this.prisma.payment.count({
      where: { tenantId, subscription: { planId }, status: 'success' }
    });

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    let amount = billingCycle === 'yearly' ? Number(plan.priceYearlyBdt) : Number(plan.priceMonthlyBdt);
    
    // Only use tenant.customPriceUsd if plan price is zero (custom quote plan)
    if (amount === 0 && tenant?.customPriceUsd) {
      const currencyRateInfo = await this.prisma.exchangeRate.findFirst({
        where: { effectiveDate: { lte: new Date() } },
        orderBy: { effectiveDate: 'desc' }
      });
      const rate = currencyRateInfo ? Number(currencyRateInfo.rate) : 121.0;
      const customMonthlyBdt = Number(tenant.customPriceUsd) * rate;
      amount = billingCycle === 'yearly' ? customMonthlyBdt * 12 : customMonthlyBdt;
    } else {
      if (billingCycle === 'monthly' && plan.promoPriceMonthlyBdt && plan.promoMonths) {
        if (successfulPaymentsCount < plan.promoMonths) {
          amount = Number(plan.promoPriceMonthlyBdt);
        }
      }
    }
    
    let couponId = null;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (coupon && coupon.isActive && (!coupon.validUntil || coupon.validUntil > new Date()) && (!coupon.maxUses || coupon.usedCount < coupon.maxUses) && (!coupon.tenantId || coupon.tenantId === tenantId)) {
        couponId = coupon.id;
        if (coupon.discountType === 'percentage') {
          amount = amount - (amount * (Number(coupon.discountAmount) / 100));
        } else {
          amount = amount - Number(coupon.discountAmount);
        }
        if (amount < 0) amount = 0;
        await this.prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: coupon.usedCount + 1 } });
      }
    }

    // 2. Create or update subscription
    let subscription = await this.prisma.subscription.findFirst({ where: { tenantId, planId } });
    const periodDays = billingCycle === 'yearly' ? 365 : 30;
    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: { tenantId, planId, billingCycle, couponId, status: 'pending', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000) }
      });
    } else {
      subscription = await this.prisma.subscription.update({
        where: { id: subscription.id }, data: { status: 'pending', billingCycle, couponId }
      });
    }

    // 3. Create Payment record (exact amount, no fraction offset)
    const payment = await this.prisma.payment.create({
      data: { 
        tenantId, 
        subscriptionId: subscription.id, 
        amountBdt: amount, 
        baseAmountBdt: amount, 
        provider: 'manual', 
        status: 'pending', 
        trxId,
        gatewayResponse: { message: 'Invoice created' }
      }
    });

    // 4. Get tenant owner/admin info
    const admins = await this.getTenantAdminsAndOwners(tenantId);

    // 5. Send emails (fire & forget)
    if (!trxId.startsWith('PENDING_')) {
      for (const admin of admins) {
        this.smtpService.triggerPaymentSubmittedEmail(
          admin.email, tenant?.businessName || 'Tenant', String(amount), trxId
        ).catch(() => {});
      }
      this.smtpService.triggerPaymentPendingAdminEmail(
        tenant?.businessName || 'Tenant', String(amount), trxId
      ).catch(() => {});
    }

    // 6. In-app notifications
    if (!trxId.startsWith('PENDING_')) {
      for (const admin of admins) {
        await this.notificationsService.createNotification(
          admin.id,
          '✅ পেমেন্ট সাবমিট হয়েছে',
          `আপনার পেমেন্ট (TrxID: ${trxId}) গ্রহণ করা হয়েছে। অনুমোদনের অপেক্ষায় আছে।`,
          'billing'
        );
      }
      await this.notificationsService.createSystemNotificationForSuperadmins(
        '🔔 নতুন পেমেন্ট ভেরিফিকেশন',
        `${tenant?.businessName || 'একটি টেন্যান্ট'} TrxID "${trxId}" দিয়ে ${amount} BDT পেমেন্ট সাবমিট করেছে।`,
        'billing'
      );
    }

    return payment;
  }

  async submitSandboxPayment(tenantId: string, planId: string, billingCycle: string, couponCode?: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new BadRequestException('Plan not found');

    const successfulPaymentsCount = await this.prisma.payment.count({
      where: { tenantId, subscription: { planId }, status: 'success' }
    });

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    let amount = billingCycle === 'yearly' ? Number(plan.priceYearlyBdt) : Number(plan.priceMonthlyBdt);
    
    // Only use tenant.customPriceUsd if plan price is zero (custom quote plan)
    if (amount === 0 && tenant?.customPriceUsd) {
      const currencyRateInfo = await this.prisma.exchangeRate.findFirst({
        where: { effectiveDate: { lte: new Date() } },
        orderBy: { effectiveDate: 'desc' }
      });
      const rate = currencyRateInfo ? Number(currencyRateInfo.rate) : 121.0;
      const customMonthlyBdt = Number(tenant.customPriceUsd) * rate;
      amount = billingCycle === 'yearly' ? customMonthlyBdt * 12 : customMonthlyBdt;
    } else {
      if (billingCycle === 'monthly' && plan.promoPriceMonthlyBdt && plan.promoMonths) {
        if (successfulPaymentsCount < plan.promoMonths) {
          amount = Number(plan.promoPriceMonthlyBdt);
        }
      }
    }
    let couponId = null;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (coupon && coupon.isActive && (!coupon.validUntil || coupon.validUntil > new Date()) && (!coupon.maxUses || coupon.usedCount < coupon.maxUses) && (!coupon.tenantId || coupon.tenantId === tenantId)) {
        couponId = coupon.id;
        if (coupon.discountType === 'percentage') {
          amount = amount - (amount * (Number(coupon.discountAmount) / 100));
        } else {
          amount = amount - Number(coupon.discountAmount);
        }
        if (amount < 0) amount = 0;
        await this.prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: coupon.usedCount + 1 } });
      }
    }

    // Helper method to calculate carried forward quotas upon renewal
    let carriedForwardAi = 0;
    let carriedForwardMessage = 0;

    const previousSub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'expired'] } },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' }
    });

    if (previousSub && previousSub.plan && Number(previousSub.plan.priceMonthlyBdt) > 0) {
      const pStart = previousSub.currentPeriodStart;
      const [aiUsed, directMsgUsed, broadcastMsgUsed] = await Promise.all([
        this.prisma.aiUsageLog.count({
          where: { tenantId, createdAt: { gte: pStart } }
        }),
        this.prisma.message.count({
          where: { direction: 'outbound', conversation: { tenantId }, createdAt: { gte: pStart } }
        }),
        this.prisma.broadcastRecipient.count({
          where: { broadcast: { tenantId, createdAt: { gte: pStart } }, status: { notIn: ['pending', 'failed'] } }
        })
      ]);

      const totalMsgUsed = directMsgUsed + broadcastMsgUsed;
      const totalAiQuota = (tenant?.customAiQuota ?? previousSub.plan.aiQuota) + (previousSub.carriedForwardAiQuota || 0);
      const totalMsgQuota = (tenant?.customMessageQuota ?? previousSub.plan.messageQuota) + (previousSub.carriedForwardMessageQuota || 0);

      carriedForwardAi = Math.max(0, totalAiQuota - aiUsed);
      carriedForwardMessage = Math.max(0, totalMsgQuota - totalMsgUsed);
    } else {
      // Free plan (priceMonthlyBdt === 0) or no previous sub -> reset carry forward to 0
      carriedForwardAi = 0;
      carriedForwardMessage = 0;
    }

    let subscription = await this.prisma.subscription.findFirst({ where: { tenantId, planId } });
    const periodDays = billingCycle === 'yearly' ? 365 : 30;
    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          tenantId,
          planId,
          billingCycle,
          couponId,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
          carriedForwardAiQuota: carriedForwardAi,
          carriedForwardMessageQuota: carriedForwardMessage,
        }
      });
    } else {
      subscription = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
          billingCycle,
          couponId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
          carriedForwardAiQuota: carriedForwardAi,
          carriedForwardMessageQuota: carriedForwardMessage,
        }
      });
    }
    const payment = await this.prisma.payment.create({
      data: { tenantId, subscriptionId: subscription.id, amountBdt: amount, provider: 'sandbox_bkash', status: 'success', gatewayResponse: { message: 'Sandbox success' } }
    });

    // Notify tenant
    const admins = await this.getTenantAdminsAndOwners(tenantId);
    for (const admin of admins) {
      this.smtpService.triggerPaymentApprovedEmail(
        admin.email, tenant?.businessName || 'Tenant', plan?.name || 'Sandbox Plan'
      ).catch(() => {});
      await this.notificationsService.createNotification(
        admin.id,
        '🎉 সাবস্ক্রিপশন সক্রিয়!',
        `আপনার "${plan?.name}" প্ল্যান সফলভাবে সক্রিয় হয়েছে।`,
        'billing'
      );
    }

    return payment;
  }

  async submitManualPaymentForAddon(tenantId: string, addonId: string, trxId: string) {
    const addon = await this.prisma.addon.findUnique({ where: { id: addonId } });
    if (!addon) throw new BadRequestException('Addon not found');

    const amount = Number(addon.priceBdt);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        addonId: addon.id,
        amountBdt: amount,
        baseAmountBdt: amount,
        provider: 'manual',
        status: 'pending',
        trxId
      }
    });

    const admins = await this.getTenantAdminsAndOwners(tenantId);

    if (!trxId.startsWith('PENDING_')) {
      for (const admin of admins) {
        this.smtpService.triggerPaymentSubmittedEmail(
          admin.email, tenant?.businessName || 'Tenant', String(amount), trxId
        ).catch(() => {});
        
        await this.notificationsService.createNotification(
          admin.id,
          '✅ অ্যাড-অন পেমেন্ট সাবমিট হয়েছে',
          `আপনার অ্যাড-অন পেমেন্ট (TrxID: ${trxId}) গ্রহণ করা হয়েছে। অনুমোদনের অপেক্ষায় আছে।`,
          'billing'
        );
      }
      await this.notificationsService.createSystemNotificationForSuperadmins(
        '🔔 নতুন অ্যাড-অন পেমেন্ট',
        `${tenant?.businessName || 'একটি টেন্যান্ট'} TrxID "${trxId}" দিয়ে ${amount} BDT পেমেন্ট সাবমিট করেছে।`,
        'billing'
      );
    }

    return payment;
  }

  async submitSandboxPaymentForAddon(tenantId: string, addonId: string) {
    const addon = await this.prisma.addon.findUnique({ where: { id: addonId } });
    if (!addon) throw new BadRequestException('Addon not found');

    const amount = Number(addon.priceBdt);
    const tenant = await this.prisma.tenant.findUnique({ 
      where: { id: tenantId },
      include: { plan: true }
    });

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        addonId: addon.id,
        amountBdt: amount,
        provider: 'sandbox_bkash',
        status: 'success',
        gatewayResponse: { message: 'Sandbox addon success' }
      }
    });

    let newLimit = 0;
    if (addon.type === 'ai_responses' || addon.type === 'ai_tokens') {
      const current = tenant?.customAiQuota ?? tenant?.plan?.aiQuota ?? 0;
      newLimit = current + addon.value;
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { customAiQuota: newLimit } });
    } else if (addon.type === 'messages') {
      const current = tenant?.customMessageQuota ?? tenant?.plan?.messageQuota ?? 0;
      newLimit = current + addon.value;
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { customMessageQuota: newLimit } });
    } else if (addon.type === 'seats') {
      const current = tenant?.customSeatLimit ?? tenant?.plan?.seatLimit ?? 0;
      newLimit = current + addon.value;
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { customSeatLimit: newLimit } });
    } else if (addon.type === 'storage') {
      const current = tenant?.customStorageLimitMb ?? tenant?.plan?.storageLimitMb ?? 0;
      newLimit = current + addon.value;
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { customStorageLimitMb: newLimit } });
    }

    const admins = await this.getTenantAdminsAndOwners(tenantId);
    for (const admin of admins) {
      this.smtpService.triggerAddonPurchasedEmail(
        admin.email, tenant?.businessName || 'Tenant', addon.name, String(amount)
      ).catch(() => {});
      await this.notificationsService.createNotification(
        admin.id,
        '🎉 অ্যাড-অন সক্রিয়!',
        `আপনার "${addon.name}" সফলভাবে কেনা হয়েছে।`,
        'billing'
      );
    }
    return payment;
  }

  async getTenantPaymentHistory(tenantId: string) {
    const activeSub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trialing'] } },
      include: { plan: true }
    });

    if (activeSub) {
      const pendingSubPayments = await this.prisma.payment.findMany({
        where: {
          tenantId,
          status: 'pending',
          subscriptionId: { not: null }
        },
        include: { subscription: true }
      });

      const idsToCancel: string[] = [];
      for (const p of pendingSubPayments) {
        if (p.subscription?.planId === activeSub.planId) {
          idsToCancel.push(p.id);
        }
      }

      if (idsToCancel.length > 0) {
        await this.prisma.payment.updateMany({
          where: { id: { in: idsToCancel } },
          data: { status: 'cancelled' }
        });
      }
    }

    return this.prisma.payment.findMany({
      where: { tenantId },
      include: {
        subscription: { include: { plan: true } },
        addon: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPendingManualPayments() {
    return this.prisma.payment.findMany({
      where: { status: 'pending', provider: 'manual' },
      include: { tenant: true, subscription: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async approveManualPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'pending') throw new BadRequestException('Payment is not pending');

    // Update payment
    await this.prisma.payment.update({ where: { id: paymentId }, data: { status: 'success' } });

    const admins = await this.getTenantAdminsAndOwners(payment.tenantId);
    const tenant = await this.prisma.tenant.findUnique({ 
      where: { id: payment.tenantId }, 
      include: { subscriptions: { include: { plan: true } } } 
    });

    if (payment.subscriptionId) {
      // Helper to calculate carried forward quotas upon manual approval
      let carriedForwardAi = 0;
      let carriedForwardMessage = 0;

      const previousSub = await this.prisma.subscription.findFirst({
        where: { tenantId: payment.tenantId, id: { not: payment.subscriptionId }, status: { in: ['active', 'expired'] } },
        include: { plan: true },
        orderBy: { currentPeriodEnd: 'desc' }
      });

      if (previousSub && previousSub.plan && Number(previousSub.plan.priceMonthlyBdt) > 0) {
        const pStart = previousSub.currentPeriodStart;
        const [aiUsed, directMsgUsed, broadcastMsgUsed] = await Promise.all([
          this.prisma.aiUsageLog.count({
            where: { tenantId: payment.tenantId, createdAt: { gte: pStart } }
          }),
          this.prisma.message.count({
            where: { direction: 'outbound', conversation: { tenantId: payment.tenantId }, createdAt: { gte: pStart } }
          }),
          this.prisma.broadcastRecipient.count({
            where: { broadcast: { tenantId: payment.tenantId, createdAt: { gte: pStart } }, status: { notIn: ['pending', 'failed'] } }
          })
        ]);

        const totalMsgUsed = directMsgUsed + broadcastMsgUsed;
        const totalAiQuota = (tenant?.customAiQuota ?? previousSub.plan.aiQuota) + (previousSub.carriedForwardAiQuota || 0);
        const totalMsgQuota = (tenant?.customMessageQuota ?? previousSub.plan.messageQuota) + (previousSub.carriedForwardMessageQuota || 0);

        carriedForwardAi = Math.max(0, totalAiQuota - aiUsed);
        carriedForwardMessage = Math.max(0, totalMsgQuota - totalMsgUsed);
      }

      // Subscription Payment
      const subscription = await this.prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          carriedForwardAiQuota: carriedForwardAi,
          carriedForwardMessageQuota: carriedForwardMessage,
        },
        include: { plan: true }
      });

      for (const admin of admins) {
        this.smtpService.triggerPaymentApprovedEmail(
          admin.email, tenant?.businessName || 'Tenant', subscription.plan?.name || 'Plan'
        ).catch(() => {});

        await this.notificationsService.createNotification(
          admin.id,
          '🎉 পেমেন্ট অনুমোদিত হয়েছে!',
          `আপনার "${subscription.plan?.name || 'Plan'}" সাবস্ক্রিপশন সক্রিয় হয়েছে।`,
          'billing'
        );
      }
    } else if (payment.addonId) {
      // Addon Payment
      const addon = await this.prisma.addon.findUnique({ where: { id: payment.addonId } });
      if (addon && tenant) {
        // Apply limits
        const activeSub = tenant.subscriptions?.find(s => s.status === 'active') || tenant.subscriptions?.[0];
        const currentMessageLimit = tenant.customMessageQuota ?? activeSub?.plan?.messageQuota ?? 0;
        const currentAiLimit = tenant.customAiQuota ?? activeSub?.plan?.aiQuota ?? 0;
        const currentStorageLimit = tenant.customStorageLimitMb ?? activeSub?.plan?.storageLimitMb ?? 0;
        
        const updates: any = {};
        if (addon.type === 'messages') updates.customMessageQuota = currentMessageLimit + addon.value;
        if (addon.type === 'ai_responses') updates.customAiQuota = currentAiLimit + addon.value;
        if (addon.type === 'storage') updates.customStorageLimitMb = currentStorageLimit + addon.value;
        
        await this.prisma.tenant.update({ where: { id: tenant.id }, data: updates });

        for (const admin of admins) {
          this.smtpService.triggerAddonPurchasedEmail(
            admin.email, tenant.businessName, addon.name, payment.amountBdt.toString()
          ).catch(() => {});

          await this.notificationsService.createNotification(
            admin.id,
            '🧩 অ্যাড-অন সক্রিয় হয়েছে!',
            `আপনার কেনা অ্যাড-অন (${addon.name}) অ্যাকাউন্টে যোগ করা হয়েছে।`,
            'billing'
          );
        }
      }
    }

    return { message: 'Payment approved' };
  }

  async rejectManualPayment(paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'pending') throw new BadRequestException('Payment is not pending');

    await this.prisma.payment.update({ where: { id: paymentId }, data: { status: 'failed' } });

    const admins = await this.getTenantAdminsAndOwners(payment.tenantId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: payment.tenantId } });

    for (const admin of admins) {
      this.smtpService.triggerPaymentRejectedEmail(
        admin.email, tenant?.businessName || 'Tenant', payment.trxId || 'N/A', reason
      ).catch(() => {});

      await this.notificationsService.createNotification(
        admin.id,
        '❌ পেমেন্ট বাতিল করা হয়েছে',
        `আপনার পেমেন্ট (TrxID: ${payment.trxId}) বাতিল করা হয়েছে।${reason ? ` কারণ: ${reason}` : ''}`,
        'billing'
      );
    }

    return { message: 'Payment rejected' };
  }

  async getUpcomingBill(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true }
    });

    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'trialing'] }
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' }
    });

    const plan = activeSub?.plan || tenant?.plan;
    const cycle = activeSub?.billingCycle || 'monthly';

    let amountBdt = 0;
    if (plan) {
      amountBdt = cycle === 'yearly'
        ? Number(plan.priceYearlyBdt || Number(plan.priceMonthlyBdt) * 12)
        : Number(plan.priceMonthlyBdt);
    } else if (tenant?.customPriceUsd) {
      const customPrice = Number(tenant.customPriceUsd);
      amountBdt = customPrice > 200 ? Math.round(customPrice) : Math.round(customPrice * 120);
    }


    const now = new Date();
    const nextBillDate = activeSub?.currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffTime = nextBillDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const pendingPayment = await this.prisma.payment.findFirst({
      where: {
        tenantId,
        status: 'pending',
        subscriptionId: activeSub?.id || undefined
      }
    });

    return {
      planName: tenant?.customPlanName || plan?.name || 'Free Plan',
      planId: plan?.id || null,
      billingCycle: cycle,
      amountBdt,
      nextBillDate,
      daysRemaining,
      hasPendingPayment: !!pendingPayment,
      pendingTrxId: pendingPayment?.trxId || null,
      isPaidAdvance: daysRemaining > 15 && activeSub?.status === 'active',
      status: activeSub?.status || 'inactive',
    };
  }
}


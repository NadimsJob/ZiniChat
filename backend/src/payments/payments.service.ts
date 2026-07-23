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

  async submitManualPayment(tenantId: string, planId: string, trxId: string, billingCycle: string, couponCode?: string) {
    // 1. Get plan info
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new BadRequestException('Plan not found');

    const successfulPaymentsCount = await this.prisma.payment.count({
      where: { tenantId, subscription: { planId }, status: 'success' }
    });

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    let amount = billingCycle === 'yearly' ? Number(plan.priceYearlyBdt) : Number(plan.priceMonthlyBdt);
    
    if (tenant?.customPriceUsd) {
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
      if (coupon && coupon.isActive && (!coupon.validUntil || coupon.validUntil > new Date()) && (!coupon.maxUses || coupon.usedCount < coupon.maxUses)) {
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
        data: { tenantId, planId, billingCycle, couponId, status: 'pending', currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000) }
      });
    } else {
      subscription = await this.prisma.subscription.update({
        where: { id: subscription.id }, data: { status: 'pending', billingCycle, couponId }
      });
    }

    // 3. Generate unique decimal offset to avoid same-amount collisions
    const pendingPayments = await this.prisma.payment.findMany({
      where: { status: 'pending', provider: { in: ['manual', 'bkash', 'nagad', 'rocket', 'upay', 'bangla_qr'] } },
      select: { amountBdt: true }
    });
    const usedAmounts = new Set(pendingPayments.map(p => Number(p.amountBdt).toFixed(2)));

    let finalAmount = amount;
    let foundUnique = false;
    for (let i = 1; i <= 99; i++) {
      const candidate = (amount + i / 100).toFixed(2);
      if (!usedAmounts.has(candidate)) {
        finalAmount = Number(candidate);
        foundUnique = true;
        break;
      }
    }
    if (!foundUnique) {
      finalAmount = Number((amount + (Math.floor(Math.random() * 99 + 1) / 100)).toFixed(2));
    }

    // 4. Create Payment record
    const payment = await this.prisma.payment.create({
      data: { 
        tenantId, 
        subscriptionId: subscription.id, 
        amountBdt: finalAmount, 
        baseAmountBdt: amount, 
        provider: 'manual', 
        status: 'pending', 
        trxId 
      }
    });

    // 4. Get tenant owner info
    const owner = await this.prisma.user.findFirst({ where: { tenantId, role: { in: ['owner', 'admin'] } } });

    // 5. Send emails (fire & forget)
    if (owner) {
      this.smtpService.triggerPaymentSubmittedEmail(
        owner.email, tenant?.businessName || 'Tenant', String(amount), trxId
      ).catch(() => {});
    }
    this.smtpService.triggerPaymentPendingAdminEmail(
      tenant?.businessName || 'Tenant', String(amount), trxId
    ).catch(() => {});

    // 6. In-app notifications
    if (owner) {
      await this.notificationsService.createNotification(
        owner.id,
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
    
    if (tenant?.customPriceUsd) {
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
      if (coupon && coupon.isActive && (!coupon.validUntil || coupon.validUntil > new Date()) && (!coupon.maxUses || coupon.usedCount < coupon.maxUses)) {
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

    let subscription = await this.prisma.subscription.findFirst({ where: { tenantId, planId } });
    const periodDays = billingCycle === 'yearly' ? 365 : 30;
    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: { tenantId, planId, billingCycle, couponId, status: 'active', currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000) }
      });
    } else {
      subscription = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'active', billingCycle, couponId, currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000) }
      });
    }
    const payment = await this.prisma.payment.create({
      data: { tenantId, subscriptionId: subscription.id, amountBdt: amount, provider: 'sandbox_bkash', status: 'success', gatewayResponse: { message: 'Sandbox success' } }
    });

    // Notify tenant
    const owner = await this.prisma.user.findFirst({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
    if (owner) {
      this.smtpService.triggerPaymentApprovedEmail(
        owner.email, tenant?.businessName || 'Tenant', plan?.name || 'Sandbox Plan'
      ).catch(() => {});
      await this.notificationsService.createNotification(
        owner.id,
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

    // Generate unique decimal offset
    const pendingPayments = await this.prisma.payment.findMany({
      where: { status: 'pending', provider: { in: ['manual', 'bkash', 'nagad', 'rocket', 'upay', 'bangla_qr'] } },
      select: { amountBdt: true }
    });
    const usedAmounts = new Set(pendingPayments.map(p => Number(p.amountBdt).toFixed(2)));

    let finalAmount = amount;
    let foundUnique = false;
    for (let i = 1; i <= 99; i++) {
      const candidate = (amount + i / 100).toFixed(2);
      if (!usedAmounts.has(candidate)) {
        finalAmount = Number(candidate);
        foundUnique = true;
        break;
      }
    }
    if (!foundUnique) {
      finalAmount = Number((amount + (Math.floor(Math.random() * 99 + 1) / 100)).toFixed(2));
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        addonId: addon.id,
        amountBdt: finalAmount,
        baseAmountBdt: amount,
        provider: 'manual',
        status: 'pending',
        trxId
      }
    });

    const owner = await this.prisma.user.findFirst({ where: { tenantId, role: { in: ['owner', 'admin'] } } });

    if (owner) {
      this.smtpService.triggerPaymentSubmittedEmail(
        owner.email, tenant?.businessName || 'Tenant', String(amount), trxId
      ).catch(() => {});
      
      await this.notificationsService.createNotification(
        owner.id,
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

    const owner = await this.prisma.user.findFirst({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
    if (owner) {
      if ((this.smtpService as any).triggerAddonPurchasedEmail) {
        (this.smtpService as any).triggerAddonPurchasedEmail(owner.email, tenant?.businessName || 'Tenant', addon.name, String(amount)).catch(() => {});
      }
      await this.notificationsService.createNotification(
        owner.id,
        '🎉 অ্যাড-অন সক্রিয়!',
        `আপনার "${addon.name}" সফলভাবে কেনা হয়েছে।`,
        'billing'
      );
    }
    return payment;
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

    const owner = await this.prisma.user.findFirst({ where: { tenantId: payment.tenantId, role: { in: ['owner', 'admin'] } } });
    const tenant = await this.prisma.tenant.findUnique({ 
      where: { id: payment.tenantId }, 
      include: { subscriptions: { include: { plan: true }, take: 1, orderBy: { createdAt: 'desc' } } } 
    });

    if (payment.subscriptionId) {
      // Subscription Payment
      const subscription = await this.prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        include: { plan: true }
      });

      if (owner) {
        this.smtpService.triggerPaymentApprovedEmail(
          owner.email, tenant?.businessName || 'Tenant', subscription.plan?.name || 'Plan'
        ).catch(() => {});

        await this.notificationsService.createNotification(
          owner.id,
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
        const activeSub = tenant.subscriptions?.[0];
        const currentMessageLimit = tenant.customMessageQuota ?? activeSub?.plan?.messageLimit ?? 0;
        const currentAiLimit = tenant.customAiQuota ?? activeSub?.plan?.aiResponseLimit ?? 0;
        const currentStorageLimit = tenant.customStorageLimitMb ?? activeSub?.plan?.storageLimitMb ?? 0;
        
        const updates: any = {};
        if (addon.type === 'messages') updates.customMessageQuota = currentMessageLimit + addon.value;
        if (addon.type === 'ai_responses') updates.customAiQuota = currentAiLimit + addon.value;
        if (addon.type === 'storage') updates.customStorageLimitMb = currentStorageLimit + addon.value;
        
        await this.prisma.tenant.update({ where: { id: tenant.id }, data: updates });

        if (owner) {
          this.smtpService.triggerAddonPurchasedEmail(
            owner.email, tenant.businessName, addon.name, payment.amountBdt.toString()
          ).catch(() => {});

          await this.notificationsService.createNotification(
            owner.id,
            '🧩 অ্যাড-অন সক্রিয় হয়েছে!',
            `আপনার কেনা অ্যাড-অন (${addon.name}) অ্যাকাউন্টে যোগ করা হয়েছে।`,
            'billing'
          );
        }
      }
    }

    return { message: 'Payment approved' };
  }
}

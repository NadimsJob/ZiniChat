import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MfsPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smtpService: SmtpService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Helper to calculate CRC-16 CCITT
  private calculateCrc16(data: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xFF;
      x ^= x >> 4;
      crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // Generates EMVCo compliant Bangla QR string
  generateBanglaQr(provider: string, number: string, amount: number, merchantId?: string): string {
    const formattedAmount = amount.toFixed(2);
    
    // Tag 00: Payload Format Indicator
    let payload = '000201';
    // Tag 01: Point of Initiation Method (12 = Dynamic QR)
    payload += '010212';
    
    // Tag 26: Merchant Account Information
    const guid = '0011BD.BANGLAQR';
    const panVal = merchantId || number;
    const panSubtag = '01' + panVal.length.toString().padStart(2, '0') + panVal;
    const merchantInfo = guid + panSubtag;
    payload += '26' + merchantInfo.length.toString().padStart(2, '0') + merchantInfo;
    
    // Tag 52: Merchant Category Code (e.g. 5732 for telecom)
    payload += '52045732';
    // Tag 53: Transaction Currency (050 = BDT)
    payload += '5303050';
    // Tag 54: Transaction Amount
    payload += '54' + formattedAmount.length.toString().padStart(2, '0') + formattedAmount;
    // Tag 58: Country Code
    payload += '5802BD';
    // Tag 59: Merchant Name
    const mName = 'ZiniChat';
    payload += '59' + mName.length.toString().padStart(2, '0') + mName;
    // Tag 60: Merchant City
    const mCity = 'Dhaka';
    payload += '60' + mCity.length.toString().padStart(2, '0') + mCity;
    
    // Tag 63: Checksum placeholder
    const checksumPrefix = payload + '6304';
    const crc = this.calculateCrc16(checksumPrefix);
    return checksumPrefix + crc;
  }

  // Get MFS QR payload for a payment checkout screen
  async getPaymentQrPayload(paymentId: string, provider?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Payment invoice not found');
    }

    let providerKey = provider ? provider.toUpperCase() : payment.provider.toUpperCase();
    if (providerKey === 'MANUAL') {
      providerKey = 'BKASH';
    }

    const account = await this.prisma.mfsAccount.findFirst({
      where: { provider: providerKey, isActive: true },
    });

    if (!account) {
      throw new NotFoundException(`No active payment configuration found for ${providerKey}`);
    }

    // Save/sync provider to the payment invoice
    if (payment.provider.toUpperCase() !== providerKey) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { provider: providerKey.toLowerCase() },
      });
    }

    let qrCodeData = '';
    if (account.accountType === 'MERCHANT' || providerKey === 'BANGLA_QR') {
      qrCodeData = this.generateBanglaQr(account.provider, account.number, Number(payment.amountBdt), account.merchantId || undefined);
    } else {
      qrCodeData = account.qrCodeUrl || '';
    }

    return {
      paymentId: payment.id,
      amount: Number(payment.amountBdt),
      provider: providerKey,
      number: account.number,
      accountType: account.accountType,
      bankName: account.bankName,
      routingNumber: account.routingNumber,
      qrCodeData, // EMVCo text for dynamic QR, or image URL for static QR
      qrCodeUrl: account.qrCodeUrl,
    };
  }

  // 1. MFS Accounts CRUD (Superadmin settings)
  async getAccounts() {
    return this.prisma.mfsAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAccount(data: {
    provider: string;
    accountType: string;
    number: string;
    merchantId?: string;
    bankName?: string;
    routingNumber?: string;
    qrCodeUrl?: string;
    isActive?: boolean;
  }) {
    return this.prisma.mfsAccount.create({
      data,
    });
  }

  async updateAccount(
    id: string,
    data: {
      provider?: string;
      accountType?: string;
      number?: string;
      merchantId?: string;
      bankName?: string;
      routingNumber?: string;
      qrCodeUrl?: string;
      isActive?: boolean;
    },
  ) {
    try {
      return await this.prisma.mfsAccount.update({
        where: { id },
        data,
      });
    } catch (e) {
      throw new NotFoundException('MFS / Bank Account not found');
    }
  }

  async removeAccount(id: string) {
    try {
      await this.prisma.mfsAccount.delete({
        where: { id },
      });
      return { success: true };
    } catch (e) {
      throw new NotFoundException('MFS / Bank Account not found');
    }
  }

  // 2. SMS Sync Webhook (Called by Android App)
  async syncSmsTransaction(
    apiKey: string,
    data: {
      trxId: string;
      provider: string;
      accountType?: string;
      amount: number;
      senderNumber?: string;
      smsBody: string;
    },
  ) {
    const expectedKey = process.env.SMS_GATEWAY_API_KEY || 'sms-gateway-secret-token';
    if (apiKey !== expectedKey) {
      throw new ForbiddenException('Invalid SMS gateway API key');
    }

    if (!data.trxId || !data.amount) {
      throw new BadRequestException('Transaction ID and Amount are required');
    }

    // Check if transaction already exists in database
    const existing = await this.prisma.mfsTransaction.findUnique({
      where: { trxId: data.trxId.trim().toUpperCase() },
    });

    if (existing) {
      return { success: true, message: 'Transaction already synced' };
    }

    // Save transaction
    const transaction = await this.prisma.mfsTransaction.create({
      data: {
        trxId: data.trxId.trim().toUpperCase(),
        provider: data.provider.toUpperCase(),
        accountType: data.accountType || 'PERSONAL',
        amount: data.amount,
        senderNumber: data.senderNumber,
        smsBody: data.smsBody,
      },
    });

    return { success: true, transaction };
  }

  // Get Mfs Transactions logs for Superadmin panel
  async getTransactions() {
    return this.prisma.mfsTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200, // Limit log size
    });
  }

  // 3. User verification and activation flow
  async verifyPayment(userId: string, tenantId: string, paymentId: string, trxId?: string, senderNumber?: string) {
    const cleanTrxId = trxId?.trim().toUpperCase();
    const cleanSenderNumber = senderNumber?.trim();

    if (!cleanTrxId && !cleanSenderNumber) {
      throw new BadRequestException('Either Transaction ID or Sender Mobile/A/C Number is required');
    }

    // Wrapping in a transaction to prevent race conditions (double claiming)
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch payment request
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, tenantId, status: 'pending' },
        include: { subscription: { include: { plan: true } } },
      });

      if (!payment) {
        throw new NotFoundException('Pending payment invoice not found');
      }

      const expectedAmount = Number(payment.amountBdt);
      let smsTx: any = null;

      if (cleanTrxId) {
        // Find by TrxID
        smsTx = await tx.mfsTransaction.findUnique({
          where: { trxId: cleanTrxId },
        });
      } else if (cleanSenderNumber) {
        // Find by amount and matching sender number (matching full number or last 4 digits)
        const recentTxs = await tx.mfsTransaction.findMany({
          where: {
            amount: expectedAmount,
            isUsed: false,
            createdAt: {
              gte: new Date(Date.now() - 4 * 60 * 60 * 1000), // Within last 4 hours
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Filter transaction whose senderNumber matches cleanSenderNumber
        smsTx = recentTxs.find(tx => {
          if (!tx.senderNumber) return false;
          // Match full or last 4 digits
          const numOnly = tx.senderNumber.replace(/\D/g, '');
          const inputOnly = cleanSenderNumber.replace(/\D/g, '');
          return numOnly.endsWith(inputOnly) || inputOnly.endsWith(numOnly);
        });
      }

      if (!smsTx) {
        throw new BadRequestException(
          cleanTrxId 
            ? 'Transaction ID not found. Please ensure the SMS has arrived and the TrxID is correct.'
            : 'No matching recent payment found from this number/account. Please wait a few seconds and try again.'
        );
      }
      
      if (smsTx.isUsed) {
        throw new BadRequestException('This Transaction ID has already been verified and claimed.');
      }

      // Acknowledge amount match (with double precision safety check)
      const actualAmount = Number(smsTx.amount);

      if (Math.abs(expectedAmount - actualAmount) > 0.01) {
        throw new BadRequestException(
          `Amount mismatch. Expected BDT ${expectedAmount}, but the transaction shows BDT ${actualAmount}.`,
        );
      }

      // 3. Lock Transaction
      await tx.mfsTransaction.update({
        where: { id: smsTx.id },
        data: {
          isUsed: true,
          usedByUserId: userId,
          usedAt: new Date(),
        },
      });

      // 4. Activate Payment & Subscription
      const periodDays = payment.subscription?.billingCycle === 'yearly' ? 365 : 30;

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          trxId: cleanTrxId,
        },
      });

      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
        },
      });

      // 5. Notify tenant owner & superadmins
      const owner = await tx.user.findFirst({
        where: { tenantId, role: { in: ['owner', 'admin'] } },
      });
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });

      if (owner) {
        this.smtpService
          .triggerPaymentApprovedEmail(
            owner.email,
            tenant?.businessName || 'Tenant',
            payment.subscription?.plan?.name || 'Package',
          )
          .catch(() => {});

        await this.notificationsService.createNotification(
          owner.id,
          '🎉 পেমেন্ট সফল ও সাবস্ক্রিপশন সক্রিয়!',
          `আপনার পেমেন্ট (TrxID: ${cleanTrxId}) অটো-ভেরিফাই করা হয়েছে এবং "${payment.subscription?.plan?.name}" প্ল্যান সচল হয়েছে।`,
          'billing',
        );
      }

      await this.notificationsService.createSystemNotificationForSuperadmins(
        '🟢 পেমেন্ট অটো-ভেরিফাইড (SMS)',
        `টেন্যান্ট ${tenant?.businessName || 'Tenant'} এর TrxID ${cleanTrxId} এর BDT ${actualAmount} পেমেন্ট অটো-ভেরিফাই সফল হয়েছে।`,
        'billing',
      );

      return { success: true, message: 'Payment successfully verified and subscription activated' };
    });
  }

  // Superadmin manual claim option (in case of override / issues)
  async manualClaimTransaction(userId: string, trxId: string, paymentId: string) {
    const cleanTrxId = trxId.trim().toUpperCase();

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    // Look up transaction
    const smsTx = await this.prisma.mfsTransaction.findUnique({
      where: { trxId: cleanTrxId },
    });

    if (smsTx) {
      if (smsTx.isUsed) throw new BadRequestException('Transaction already used');
      await this.prisma.mfsTransaction.update({
        where: { id: smsTx.id },
        data: { isUsed: true, usedByUserId: userId, usedAt: new Date() },
      });
    }

    // Set payment to success
    const periodDays = payment.subscription?.billingCycle === 'yearly' ? 365 : 30;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'success', trxId: cleanTrxId },
    });

    await this.prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: { status: 'active', currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000) },
    });

    return { success: true, message: 'Payment manually claimed and approved' };
  }
}

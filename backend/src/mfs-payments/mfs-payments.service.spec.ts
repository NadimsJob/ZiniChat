import { Test, TestingModule } from '@nestjs/testing';
import { MfsPaymentsService } from './mfs-payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('MfsPaymentsService', () => {
  let service: MfsPaymentsService;
  let prisma: PrismaService;
  let smtp: SmtpService;
  let notifications: NotificationsService;

  const mockPrismaService: any = {
    $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
    mfsAccount: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mfsTransaction: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    aiUsageLog: { count: jest.fn().mockResolvedValue(0) },
    message: { count: jest.fn().mockResolvedValue(0) },
    broadcastRecipient: { count: jest.fn().mockResolvedValue(0) },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
      findMany: jest.fn().mockResolvedValue([{ id: 'user-1', email: 'test@example.com' }]),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  };

  const mockSmtpService = {
    triggerPaymentApprovedEmail: jest.fn().mockResolvedValue(true),
    triggerAddonPurchasedEmail: jest.fn().mockResolvedValue(true),
    triggerPaymentRejectedEmail: jest.fn().mockResolvedValue(true),
    triggerPaymentPendingAdminEmail: jest.fn().mockResolvedValue(true),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(true),
    createSystemNotificationForSuperadmins: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfsPaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SmtpService, useValue: mockSmtpService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<MfsPaymentsService>(MfsPaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
    smtp = module.get<SmtpService>(SmtpService);
    notifications = module.get<NotificationsService>(NotificationsService);
    
    process.env.SMS_GATEWAY_API_KEY = 'test-secret';
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncSmsTransaction', () => {
    it('should throw ForbiddenException if API key is invalid', async () => {
      await expect(
        service.syncSmsTransaction('invalid-key', {
          trxId: 'TRX123',
          provider: 'BKASH',
          amount: 500,
          smsBody: 'some sms text',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return existing if transaction is already synced', async () => {
      mockPrismaService.mfsTransaction.findUnique.mockResolvedValue({ id: 'tx-1', trxId: 'TRX123' });

      const result = await service.syncSmsTransaction('test-secret', {
        trxId: 'TRX123',
        provider: 'BKASH',
        amount: 500,
        smsBody: 'some sms text',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('already synced');
      expect(mockPrismaService.mfsTransaction.create).not.toHaveBeenCalled();
    });

    it('should create new transaction if not previously synced', async () => {
      mockPrismaService.mfsTransaction.findUnique.mockResolvedValue(null);
      mockPrismaService.mfsTransaction.create.mockResolvedValue({ id: 'tx-123', trxId: 'TRX123', amount: 500 });

      const result = await service.syncSmsTransaction('test-secret', {
        trxId: 'TRX123',
        provider: 'BKASH',
        amount: 500,
        smsBody: 'some sms text',
      });

      expect(result.success).toBe(true);
      expect(mockPrismaService.mfsTransaction.create).toHaveBeenCalledWith({
        data: {
          trxId: 'TRX123',
          provider: 'BKASH',
          accountType: 'PERSONAL',
          amount: 500,
          senderNumber: undefined,
          smsBody: 'some sms text',
        },
      });
    });
  });

  describe('verifyPayment', () => {
    const paymentStub = {
      id: 'pay-1',
      tenantId: 'tenant-1',
      subscriptionId: 'sub-1',
      amountBdt: 500.0,
      status: 'pending',
      subscription: {
        id: 'sub-1',
        billingCycle: 'monthly',
        plan: {
          name: 'Starter Plan',
        },
      },
    };

    const smsTxStub = {
      id: 'tx-1',
      trxId: 'TRX123',
      provider: 'BKASH',
      amount: 500.0,
      isUsed: false,
    };

    it('should throw NotFoundException if payment request is not found', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      mockPrismaService.mfsTransaction.findMany.mockResolvedValue([]);

      await expect(
        service.verifyPayment('user-1', 'tenant-1', 'pay-invalid', 'TRX123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if transaction ID does not exist', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findUnique.mockResolvedValue(null);
      mockPrismaService.mfsTransaction.findMany.mockResolvedValue([]);

      await expect(
        service.verifyPayment('user-1', 'tenant-1', 'pay-1', 'TRX_NOT_EXIST'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transaction ID is already claimed/used', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      // findFirst returns the record (with isUsed:true); the service then checks smsTx.isUsed explicitly
      mockPrismaService.mfsTransaction.findFirst.mockResolvedValue({ ...smsTxStub, isUsed: true });

      await expect(
        service.verifyPayment('user-1', 'tenant-1', 'pay-1', 'TRX123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if amount mismatches', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findFirst.mockResolvedValue({ ...smsTxStub, amount: 490.0 });

      await expect(
        service.verifyPayment('user-1', 'tenant-1', 'pay-1', 'TRX123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully verify, lock transaction, activate subscription and send notifications', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findFirst.mockResolvedValue(smsTxStub);
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'owner@test.com' });
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', businessName: 'Tech Hub' });

      const result = await service.verifyPayment('user-1', 'tenant-1', 'pay-1', 'TRX123');

      expect(result.success).toBe(true);
      expect(mockPrismaService.mfsTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: expect.objectContaining({ isUsed: true, usedByUserId: 'user-1' }),
      });
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: 'success', trxId: 'TRX123' },
      });
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ status: 'active' }),
      });
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
      expect(mockNotificationsService.createSystemNotificationForSuperadmins).toHaveBeenCalled();
    });

    it('should successfully verify using only amount (Zero-Input matching)', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findFirst.mockResolvedValue(smsTxStub);
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'owner@test.com' });
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', businessName: 'Tech Hub' });

      const result = await service.verifyPayment('user-1', 'tenant-1', 'pay-1', undefined, undefined);

      expect(result.success).toBe(true);
      expect(mockPrismaService.mfsTransaction.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          amount: 500.0,
          isUsed: false
        })
      }));
    });

    it('(TrxID Case Sensitivity) should match lowercase user input against uppercase stored TrxID', async () => {
      // DB stores uppercase '9J382A1K', user submits lowercase '9j382a1k'
      const upperCaseTx = { ...smsTxStub, trxId: '9J382A1K' };

      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      // findFirst is called with mode: 'insensitive' — mock returns the record (simulating DB match)
      mockPrismaService.mfsTransaction.findFirst.mockResolvedValue(upperCaseTx);
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'owner@test.com' });
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', businessName: 'Tech Hub' });

      const result = await service.verifyPayment('user-1', 'tenant-1', 'pay-1', '9j382a1k');

      expect(result.success).toBe(true);
      // Verify the lookup used mode: 'insensitive' with the UPPERCASED clean version
      expect(mockPrismaService.mfsTransaction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trxId: {
              equals: '9J382A1K',      // input is uppercased before query
              mode: 'insensitive',
            },
          }),
        }),
      );
      expect(mockPrismaService.mfsTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tx-1' },
          data: expect.objectContaining({ isUsed: true }),
        }),
      );
    });

    it('(TrxID Whitespace Trimming) should match padded user input after trimming', async () => {
      const upperCaseTx = { ...smsTxStub, trxId: '9J382A1K' };

      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findFirst.mockResolvedValue(upperCaseTx);
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'owner@test.com' });
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', businessName: 'Tech Hub' });

      // Input with leading/trailing whitespace
      const result = await service.verifyPayment('user-1', 'tenant-1', 'pay-1', '  9j382a1k  ');

      expect(result.success).toBe(true);
      // After trim().toUpperCase() the value passed to Prisma should be clean
      expect(mockPrismaService.mfsTransaction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trxId: {
              equals: '9J382A1K',      // trimmed and uppercased
              mode: 'insensitive',
            },
          }),
        }),
      );
    });
  });

  describe('generateBanglaQr', () => {
    it('should generate a valid EMVCo Bangla QR payload text ending with a 4-char hex checksum', () => {
      const qrText = service.generateBanglaQr('BKASH', '01711111111', 500, 'merchant-id');
      
      expect(qrText).toContain('000201'); // Tag 00
      expect(qrText).toContain('010212'); // Tag 01 (Dynamic)
      expect(qrText).toContain('5303050'); // BDT Currency
      expect(qrText).toContain('5406500.00'); // Amount Tag 54
      expect(qrText.length).toBeGreaterThan(20);
      
      // Checksum is 4 characters at the end
      const crcPart = qrText.substring(qrText.length - 4);
      expect(crcPart).toMatch(/^[0-9A-F]{4}$/);
    });
  });
  describe('manualClaimTransaction', () => {
    it('should activate subscription, notify tenant admins and superadmins', async () => {
      const paymentStub = {
        id: 'pay-1',
        tenantId: 'tenant-1',
        subscriptionId: 'sub-1',
        amountBdt: 500.0,
        status: 'pending',
        subscription: { id: 'sub-1', billingCycle: 'monthly', plan: { name: 'Starter Plan' } },
        addon: null,
        addonId: null,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findFirst.mockResolvedValue(null); // No SMS tx found
      mockPrismaService.subscription.findFirst.mockResolvedValue(null); // No previous sub
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', businessName: 'Test Biz', plan: null });
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 'user-1', email: 'owner@test.com' }]);
      mockPrismaService.payment.update.mockResolvedValue({ ...paymentStub, status: 'success' });
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.subscription.update.mockResolvedValue({ id: 'sub-1', status: 'active' });

      const result = await service.manualClaimTransaction('superadmin-1', 'TRX123', 'pay-1');

      expect(result.success).toBe(true);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('Admin Claim'),
        expect.any(String),
        'billing'
      );
      expect(mockNotificationsService.createSystemNotificationForSuperadmins).toHaveBeenCalled();
      expect(mockSmtpService.triggerPaymentApprovedEmail).toHaveBeenCalledWith(
        'owner@test.com',
        'Test Biz',
        'Starter Plan'
      );
    });

    it('(BUG2 regression) should include carriedForwardAiQuota and carriedForwardMessageQuota in subscription update', async () => {
      const paymentStub = {
        id: 'pay-manual',
        tenantId: 'tenant-2',
        subscriptionId: 'sub-2',
        amountBdt: 999.0,
        status: 'pending',
        subscription: { id: 'sub-2', billingCycle: 'monthly', plan: { name: 'Growth Plan' } },
        addon: null,
        addonId: null,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findFirst.mockResolvedValue(null);
      // Simulate a previous active subscription with unused quota
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 'sub-prev',
        status: 'active',
        currentPeriodStart: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        carriedForwardAiQuota: 0,
        carriedForwardMessageQuota: 0,
        plan: { priceMonthlyBdt: '999', aiQuota: 200, messageQuota: 500 },
      });
      // Simulate 100 AI used, 200 messages used (so 100 AI and 300 messages carry forward)
      mockPrismaService.aiUsageLog = { count: jest.fn().mockResolvedValue(100) };
      mockPrismaService.message = { count: jest.fn().mockResolvedValue(200) };
      mockPrismaService.broadcastRecipient = { count: jest.fn().mockResolvedValue(0) };
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-2', businessName: 'Test Co', plan: null, customAiQuota: null, customMessageQuota: null,
      });
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 'user-2', email: 'owner2@test.com' }]);
      mockPrismaService.payment.update.mockResolvedValue({ ...paymentStub, status: 'success' });
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.subscription.update.mockResolvedValue({ id: 'sub-2', status: 'active' });

      await service.manualClaimTransaction('superadmin-1', 'TRXMANUAL', 'pay-manual');

      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
            carriedForwardAiQuota: expect.any(Number),
            carriedForwardMessageQuota: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('(BUG1 regression) verifyPayment should carry forward quota on SMS auto-verify', () => {
    it('should include carriedForwardAiQuota and carriedForwardMessageQuota in subscription update', async () => {
      const paymentStub = {
        id: 'pay-sms',
        tenantId: 'tenant-3',
        subscriptionId: 'sub-3',
        amountBdt: 500.0,
        status: 'pending',
        addonId: null,
        addon: null,
        subscription: { id: 'sub-3', billingCycle: 'monthly', plan: { name: 'Starter' } },
      };
      const smsTxStub = { id: 'tx-1', trxId: 'TRXSMS', amount: 500.0, isUsed: false };

      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findFirst.mockResolvedValue(smsTxStub);
      mockPrismaService.mfsTransaction.update.mockResolvedValue({ ...smsTxStub, isUsed: true });
      mockPrismaService.payment.update.mockResolvedValue({ ...paymentStub, status: 'success' });
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-3', businessName: 'SMS Biz', plan: null, customAiQuota: null, customMessageQuota: null,
      });
      // Simulate a previous active sub so carry-forward logic fires
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 'sub-prev',
        status: 'active',
        currentPeriodStart: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        carriedForwardAiQuota: 0,
        carriedForwardMessageQuota: 0,
        plan: { priceMonthlyBdt: '500', aiQuota: 100, messageQuota: 300 },
      });
      mockPrismaService.aiUsageLog = { count: jest.fn().mockResolvedValue(50) };
      mockPrismaService.message = { count: jest.fn().mockResolvedValue(100) };
      mockPrismaService.broadcastRecipient = { count: jest.fn().mockResolvedValue(0) };
      mockPrismaService.subscription.update.mockResolvedValue({ id: 'sub-3', status: 'active' });
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 'user-3', email: 'owner3@test.com' }]);

      const result = await service.verifyPayment('user-3', 'tenant-3', 'pay-sms', 'TRXSMS');

      expect(result.success).toBe(true);
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
            carriedForwardAiQuota: expect.any(Number),
            carriedForwardMessageQuota: expect.any(Number),
          }),
        })
      );
    });
  });
});


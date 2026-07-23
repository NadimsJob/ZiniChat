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

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
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
    },
    subscription: {
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  };

  const mockSmtpService = {
    triggerPaymentApprovedEmail: jest.fn().mockResolvedValue(true),
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

      await expect(
        service.verifyPayment('user-1', 'tenant-1', 'pay-invalid', 'TRX123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if transaction ID does not exist', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyPayment('user-1', 'tenant-1', 'pay-1', 'TRX_NOT_EXIST'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transaction ID is already claimed/used', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findUnique.mockResolvedValue({ ...smsTxStub, isUsed: true });

      await expect(
        service.verifyPayment('user-1', 'tenant-1', 'pay-1', 'TRX123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if amount mismatches', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findUnique.mockResolvedValue({ ...smsTxStub, amount: 490.0 });

      await expect(
        service.verifyPayment('user-1', 'tenant-1', 'pay-1', 'TRX123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully verify, lock transaction, activate subscription and send notifications', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(paymentStub);
      mockPrismaService.mfsTransaction.findUnique.mockResolvedValue(smsTxStub);
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
});

import { Test, TestingModule } from '@nestjs/testing';
import { TenantSmtpService, UpsertTenantSmtpDto } from './tenant-smtp.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('TenantSmtpService', () => {
  let service: TenantSmtpService;
  let mockPrisma: any;
  let mockCrypto: any;
  let mockTransporter: any;

  beforeEach(async () => {
    mockTransporter = {
      verify: jest.fn().mockResolvedValue(true),
      sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-test-123' }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    mockPrisma = {
      tenantSmtpSetting: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    mockCrypto = {
      encrypt: jest.fn((val: string) => `enc.${val}`),
      decrypt: jest.fn((val: string) => val.replace('enc.', '')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantSmtpService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CryptoService, useValue: mockCrypto },
      ],
    }).compile();

    service = module.get<TenantSmtpService>(TenantSmtpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSmtpSetting', () => {
    it('should return null when setting does not exist', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValue(null);
      const res = await service.getSmtpSetting('tenant-1');
      expect(res).toBeNull();
    });

    it('should return sanitized setting without exposing encrypted password', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValue({
        id: 'smtp-1',
        tenantId: 'tenant-1',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        username: 'user@example.com',
        passwordEncrypted: 'enc.secret_pass',
        fromEmail: 'user@example.com',
        fromName: 'Test Brand',
        replyToEmail: 'reply@example.com',
        isVerified: true,
        lastVerifiedAt: new Date('2026-10-19'),
        dailySentCount: 15,
        lastSentDate: '2026-10-19',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.getSmtpSetting('tenant-1');
      expect(res).toBeDefined();
      expect(res!.hasPassword).toBe(true);
      expect((res as any).passwordEncrypted).toBeUndefined();
      expect(res!.host).toBe('smtp.gmail.com');
      expect(res!.fromName).toBe('Test Brand');
    });
  });

  describe('upsertSmtpSetting', () => {
    it('should throw BadRequestException if required fields are missing', async () => {
      const dto = { host: '', username: 'user', fromEmail: 'user@test.com', fromName: 'Name' } as any;
      await expect(service.upsertSmtpSetting('tenant-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid sender email format', async () => {
      const dto: UpsertTenantSmtpDto = {
        host: 'smtp.test.com',
        username: 'user',
        fromEmail: 'invalid-email',
        fromName: 'Name',
        password: 'password123',
      };
      await expect(service.upsertSmtpSetting('tenant-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should encrypt password and resolve secure flag for port 465', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValue(null);
      mockPrisma.tenantSmtpSetting.upsert.mockResolvedValue({
        id: 'smtp-1',
        tenantId: 'tenant-1',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        username: 'user@gmail.com',
        passwordEncrypted: 'enc.app_password_123',
        fromEmail: 'user@gmail.com',
        fromName: 'Acme',
        isVerified: false,
      });

      const dto: UpsertTenantSmtpDto = {
        host: 'smtp.gmail.com',
        port: 465,
        username: 'user@gmail.com',
        password: 'app_password_123',
        fromEmail: 'user@gmail.com',
        fromName: 'Acme',
      };

      await service.upsertSmtpSetting('tenant-1', dto);

      expect(mockCrypto.encrypt).toHaveBeenCalledWith('app_password_123');
      expect(mockPrisma.tenantSmtpSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            passwordEncrypted: 'enc.app_password_123',
            isVerified: false,
          }),
        }),
      );
    });

    it('should retain existing encrypted password if not provided on update', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValue({
        id: 'smtp-1',
        tenantId: 'tenant-1',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        username: 'user@gmail.com',
        passwordEncrypted: 'enc.existing_pass',
        fromEmail: 'user@gmail.com',
        fromName: 'Acme Old',
        isVerified: true,
      });

      const dto: UpsertTenantSmtpDto = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        username: 'user@gmail.com',
        fromEmail: 'user@gmail.com',
        fromName: 'Acme New',
      };

      await service.upsertSmtpSetting('tenant-1', dto);

      expect(mockCrypto.encrypt).not.toHaveBeenCalled();
      expect(mockPrisma.tenantSmtpSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            passwordEncrypted: 'enc.existing_pass',
            fromName: 'Acme New',
            isVerified: true,
          }),
        }),
      );
    });
  });

  describe('verifySmtpConnection', () => {
    it('should throw NotFoundException if setting not configured', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValue(null);
      await expect(service.verifySmtpConnection('tenant-1')).rejects.toThrow(NotFoundException);
    });

    it('should verify connection, send test email and set isVerified true on success', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValue({
        id: 'smtp-1',
        tenantId: 'tenant-1',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        username: 'user@gmail.com',
        passwordEncrypted: 'enc.valid_pass',
        fromEmail: 'user@gmail.com',
        fromName: 'Acme',
        replyToEmail: 'reply@acme.com',
        isVerified: false,
      });

      mockPrisma.tenantSmtpSetting.update.mockResolvedValue({
        isVerified: true,
        lastVerifiedAt: new Date(),
      });

      const res = await service.verifySmtpConnection('tenant-1', 'test_recipient@domain.com');

      expect(mockCrypto.decrypt).toHaveBeenCalledWith('enc.valid_pass');
      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test_recipient@domain.com',
          from: '"Acme" <user@gmail.com>',
          subject: expect.stringContaining('SMTP Connection Test Successful'),
        }),
      );
      expect(mockPrisma.tenantSmtpSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          data: expect.objectContaining({ isVerified: true }),
        }),
      );
      expect(res.success).toBe(true);
    });

    it('should handle authentication errors (535) with Google App Password advice and set isVerified false', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValue({
        id: 'smtp-1',
        tenantId: 'tenant-1',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        username: 'user@gmail.com',
        passwordEncrypted: 'enc.wrong_pass',
        fromEmail: 'user@gmail.com',
        fromName: 'Acme',
      });

      mockTransporter.verify.mockRejectedValue(new Error('535 5.7.8 Username and Password not accepted'));
      mockPrisma.tenantSmtpSetting.update.mockResolvedValue({});

      await expect(service.verifySmtpConnection('tenant-1')).rejects.toThrow(BadRequestException);

      expect(mockPrisma.tenantSmtpSetting.update).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        data: { isVerified: false },
      });
    });

    it('should handle connection timeout (ETIMEDOUT) gracefully', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValue({
        id: 'smtp-1',
        tenantId: 'tenant-1',
        host: 'smtp.blocked.com',
        port: 465,
        secure: true,
        username: 'user@blocked.com',
        passwordEncrypted: 'enc.pass',
        fromEmail: 'user@blocked.com',
        fromName: 'Acme',
      });

      mockTransporter.verify.mockRejectedValue(new Error('ETIMEDOUT connection failed'));
      mockPrisma.tenantSmtpSetting.update.mockResolvedValue({});

      await expect(service.verifySmtpConnection('tenant-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteSmtpSetting', () => {
    it('should delete settings for tenant', async () => {
      mockPrisma.tenantSmtpSetting.deleteMany.mockResolvedValue({ count: 1 });
      const res = await service.deleteSmtpSetting('tenant-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.tenantSmtpSetting.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
    });
  });

  describe('getDecryptedTransporter', () => {
    it('should throw BadRequestException if setting is unverified', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValue({
        tenantId: 'tenant-1',
        isVerified: false,
      });

      await expect(service.getDecryptedTransporter('tenant-1')).rejects.toThrow(BadRequestException);
    });

    it('should return decrypted transporter when verified', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValue({
        tenantId: 'tenant-1',
        host: 'smtp.verified.com',
        port: 465,
        secure: true,
        username: 'verified_user',
        passwordEncrypted: 'enc.my_decrypted_password',
        isVerified: true,
      });

      const transporter = await service.getDecryptedTransporter('tenant-1');
      expect(transporter).toBeDefined();
      expect(mockCrypto.decrypt).toHaveBeenCalledWith('enc.my_decrypted_password');
    });
  });
});

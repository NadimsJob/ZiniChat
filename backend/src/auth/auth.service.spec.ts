import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    tenant: { create: jest.fn(), findUnique: jest.fn() },
    user: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    plan: { findFirst: jest.fn() },
    subscription: { create: jest.fn() },
    googleAuthConfig: { findFirst: jest.fn() },
    facebookAuthConfig: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    aiConfig: { findFirst: jest.fn() }
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn()
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked-token')
  };

  const mockSmtpService = {
    triggerWelcomeEmail: jest.fn().mockResolvedValue(true),
    triggerVerifyEmail: jest.fn().mockResolvedValue(true),
    triggerPasswordResetEmail: jest.fn().mockResolvedValue(true),
    triggerAgentCreatedEmail: jest.fn().mockResolvedValue(true)
  };

  const mockNotificationsService = {
    createSystemNotificationForSuperadmins: jest.fn().mockResolvedValue(true),
    createNotification: jest.fn().mockResolvedValue(true)
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: SmtpService, useValue: mockSmtpService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signupTenant', () => {
    it('should throw ConflictException if email exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1' });
      await expect(service.signupTenant({ email: 'test@test.com', phoneNo: '+123456' })).rejects.toThrow(ConflictException);
    });

    it('should create tenant, user, and assign default plan if one exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass');

      // Setup the transaction mock to simulate Prisma behavior
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService); // Pass the mock prisma to the callback
      });

      const mockDefaultPlan = { id: 'plan-123' };
      const mockTenant = { id: 'tenant-456' };
      const mockUser = { 
        id: 'user-789', 
        email: 'john@biz.com', 
        name: 'John Doe', 
        role: 'admin', 
        permissions: [], 
        profilePicUrl: null 
      };

      mockPrismaService.plan.findFirst.mockResolvedValue(mockDefaultPlan);
      mockPrismaService.tenant.create.mockResolvedValue(mockTenant);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.signupTenant({
        businessName: 'My Biz',
        name: 'John Doe',
        email: 'john@biz.com',
        phoneNo: '+1234567890',
        password: 'pass'
      });

      expect(result).toEqual({ access_token: 'mocked-token', user: mockUser });
      expect(mockPrismaService.plan.findFirst).toHaveBeenCalledWith({
        where: { isDefault: true, isActive: true }
      });
      expect(mockPrismaService.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ planId: mockDefaultPlan.id })
        })
      );
      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ planId: mockDefaultPlan.id, tenantId: mockTenant.id })
        })
      );
    });

    it('should create tenant without plan if no default plan exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass');

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockPrismaService.plan.findFirst.mockResolvedValue(null);
      mockPrismaService.tenant.create.mockResolvedValue({ id: 'tenant-456' });
      mockPrismaService.user.create.mockResolvedValue({ 
        id: 'user-789', 
        email: 'john@biz.com', 
        name: 'John Doe', 
        role: 'admin', 
        permissions: [], 
        profilePicUrl: null 
      });

      await service.signupTenant({
        businessName: 'My Biz',
        name: 'John Doe',
        email: 'john@biz.com',
        phoneNo: '+1234567890',
        password: 'pass'
      });

      expect(mockPrismaService.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ planId: null })
        })
      );
      expect(mockPrismaService.subscription.create).not.toHaveBeenCalled();
    });
  });

  describe('googleCallback', () => {
    it('should assign default plan when creating new tenant via Google login', async () => {
      // Mock global fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          aud: 'valid-client-id',
          email: 'google@test.com',
          name: 'Google User',
          picture: 'pic.jpg'
        })
      }) as jest.Mock;

      mockPrismaService.googleAuthConfig.findFirst.mockResolvedValue({ clientId: 'valid-client-id', isEnabled: true });
      mockUsersService.findByEmail.mockResolvedValue(null);
      
      const mockDefaultPlan = { id: 'plan-123' };
      const mockTenant = { id: 'tenant-456' };
      
      mockPrismaService.plan.findFirst.mockResolvedValue(mockDefaultPlan);
      mockPrismaService.tenant.create.mockResolvedValue(mockTenant);
      mockPrismaService.user.create.mockResolvedValue({ id: 'user-789', email: 'google@test.com', role: 'admin' });
      
      jest.spyOn(service, 'login').mockResolvedValue({ access_token: 'token', user: {} } as any);

      await service.googleCallback('mock-token');

      expect(mockPrismaService.plan.findFirst).toHaveBeenCalledWith({
        where: { isDefault: true, isActive: true }
      });
      expect(mockPrismaService.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ planId: mockDefaultPlan.id })
        })
      );
      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ planId: mockDefaultPlan.id, tenantId: mockTenant.id })
        })
      );
    });
  });

  describe('facebookAuthSettings', () => {
    it('should retrieve Facebook auth settings', async () => {
      const mockConfig = { id: 'config-1', appId: '123456', appSecret: 'secret', isEnabled: true };
      mockPrismaService.facebookAuthConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getFacebookSettings();
      expect(mockPrismaService.facebookAuthConfig.findFirst).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });

    it('should update Facebook auth settings when config exists', async () => {
      const updateData = { appId: '987654', appSecret: 'newsecret', isEnabled: true };
      mockPrismaService.facebookAuthConfig.findFirst.mockResolvedValue({ id: 'config-1' });
      mockPrismaService.facebookAuthConfig.update.mockResolvedValue({ id: 'config-1', ...updateData });

      const result = await service.updateFacebookSettings(updateData);
      expect(mockPrismaService.facebookAuthConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'config-1' },
          data: expect.objectContaining({ appId: '987654', isEnabled: true })
        })
      );
      expect(result).toEqual(expect.objectContaining({ appId: '987654' }));
    });
  });

  describe('forgotPassword', () => {
    it('should generate token and dispatch reset email if user exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'user-1', email: 'user@test.com', name: 'User Test' });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.forgotPassword('user@test.com');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ resetPasswordToken: expect.any(String) })
        })
      );
      expect(mockSmtpService.triggerPasswordResetEmail).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return success message without failing if email does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@test.com');
      expect(result.success).toBe(true);
      expect(mockSmtpService.triggerPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should update password when token is valid and not expired', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'user@test.com' });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.resetPassword('valid-token', 'newPassword123');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ resetPasswordToken: null, resetPasswordExpires: null })
        })
      );
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException if token is invalid', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword('invalid-token', 'newPassword123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and clear token if valid', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.verifyEmail('verify-token');
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException if no token is provided', async () => {
      await expect(service.verifyEmail('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('suspended tenant checks', () => {
    it('should throw UnauthorizedException in validateUser if tenant is suspended', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@biz.com',
        passwordHash: 'hashed_password',
        role: 'admin',
        tenantId: 'tenant-1'
      };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', status: 'suspended' });

      await expect(service.validateUser('test@biz.com', 'pass')).rejects.toThrow(
        new UnauthorizedException('Account suspended')
      );
    });

    it('should throw UnauthorizedException in login if tenant is suspended', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@biz.com',
        role: 'admin',
        tenantId: 'tenant-1'
      };
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', status: 'suspended' });

      await expect(service.login(mockUser)).rejects.toThrow(
        new UnauthorizedException('Account suspended')
      );
    });
  });
});

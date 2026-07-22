import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    tenant: { create: jest.fn() },
    user: { create: jest.fn(), findUnique: jest.fn() },
    plan: { findFirst: jest.fn() },
    subscription: { create: jest.fn() },
    googleAuthConfig: { findFirst: jest.fn() }
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn()
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked-token')
  };

  const mockSmtpService = {
    triggerWelcomeEmail: jest.fn().mockResolvedValue(true)
  };

  const mockNotificationsService = {
    createSystemNotificationForSuperadmins: jest.fn().mockResolvedValue(true)
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
      await expect(service.signupTenant({ email: 'test@test.com' })).rejects.toThrow(ConflictException);
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
});

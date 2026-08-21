import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtService } from '@nestjs/jwt';
import { MetaPixelProcessor } from './meta-pixel.processor';
import { MetaPixelService } from './meta-pixel.service';
import { getQueueToken } from '@nestjs/bullmq';
import * as bcrypt from 'bcrypt';

describe('PixelQueueResilience (CAPI Queue Error Isolation)', () => {
  let authService: AuthService;
  let processor: MetaPixelProcessor;
  let prismaService: any;
  let metaPixelService: any;
  let mockMetaPixelQueue: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant_resilient_123', status: 'active' }),
      },
      plan: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      label: {
        createMany: jest.fn(),
      },
      aiConfig: {
        findFirst: jest.fn(),
      },
      subscription: {
        create: jest.fn(),
      },
      metaPixelConfig: {
        findFirst: jest.fn(),
      },
      tenantAcquisitionEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn(callback => callback(prismaService)),
    };

    metaPixelService = {
      getPixelConfig: jest.fn().mockResolvedValue({
        id: 'cfg_invalid',
        pixelId: 'invalid_pixel_123',
        pixelAccessToken: 'invalid_access_token_xyz',
        isActive: true,
        isCapiEnabled: true,
        trackSignup: true,
        trackPageView: true,
        trackCompleteReg: true,
        trackLogin: true,
      }),
      sendEventToMeta: jest.fn().mockResolvedValue(false), // Simulates invalid CAPI credentials / Meta API rejection
      logAcquisitionEvent: jest.fn().mockResolvedValue({ id: 'event_log_1' }),
    };

    mockMetaPixelQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job_123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        MetaPixelProcessor,
        { provide: PrismaService, useValue: prismaService },
        { provide: MetaPixelService, useValue: metaPixelService },
        { provide: UsersService, useValue: { findByEmail: jest.fn().mockResolvedValue(null) } },
        { provide: SmtpService, useValue: { triggerWelcomeEmail: jest.fn().mockResolvedValue(true), triggerVerifyEmail: jest.fn().mockResolvedValue(true), triggerOtpVerificationEmail: jest.fn().mockResolvedValue(true) } },
        { provide: NotificationsService, useValue: { createSystemNotificationForSuperadmins: jest.fn().mockResolvedValue(true) } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock_jwt_token') } },
        { provide: getQueueToken('meta-pixel'), useValue: mockMetaPixelQueue },
        { provide: getQueueToken('google-analytics'), useValue: { add: jest.fn().mockResolvedValue({ id: 'job_ga' }) } },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    processor = module.get<MetaPixelProcessor>(MetaPixelProcessor);
  });

  it('should complete user signup seamlessly even when CAPI credentials are invalid', async () => {
    const signupDto = {
      businessName: 'Resilient Business',
      name: 'John Doe',
      email: 'resilient@example.com',
      password: 'SecurePassword123!',
      phoneNo: '+8801700000000',
    };

    prismaService.plan.findFirst.mockResolvedValue({
      id: 'plan_free',
      isDefault: true,
      isActive: true,
      priceMonthlyBdt: 0,
      trialDays: 14,
    });

    prismaService.tenant.create.mockResolvedValue({
      id: 'tenant_resilient_123',
      businessName: signupDto.businessName,
    });

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    prismaService.user.create.mockResolvedValue({
      id: 'user_resilient_123',
      email: signupDto.email,
      name: signupDto.name,
      role: 'owner',
      tenantId: 'tenant_resilient_123',
      passwordHash: hashedPassword,
    });

    const result = await authService.signupTenant(signupDto);

    expect(result).toBeDefined();
    expect(result.requiresOtp).toBe(true);
    expect(prismaService.tenant.create).toHaveBeenCalled();
    expect(prismaService.user.create).toHaveBeenCalled();
  });

  it('should isolate CAPI job failure silently in worker processor without throwing exception', async () => {
    const job: any = {
      name: 'trackAcquisitionEvent',
      data: {
        eventName: 'SignUp',
        tenantEmail: 'resilient@example.com',
        tenantId: 'tenant_resilient_123',
        eventValue: 1,
      },
      attemptsMade: 0,
    };

    const processResult = await processor.process(job);

    expect(processResult).toBeDefined();
    expect(processResult.success).toBe(false);
    expect(processResult.status).toBe('failed_permanently');
    expect(metaPixelService.sendEventToMeta).toHaveBeenCalledWith('SignUp', expect.objectContaining({
      tenantEmail: 'resilient@example.com',
    }));
    expect(metaPixelService.logAcquisitionEvent).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed_permanently',
      sentToMeta: false,
    }));
  });
});

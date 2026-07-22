import { Test, TestingModule } from '@nestjs/testing';
import { SmtpService } from './smtp.service';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('SmtpService', () => {
  let service: SmtpService;

  const mockPrismaService = {
    smtpConfig: { 
      findFirst: jest.fn(),
      update: jest.fn().mockImplementation(async (args) => {
        return { 
          id: 'existing-config',
          host: 'smtp.test.com',
          port: 587,
          secure: false,
          username: 'user@test.com',
          password: 'pass123',
          fromName: 'Test Platform',
          fromEmail: 'noreply@test.com',
          broadcastCompletedEnabled: true,
          ...args.data 
        };
      }),
      create: jest.fn().mockResolvedValue({
        id: 'new-config',
        host: 'smtp.mailtrap.io',
        port: 2525,
        broadcastCompletedEnabled: true
      })
    }
  };

  const mockSendMail = jest.fn().mockResolvedValue(true);
  
  beforeEach(async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmtpService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SmtpService>(SmtpService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('triggerBroadcastCompletedEmail', () => {
    it('should send broadcast completion email if config exists', async () => {
      mockPrismaService.smtpConfig.findFirst.mockResolvedValue({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        username: 'user@test.com',
        password: 'pass123',
        fromName: 'Test Platform',
        fromEmail: 'noreply@test.com',
        broadcastCompletedEnabled: true,
        broadcastCompletedSubject: 'Broadcast Complete - {{businessName}}',
        broadcastCompletedBody: '<p>Hello {{name}}, your broadcast {{templateName}} is done!</p>',
        ticketAssignedSubject: 'x',
        ticketAssignedBody: 'x'
      });

      await service.triggerBroadcastCompletedEmail(
        'owner@biz.com',
        'John Doe',
        'promo_2026',
        500
      );

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: { user: 'user@test.com', pass: 'pass123' },
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test Platform" <noreply@test.com>',
        to: 'owner@biz.com',
        subject: '✅ ব্রডকাস্ট সফলভাবে সম্পন্ন হয়েছে – My Biz',
        html: expect.stringContaining('প্রিয় John Doe'),
        plainText: undefined
      });
    });

    it('should fall back to defaults if custom subject/body is missing', async () => {
      mockPrismaService.smtpConfig.findFirst.mockResolvedValue({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        username: 'user@test.com',
        password: 'pass123',
        fromName: 'Test Platform',
        fromEmail: 'noreply@test.com',
        broadcastCompletedEnabled: true,
        broadcastCompletedSubject: null,
        broadcastCompletedBody: null
      });

      await service.triggerBroadcastCompletedEmail(
        'owner@biz.com',
        'John Doe',
        'My Biz',
        100
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test Platform" <noreply@test.com>',
        to: 'owner@biz.com',
        subject: '✅ ব্রডকাস্ট সফলভাবে সম্পন্ন হয়েছে – My Biz',
        plainText: undefined,
        html: expect.stringContaining('প্রিয় John Doe')
      });
    });

    it('should silently return if no smtp config is set', async () => {
      mockPrismaService.smtpConfig.findFirst.mockResolvedValue(null);

      await service.triggerBroadcastCompletedEmail(
        'owner@biz.com',
        'John Doe',
        'promo_2026',
        500
      );

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });
});

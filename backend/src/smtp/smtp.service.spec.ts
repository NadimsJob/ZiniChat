import { Test, TestingModule } from '@nestjs/testing';
import { SmtpService } from './smtp.service';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('SmtpService', () => {
  let service: SmtpService;
  
  const mockConfig = {
    id: 'existing-config',
    host: 'smtp.test.com',
    port: 587,
    secure: false,
    username: 'user@test.com',
    password: 'pass123',
    fromName: 'Test Platform',
    fromEmail: 'noreply@test.com',
    sendWelcomeEmail: true,
    welcomeSubject: 'Welcome {{tenantName}}',
    welcomeBody: 'Hello {{tenantName}}, welcome!',
    paymentSubmittedEnabled: true,
    paymentSubmittedSubject: 'Payment {{trxId}}',
    paymentSubmittedBody: 'Amount: {{amount}}',
    paymentPendingAdminEnabled: true,
    paymentPendingAdminSubject: 'Admin Alert',
    paymentPendingAdminBody: 'Admin Body',
    paymentApprovedEnabled: true,
    paymentApprovedSubject: 'Approved {{planName}}',
    paymentApprovedBody: 'Plan: {{planName}}',
    addonPurchasedEnabled: true,
    addonPurchasedSubject: 'Addon {{addonName}}',
    addonPurchasedBody: 'Addon: {{addonName}}',
    expiryReminder7dEnabled: true,
    expiryReminder7dSubject: '7 days left',
    expiryReminder7dBody: 'Expire 7 days',
    expiryReminder2dEnabled: true,
    expiryReminder2dSubject: '2 days left',
    expiryReminder2dBody: 'Expire 2 days',
    agentCreatedEnabled: true,
    agentCreatedSubject: 'Agent {{agentName}}',
    agentCreatedBody: 'Pass: {{password}}',
    passwordResetEnabled: true,
    passwordResetSubject: 'Reset {{userName}}',
    passwordResetBody: 'Link: {{resetLink}}',
    newInquiryEnabled: true,
    newInquirySubject: 'Inquiry {{name}}',
    newInquiryBody: 'Msg: {{message}}',
    ticketCreatedEnabled: true,
    ticketCreatedSubject: 'Ticket {{subject}}',
    ticketCreatedBody: 'Prio: {{priority}}',
    ticketRepliedEnabled: true,
    ticketRepliedSubject: 'Reply {{subject}}',
    ticketRepliedBody: 'Msg: {{message}}',
    ticketStatusEnabled: true,
    ticketStatusSubject: 'Status {{subject}}',
    ticketStatusBody: 'Stat: {{status}}',
    ticketAssignedEnabled: true,
    ticketAssignedSubject: 'Assigned {{subject}}',
    ticketAssignedBody: 'To: {{adminName}}',
    broadcastCompletedEnabled: true,
    broadcastCompletedSubject: 'Broadcast Complete - {{broadcastName}}',
    broadcastCompletedBody: '<p>Hello {{businessName}}, your broadcast {{broadcastName}} is done!</p>'
  };

  const mockPrismaService = {
    smtpConfig: { 
      findFirst: jest.fn(),
      update: jest.fn().mockImplementation(async (args) => {
        return { 
          ...mockConfig,
          ...args.data 
        };
      }),
      create: jest.fn().mockResolvedValue({
        id: 'new-config',
        sendWelcomeEmail: false,
        broadcastCompletedEnabled: true
      })
    },
    user: {
      findMany: jest.fn().mockResolvedValue([{ email: 'superadmin@test.com' }])
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

  describe('Dynamic Email Templates', () => {
    beforeEach(() => {
      mockPrismaService.smtpConfig.findFirst.mockResolvedValue(mockConfig);
    });

    it('triggerWelcomeEmail should replace placeholders', async () => {
      await service.triggerWelcomeEmail('test@biz.com', 'TestBiz');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Welcome TestBiz',
        html: expect.stringContaining('Hello TestBiz, welcome!')
      }));
    });

    it('triggerPaymentSubmittedEmail should replace placeholders', async () => {
      await service.triggerPaymentSubmittedEmail('test@biz.com', 'TestBiz', '1000', 'TRX123');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Payment TRX123',
        html: expect.stringContaining('Amount: 1000')
      }));
    });
    
    it('triggerPaymentPendingAdminEmail should email admins', async () => {
      await service.triggerPaymentPendingAdminEmail('TestBiz', '1000', 'TRX123');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'superadmin@test.com',
        subject: 'Admin Alert',
        html: expect.stringContaining('Admin Body')
      }));
    });

    it('triggerPaymentApprovedEmail should replace placeholders', async () => {
      await service.triggerPaymentApprovedEmail('test@biz.com', 'TestBiz', 'Premium Plan');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Approved Premium Plan',
        html: expect.stringContaining('Plan: Premium Plan')
      }));
    });

    it('triggerAddonPurchasedEmail should replace placeholders', async () => {
      await service.triggerAddonPurchasedEmail('test@biz.com', 'TestBiz', 'Storage 1GB', '500');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Addon Storage 1GB',
        html: expect.stringContaining('Addon: Storage 1GB')
      }));
    });

    it('triggerExpiryReminderEmail (7 days) should replace placeholders', async () => {
      await service.triggerExpiryReminderEmail('test@biz.com', 'TestBiz', 7, '2027-01-01');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: '7 days left',
        html: expect.stringContaining('Expire 7 days')
      }));
    });

    it('triggerExpiryReminderEmail (2 days) should replace placeholders', async () => {
      await service.triggerExpiryReminderEmail('test@biz.com', 'TestBiz', 2, '2027-01-01');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: '2 days left',
        html: expect.stringContaining('Expire 2 days')
      }));
    });

    it('triggerAgentCreatedEmail should replace placeholders', async () => {
      await service.triggerAgentCreatedEmail('agent@biz.com', 'Agent John', 'TestBiz', 'password123');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Agent Agent John',
        html: expect.stringContaining('Pass: password123')
      }));
    });

    it('triggerPasswordResetEmail should replace placeholders', async () => {
      await service.triggerPasswordResetEmail('user@test.com', 'User Alice', 'http://reset.link');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Reset User Alice',
        html: expect.stringContaining('Link: <a href="http://reset.link"')
      }));
    });

    it('triggerNewInquiryEmail should replace placeholders and email admins', async () => {
      await service.triggerNewInquiryEmail('Lead Bob', 'lead@test.com', 'Hello there');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'superadmin@test.com',
        subject: 'Inquiry Lead Bob',
        html: expect.stringContaining('Msg: Hello there')
      }));
    });

    it('triggerTicketCreatedEmail should replace placeholders and email admins', async () => {
      await service.triggerTicketCreatedEmail('TestBiz', 'Server Down', 'High');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'superadmin@test.com',
        subject: 'Ticket Server Down',
        html: expect.stringContaining('Prio: High')
      }));
    });

    it('triggerTicketRepliedEmail should replace placeholders', async () => {
      await service.triggerTicketRepliedEmail('test@biz.com', 'Server Down', 'We fixed it');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Reply Server Down',
        html: expect.stringContaining('Msg: We fixed it')
      }));
    });

    it('triggerTicketStatusEmail should replace placeholders', async () => {
      await service.triggerTicketStatusEmail('test@biz.com', 'Server Down', 'Closed');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Status Server Down',
        html: expect.stringContaining('Stat: Closed')
      }));
    });

    it('triggerTicketAssignedEmail should replace placeholders', async () => {
      await service.triggerTicketAssignedEmail('admin@test.com', 'Admin Mark', 'TestBiz', 'Server Down');
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Assigned Server Down',
        html: expect.stringContaining('To: Admin Mark')
      }));
    });

    it('triggerBroadcastCompletedEmail should replace placeholders', async () => {
      await service.triggerBroadcastCompletedEmail('test@biz.com', 'TestBiz', 'Promo2027', 1000);
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Broadcast Complete - Promo2027',
        html: expect.stringContaining('Hello TestBiz, your broadcast Promo2027 is done!')
      }));
    });
  });

  describe('Fallback mechanisms', () => {
    it('should create default config if none exists and not send welcome email', async () => {
      mockPrismaService.smtpConfig.findFirst.mockResolvedValue(null);
      await service.triggerWelcomeEmail('owner@biz.com', 'TestBiz');
      expect(mockPrismaService.smtpConfig.create).toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
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

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: expect.stringContaining('ব্রডকাস্ট সফলভাবে সম্পন্ন হয়েছে – My Biz'),
        html: expect.stringContaining('প্রিয় John Doe')
      }));
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { OutreachProcessor, OutreachJobData } from './outreach.processor';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSmtpService } from './tenant-smtp.service';
import { OutreachAiService } from './outreach-ai.service';
import { QuotaService } from '../tenants/quota.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Job } from 'bullmq';

describe('OutreachProcessor (Phase 6: Throttled Queue, Rate Limiting & Outbound Dispatcher)', () => {
  let processor: OutreachProcessor;
  let mockPrisma: any;
  let mockTenantSmtp: any;
  let mockOutreachAi: any;
  let mockQuota: any;
  let mockNotifications: any;
  let mockTransporter: any;

  const mockCampaign = {
    id: 'camp-100',
    tenantId: 'tenant-100',
    name: 'Winter Promo',
    status: 'running',
    sentCount: 10,
    bouncedCount: 1,
    failedCount: 0,
    throttleIntervalSec: 60,
  };

  const mockLead = {
    id: 'lead-200',
    campaignId: 'camp-100',
    tenantId: 'tenant-100',
    trackingToken: 'token-abc',
    businessName: 'Apex Handicrafts',
    email: 'info@apexhandicrafts.com',
    phone: '+8801700112233',
    phoneOnly: false,
    status: 'pending',
    personalizedSubject: 'Quick question for Apex Handicrafts',
    personalizedBodyHtml: '<p>Hello Apex</p>',
  };

  const mockSmtpSetting = {
    tenantId: 'tenant-100',
    fromName: 'Crafts BD',
    fromEmail: 'noreply@craftsbd.com',
    replyToEmail: 'support@craftsbd.com',
    isVerified: true,
  };

  const createMockJob = (dataPartial: Partial<OutreachJobData> = {}): Job<OutreachJobData> => {
    return {
      id: 'job-1',
      data: {
        campaignId: 'camp-100',
        leadId: 'lead-200',
        tenantId: 'tenant-100',
        email: 'info@apexhandicrafts.com',
        isTestMode: false,
        ...dataPartial,
      },
    } as any;
  };

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: '<msg-123@smtp>' }),
    };

    mockPrisma = {
      emailCampaign: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'camp-100') return Promise.resolve({ ...mockCampaign });
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...mockCampaign, ...args.data })),
      },
      campaignLead: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'lead-200') return Promise.resolve({ ...mockLead });
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(5),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...mockLead, ...args.data })),
      },
      outreachSuppression: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      tenantSmtpSetting: {
        findUnique: jest.fn().mockResolvedValue({ ...mockSmtpSetting }),
        update: jest.fn().mockResolvedValue({ ...mockSmtpSetting }),
      },
      globalOutreachConfig: {
        findFirst: jest.fn().mockResolvedValue({ isEmergencyPaused: false }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'user-admin', role: 'admin' }]),
      },
    };

    mockTenantSmtp = {
      getDecryptedTransporter: jest.fn().mockResolvedValue(mockTransporter),
    };

    mockOutreachAi = {
      generatePersonalizedEmail: jest.fn().mockResolvedValue({
        subject: 'Generated Subject',
        htmlBody: '<p>Generated HTML</p>',
      }),
    };

    mockQuota = {
      checkAiQuota: jest.fn().mockResolvedValue(undefined),
      reserveAiQuota: jest.fn().mockResolvedValue('quota-log-1'),
      commitAiQuota: jest.fn().mockResolvedValue(undefined),
      refundAiQuota: jest.fn().mockResolvedValue(undefined),
    };

    mockNotifications = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutreachProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantSmtpService, useValue: mockTenantSmtp },
        { provide: OutreachAiService, useValue: mockOutreachAi },
        { provide: QuotaService, useValue: mockQuota },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    processor = module.get<OutreachProcessor>(OutreachProcessor);
  });

  describe('1. Processor Definition & Rate Limiter Configuration', () => {
    it('should be defined with 8% bounce tripwire threshold and 50 min email threshold', () => {
      expect(processor).toBeDefined();
      expect(processor.MAX_BOUNCE_RATE_PERCENT).toBe(8);
      expect(processor.MIN_EMAILS_FOR_TRIPWIRE).toBe(50);
    });

    it('should generate a randomized jitter delay between 0 and 15,000ms', () => {
      const jitter = processor.calculateJitterDelayMs();
      expect(jitter).toBeGreaterThanOrEqual(0);
      expect(jitter).toBeLessThanOrEqual(15000);
    });
  });

  describe('2. Pre-flight Status & Duplicate Email Guards (स्तर ৪)', () => {
    it('should skip job if campaign is paused', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValueOnce({
        ...mockCampaign,
        status: 'paused',
      });

      const res = await processor.process(createMockJob());
      expect(res.status).toBe('skipped');
      expect(res.reason).toBe('CAMPAIGN_PAUSED');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should auto-pause campaign if global emergency kill-switch is active', async () => {
      mockPrisma.globalOutreachConfig.findFirst.mockResolvedValueOnce({
        isEmergencyPaused: true,
      });

      const res = await processor.process(createMockJob());
      expect(res.status).toBe('paused');
      expect(res.reason).toBe('EMERGENCY_KILLSWITCH_ACTIVE');
      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-100' },
          data: { status: 'paused' },
        }),
      );
    });

    it('should skip lead if already marked as sent (Zero-duplicate status guard)', async () => {
      mockPrisma.campaignLead.findUnique.mockResolvedValueOnce({
        ...mockLead,
        status: 'sent',
      });

      const res = await processor.process(createMockJob());
      expect(res.status).toBe('skipped');
      expect(res.reason).toBe('LEAD_ALREADY_SENT');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('3. Phone-Only Bypass Guard', () => {
    it('should skip phone-only leads and bypass email dispatch', async () => {
      mockPrisma.campaignLead.findUnique.mockResolvedValueOnce({
        ...mockLead,
        phoneOnly: true,
      });

      const res = await processor.process(createMockJob());
      expect(res.status).toBe('skipped');
      expect(res.reason).toBe('PHONE_ONLY_BYPASS');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should skip lead if email is null', async () => {
      mockPrisma.campaignLead.findUnique.mockResolvedValueOnce({
        ...mockLead,
        email: null,
      });

      const res = await processor.process(createMockJob());
      expect(res.status).toBe('skipped');
      expect(res.reason).toBe('PHONE_ONLY_BYPASS');
    });
  });

  describe('4. Global & Tenant Suppression List Guard', () => {
    it('should skip lead and update status to unsubscribed if found on suppression list', async () => {
      mockPrisma.outreachSuppression.findFirst.mockResolvedValueOnce({
        id: 'supp-1',
        email: 'info@apexhandicrafts.com',
        reason: 'unsubscribed',
      });

      const res = await processor.process(createMockJob());

      expect(res.status).toBe('skipped');
      expect(res.reason).toBe('SUPPRESSED');
      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-200' },
          data: expect.objectContaining({
            status: 'unsubscribed',
          }),
        }),
      );
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('5. 30-Day Cross-Campaign Cooldown Guard', () => {
    it('should skip lead if contacted in the last 30 days by any campaign of this tenant', async () => {
      mockPrisma.campaignLead.findFirst.mockResolvedValueOnce({
        id: 'previous-lead-id',
        email: 'info@apexhandicrafts.com',
        status: 'sent',
      });

      const res = await processor.process(createMockJob());

      expect(res.status).toBe('skipped');
      expect(res.reason).toBe('COOLDOWN_ACTIVE');
      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-200' },
          data: expect.objectContaining({
            status: 'failed',
            errorMessage: expect.stringContaining('30-day cross-campaign cooldown'),
          }),
        }),
      );
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('6. AI Quota Reservation Saga Pattern', () => {
    it('should reserve 1 AI unit and commit on successful send', async () => {
      const res = await processor.process(createMockJob());

      expect(res.status).toBe('sent');
      expect(mockQuota.checkAiQuota).toHaveBeenCalledWith('tenant-100');
      expect(mockQuota.reserveAiQuota).toHaveBeenCalledWith(
        'tenant-100',
        1,
        'OUTREACH_EMAIL_DISPATCH',
        'lead-200',
      );
      expect(mockQuota.commitAiQuota).toHaveBeenCalledWith('quota-log-1', 0, 0);
      expect(mockQuota.refundAiQuota).not.toHaveBeenCalled();
    });

    it('should auto-pause campaign and notify admins when AI quota is exhausted', async () => {
      mockQuota.checkAiQuota.mockRejectedValueOnce(new Error('AI Quota Exceeded'));

      const res = await processor.process(createMockJob());

      expect(res.status).toBe('paused');
      expect(res.reason).toBe('QUOTA_EXHAUSTED');
      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-100' },
          data: { status: 'paused' },
        }),
      );
      expect(mockNotifications.createNotification).toHaveBeenCalled();
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should refund reserved quota if SMTP transmission fails', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP Network Failure'));

      const res = await processor.process(createMockJob());

      expect(res.status).toBe('failed');
      expect(mockQuota.reserveAiQuota).toHaveBeenCalled();
      expect(mockQuota.refundAiQuota).toHaveBeenCalledWith('quota-log-1');
      expect(mockQuota.commitAiQuota).not.toHaveBeenCalled();
    });
  });

  describe('7. SMTP Dispatch & Campaign Counter Updates', () => {
    it('should send email with correct envelope headers, update lead status to sent, and increment sentCount', async () => {
      const res = await processor.process(createMockJob());

      expect(res.status).toBe('sent');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"Crafts BD" <noreply@craftsbd.com>',
        to: 'info@apexhandicrafts.com',
        replyTo: 'support@craftsbd.com',
        subject: 'Quick question for Apex Handicrafts',
        html: '<p>Hello Apex</p>',
      });

      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-200' },
          data: expect.objectContaining({
            status: 'sent',
            sentAt: expect.any(Date),
          }),
        }),
      );

      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-100' },
          data: { sentCount: { increment: 1 } },
        }),
      );
    });

    it('should automatically mark campaign completed when no pending leads remain', async () => {
      mockPrisma.campaignLead.count.mockResolvedValueOnce(0);

      await processor.process(createMockJob());

      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-100' },
          data: expect.objectContaining({
            status: 'completed',
            completedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('8. Bounce Detection & Automated Tripwire (> 8% over 50 emails)', () => {
    it('should detect 550 recipient rejected as bounced and increment bouncedCount', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('550 5.1.1 <info@apexhandicrafts.com>: Recipient address rejected: User unknown in virtual mailbox table'),
      );

      const res = await processor.process(createMockJob());

      expect(res.status).toBe('bounced');
      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-200' },
          data: expect.objectContaining({
            status: 'bounced',
          }),
        }),
      );
      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-100' },
          data: { bouncedCount: { increment: 1 } },
        }),
      );
    });

    it('should automatically pause campaign when bounce rate exceeds 8% over 50 evaluated emails', async () => {
      // 45 sent, 5 bounced => 50 evaluated, 10% bounce rate (> 8%)
      mockPrisma.emailCampaign.update.mockResolvedValueOnce({
        ...mockCampaign,
        sentCount: 45,
        bouncedCount: 5,
      });

      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('550 Mailbox not found'),
      );

      const res = await processor.process(createMockJob());

      expect(res.status).toBe('bounced');
      expect(res.reason).toBe('BOUNCE_TRIPWIRE_TRIGGERED');
      expect(res.bounceRate).toBe(10);

      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-100' },
          data: { status: 'paused' },
        }),
      );

      expect(mockNotifications.createNotification).toHaveBeenCalled();
    });
  });
});

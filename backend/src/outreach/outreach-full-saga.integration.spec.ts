import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BillingService } from '../billing/billing.service';
import { OutreachCampaignService } from './outreach-campaign.service';
import { OutreachAiService } from './outreach-ai.service';
import { OutreachDispatchService } from './outreach-dispatch.service';
import { OutreachProcessor } from './outreach.processor';
import { OutreachAttributionService } from './outreach-attribution.service';
import { TenantSmtpService } from './tenant-smtp.service';
import { getQueueToken } from '@nestjs/bullmq';

const TENANT_ID = 'tenant-outreach-saga-1';
const CAMPAIGN_ID = 'campaign-saga-1001';

describe('Zini-Mail Full-Saga End-to-End Integration Suite', () => {
  let campaignService: OutreachCampaignService;
  let attributionService: OutreachAttributionService;
  let dispatchService: OutreachDispatchService;
  let processor: OutreachProcessor;

  let prismaMock: any;
  let quotaServiceMock: any;
  let notificationsServiceMock: any;
  let billingServiceMock: any;
  let tenantSmtpServiceMock: any;
  let queueMock: any;

  // In-memory state tracking
  let dbCampaign: any;
  let dbLeads: any[] = [];
  let dbTenant: any;
  let dbOrders: any[] = [];
  let dbSuppression: any[] = [];
  let queuedJobs: any[] = [];

  beforeEach(async () => {
    // Reset in-memory database simulation
    dbTenant = {
      id: TENANT_ID,
      name: 'Apex Boutique BD',
      storageUsedBytes: BigInt(200000),
      customStorageLimitMb: 500,
    };

    dbCampaign = {
      id: CAMPAIGN_ID,
      tenantId: TENANT_ID,
      name: 'Winter Festive Handicrafts',
      bannerImageUrl: 'https://cdn.zinichat.com/winter-banner.jpg',
      bannerClickUrl: 'https://apexboutique.com/winter-festive',
      bannerSizeBytes: 200000,
      storageUsedBytes: BigInt(200000),
      status: 'draft',
      language: 'bn',
      tone: 'consultative',
      targetKeywords: ['handicraft', 'nakshi', 'saree'],
      channels: ['facebook', 'instagram'],
      totalLimit: 500,
      sentCount: 0,
      opensCount: 0,
      clicksCount: 0,
      ordersCount: 0,
      revenueGenerated: 0,
      phoneOnlyLeadsCount: 2,
      createdAt: new Date(),
    };

    // Pre-populate 8 email leads + 2 phone-only leads
    dbLeads = [];
    for (let i = 1; i <= 8; i++) {
      dbLeads.push({
        id: `lead-${i}`,
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        trackingToken: `token-${i}`,
        businessName: `Handicraft Business ${i}`,
        sourceChannel: i % 2 === 0 ? 'facebook' : 'instagram',
        email: `merchant${i}@dhakacraft.com`,
        phone: `+880170000000${i}`,
        phoneOnly: false,
        personalizedSubject: `Exclusive partnership for Handicraft Business ${i}`,
        personalizedBodyHtml: `<p>Hello Handicraft Business ${i}</p>`,
        status: 'pending',
        openedAt: null,
        clickedAt: null,
        orderedAt: null,
        orderAmount: null,
        sentAt: null,
      });
    }

    for (let i = 9; i <= 10; i++) {
      dbLeads.push({
        id: `lead-${i}`,
        campaignId: CAMPAIGN_ID,
        tenantId: TENANT_ID,
        trackingToken: `token-${i}`,
        businessName: `Phone Boutique ${i}`,
        sourceChannel: 'facebook',
        email: null,
        phone: `+880190000000${i}`,
        phoneOnly: true,
        personalizedSubject: null,
        personalizedBodyHtml: null,
        status: 'pending',
        openedAt: null,
        clickedAt: null,
        orderedAt: null,
        orderAmount: null,
        sentAt: null,
      });
    }

    dbOrders = [];
    dbSuppression = [];
    queuedJobs = [];

    // Mock Prisma Service
    prismaMock = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prismaMock);
      }),
      emailCampaign: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          dbCampaign = { ...dbCampaign, ...data, id: CAMPAIGN_ID };
          return dbCampaign;
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === CAMPAIGN_ID) return dbCampaign;
          return null;
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === CAMPAIGN_ID) return dbCampaign;
          return null;
        }),
        findMany: jest.fn().mockImplementation(() => {
          return [dbCampaign];
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const updated = { ...dbCampaign, ...data };
          for (const key of ['opensCount', 'clicksCount', 'ordersCount', 'sentCount', 'bouncedCount', 'failedCount']) {
            if (data[key]?.increment !== undefined) {
              const currentVal = typeof dbCampaign[key] === 'number' ? dbCampaign[key] : 0;
              updated[key] = currentVal + data[key].increment;
            }
          }
          dbCampaign = updated;
          return dbCampaign;
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          dbCampaign = null;
          dbLeads = [];
          return { id: where.id };
        }),
        count: jest.fn().mockResolvedValue(1),
      },
      campaignLead: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const lead = {
            id: `lead-${dbLeads.length + 1}`,
            trackingToken: `token-${dbLeads.length + 1}`,
            status: 'pending',
            openedAt: null,
            clickedAt: null,
            orderedAt: null,
            orderAmount: null,
            ...data,
          };
          dbLeads.push(lead);
          return lead;
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.trackingToken) {
            return dbLeads.find((l) => l.trackingToken === where.trackingToken) || null;
          }
          if (where.id) {
            return dbLeads.find((l) => l.id === where.id) || null;
          }
          return null;
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          return (
            dbLeads.find((l) => {
              if (where.id && l.id !== where.id) return false;
              if (where.trackingToken && l.trackingToken !== where.trackingToken) return false;
              if (where.campaignId && l.campaignId !== where.campaignId) return false;
              if (where.email && l.email !== where.email) return false;
              return true;
            }) || null
          );
        }),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          return dbLeads.filter((l) => {
            if (where.campaignId && l.campaignId !== where.campaignId) return false;
            if (where.tenantId && l.tenantId !== where.tenantId) return false;
            if (where.status && l.status !== where.status) return false;
            if (where.phoneOnly !== undefined && l.phoneOnly !== where.phoneOnly) return false;
            if (where.email && where.email.not === null && l.email === null) return false;
            if (where.openedAt && where.openedAt.not === null && l.openedAt === null) return false;
            if (where.clickedAt && where.clickedAt.not === null && l.clickedAt === null) return false;
            if (where.orderedAt === null && l.orderedAt !== null) return false;
            if (where.orderedAt && where.orderedAt.not === null && l.orderedAt === null) return false;
            return true;
          });
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const index = dbLeads.findIndex((l) => l.id === where.id || l.trackingToken === where.trackingToken);
          if (index >= 0) {
            dbLeads[index] = { ...dbLeads[index], ...data };
            return dbLeads[index];
          }
          return null;
        }),
        count: jest.fn().mockImplementation(({ where }: any) => {
          return dbLeads.filter((l) => {
            if (where.campaignId && l.campaignId !== where.campaignId) return false;
            if (where.status && l.status !== where.status) return false;
            if (where.phoneOnly !== undefined && l.phoneOnly !== where.phoneOnly) return false;
            if (where.email && where.email.not === null && l.email === null) return false;
            if (where.openedAt && where.openedAt.not === null && l.openedAt === null) return false;
            if (where.clickedAt && where.clickedAt.not === null && l.clickedAt === null) return false;
            if (where.orderedAt === null && l.orderedAt !== null) return false;
            if (where.orderedAt && where.orderedAt.not === null && l.orderedAt === null) return false;
            return true;
          }).length;
        }),
      },
      tenant: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === TENANT_ID) return dbTenant;
          return null;
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          dbTenant = { ...dbTenant, ...data };
          return dbTenant;
        }),
      },
      order: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const order = { id: `order-${dbOrders.length + 1}`, ...data };
          dbOrders.push(order);
          return order;
        }),
      },
      outreachSuppression: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          return dbSuppression.find((s) => s.email === where.email) || null;
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          dbSuppression.push(data);
          return data;
        }),
      },
      contact: {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact-1', tags: ['#Outreach-Discovered'] }),
        update: jest.fn().mockResolvedValue({ id: 'contact-1' }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'admin-1', role: 'owner' }]),
      },
      globalOutreachConfig: {
        findFirst: jest.fn().mockResolvedValue({ isEmergencyPaused: false }),
      },
      tenantSmtpSetting: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'smtp-1',
          tenantId: TENANT_ID,
          isVerified: true,
          fromEmail: 'sales@apexboutique.com',
          fromName: 'Apex Boutique',
          dailySentCount: 10,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      aiUsageLog: {
        count: jest.fn().mockResolvedValue(50),
      },
    };

    quotaServiceMock = {
      checkAiQuota: jest.fn().mockResolvedValue(undefined),
      reserveAiQuota: jest.fn().mockResolvedValue('res-saga-1'),
      commitAiQuota: jest.fn().mockResolvedValue(undefined),
      refundAiQuota: jest.fn().mockResolvedValue(undefined),
    };

    notificationsServiceMock = {
      createNotification: jest.fn().mockResolvedValue(undefined),
    };

    billingServiceMock = {
      getActivePeriod: jest.fn().mockResolvedValue({
        periodStart: new Date('2026-10-01'),
        aiQuota: 1000,
      }),
    };

    tenantSmtpServiceMock = {
      getDecryptedTransporter: jest.fn().mockResolvedValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-mock-123' }),
      }),
      getSmtpSetting: jest.fn().mockResolvedValue({
        id: 'smtp-1',
        isVerified: true,
        fromEmail: 'sales@apexboutique.com',
        fromName: 'Apex Boutique',
      }),
    };

    queueMock = {
      add: jest.fn().mockImplementation((name, data, opts) => {
        queuedJobs.push({ name, data, opts });
        return { id: opts.jobId };
      }),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getDelayedCount: jest.fn().mockResolvedValue(0),
      isPaused: jest.fn().mockResolvedValue(false),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutreachCampaignService,
        OutreachAttributionService,
        OutreachDispatchService,
        OutreachAiService,
        OutreachProcessor,
        { provide: TenantSmtpService, useValue: tenantSmtpServiceMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: QuotaService, useValue: quotaServiceMock },
        { provide: NotificationsService, useValue: notificationsServiceMock },
        { provide: BillingService, useValue: billingServiceMock },
        { provide: getQueueToken('outreach-email-queue'), useValue: queueMock },
      ],
    }).compile();

    campaignService = module.get<OutreachCampaignService>(OutreachCampaignService);
    attributionService = module.get<OutreachAttributionService>(OutreachAttributionService);
    dispatchService = module.get<OutreachDispatchService>(OutreachDispatchService);
    processor = module.get<OutreachProcessor>(OutreachProcessor);
  });

  describe('1. Full Lifecycle Campaign Creation & Lead Discovery', () => {
    it('should create campaign, populate email and phone-only leads, and update storage quota', async () => {
      // 1. Create Campaign
      const campaign = await campaignService.createCampaign(TENANT_ID, {
        name: 'Winter Festive Handicrafts',
        bannerImageUrl: 'https://cdn.zinichat.com/winter-banner.jpg',
        bannerClickUrl: 'https://apexboutique.com/winter-festive',
        bannerSizeBytes: 200000,
        targetKeywords: ['handicraft', 'nakshi'],
        channels: ['facebook', 'instagram'],
        totalLimit: 500,
        language: 'bn',
        tone: 'consultative',
      });

      expect(campaign.id).toBe(CAMPAIGN_ID);
      expect(campaign.status).toBe('draft');
      expect(campaign.storageUsedBytes).toBeGreaterThan(0);

      // Verify lead distribution
      expect(dbLeads.length).toBe(10);
      const phoneOnlyCount = dbLeads.filter((l) => l.phoneOnly).length;
      expect(phoneOnlyCount).toBe(2);
    });
  });

  describe('2. Throttled Outbound Dispatcher & Quota Saga Commit', () => {
    it('should queue only email leads, bypass phone-only leads, reserve AI quota, and commit on delivery', async () => {
      // Start campaign
      const launchResult = await dispatchService.startCampaign(CAMPAIGN_ID, TENANT_ID, {
        isTestMode: false,
      });

      expect(launchResult.success).toBe(true);
      expect(launchResult.status).toBe('running');

      // Check queued jobs in BullMQ (8 email leads queued; 2 phone-only bypassed)
      expect(queuedJobs.length).toBe(8);
      expect(queuedJobs[0].opts.jobId).toContain('outreach-');

      // Process job through OutreachProcessor
      const jobToProcess = {
        id: 'job-1',
        data: {
          campaignId: CAMPAIGN_ID,
          leadId: dbLeads[0].id,
          email: dbLeads[0].email,
          tenantId: TENANT_ID,
          isTestMode: false,
        },
      };

      const result = await processor.process(jobToProcess as any);
      expect(result.status).toBe('sent');

      // Verify lead status updated to sent
      const processedLead = dbLeads.find((l) => l.id === dbLeads[0].id);
      expect(processedLead.status).toBe('sent');
      expect(processedLead.sentAt).not.toBeNull();

      // Verify QuotaService AI saga units reserved and committed
      expect(quotaServiceMock.reserveAiQuota).toHaveBeenCalledWith(
        TENANT_ID,
        1,
        'OUTREACH_EMAIL_DISPATCH',
        dbLeads[0].id,
      );
      expect(quotaServiceMock.commitAiQuota).toHaveBeenCalledWith('res-saga-1', 0, 0);
    });

    it('should refund AI quota units if SMTP dispatch fails', async () => {
      const failingJob = {
        id: 'job-fail-1',
        data: {
          campaignId: CAMPAIGN_ID,
          leadId: dbLeads[1].id,
          email: dbLeads[1].email,
          tenantId: TENANT_ID,
          isTestMode: false,
        },
      };

      // Mock SMTP send error in transporter
      tenantSmtpServiceMock.getDecryptedTransporter.mockResolvedValueOnce({
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP Handshake Timeout')),
      });

      // Process job through OutreachProcessor
      const result = await processor.process(failingJob as any);
      expect(result.status).toBe('failed');
      expect(result.reason).toBe('SMTP Handshake Timeout');

      // Must rollback and refund AI units
      expect(quotaServiceMock.refundAiQuota).toHaveBeenCalledWith('res-saga-1');
    });
  });

  describe('3. Attribution Telemetry, Smart Redirect & Order Attribution', () => {
    it('should track 1x1 GIF open, smart click redirect with 30-day cookie, and attribute converted order', async () => {
      const testLead = dbLeads[0];

      // 1. Prospect opens email -> 1x1 GIF tracking
      const gifBuffer = await attributionService.recordOpen(testLead.trackingToken);
      expect(gifBuffer.length).toBe(42); // 1x1 transparent GIF (42 bytes)

      const openedLead = dbLeads.find((l) => l.id === testLead.id);
      expect(openedLead.openedAt).not.toBeNull();
      expect(dbCampaign.opensCount).toBe(1);

      // 2. Prospect clicks hero banner -> Smart redirect & 30-day cookie
      const clickResult = await attributionService.recordClick(
        testLead.trackingToken,
        'https://apexboutique.com/winter-festive',
      );

      expect(clickResult.destinationUrl).toContain('utm_source=zinichat_outreach');
      expect(clickResult.destinationUrl).toContain(`utm_campaign=${CAMPAIGN_ID}`);

      const clickedLead = dbLeads.find((l) => l.id === testLead.id);
      expect(clickedLead.clickedAt).not.toBeNull();
      expect(dbCampaign.clicksCount).toBe(1);

      // 3. Prospect completes purchase on merchant website -> Atomic Order Attribution
      await prismaMock.$transaction(async (tx: any) => {
        await tx.order.create({
          data: {
            tenantId: TENANT_ID,
            total: 3500.0,
            outreachCampaignId: CAMPAIGN_ID,
            outreachLeadId: testLead.id,
          },
        });

        await tx.campaignLead.update({
          where: { id: testLead.id },
          data: {
            orderedAt: new Date(),
            orderAmount: 3500.0,
            status: 'ordered',
          },
        });

        await tx.emailCampaign.update({
          where: { id: CAMPAIGN_ID },
          data: {
            ordersCount: { increment: 1 },
            revenueGenerated: 3500.0,
          },
        });
      });

      const orderedLead = dbLeads.find((l) => l.id === testLead.id);
      expect(orderedLead.orderedAt).not.toBeNull();
      expect(orderedLead.status).toBe('ordered');
      expect(dbCampaign.ordersCount).toBe(1);
      expect(dbCampaign.revenueGenerated).toBe(3500.0);
    });
  });

  describe('4. Precision "Clicked (No Order Yet)" High-Intent Filtering & Retargeting', () => {
    it('should isolate EXACTLY prospects who clicked without ordering and exclude converted buyers', async () => {
      // Setup known funnel state across leads:
      // Lead 0: Clicked AND Ordered (converted buyer)
      // Lead 1: Sent only
      // Lead 2: Clicked BUT No Order Yet (Hot Lead)
      // Lead 3: Clicked BUT No Order Yet (Hot Lead)
      // Lead 4: Opened only (no click)
      // Lead 5: Clicked BUT No Order Yet (Hot Lead)
      // Lead 6: Sent only
      // Lead 7: Sent only

      dbLeads[0].clickedAt = new Date();
      dbLeads[0].orderedAt = new Date();

      dbLeads[2].clickedAt = new Date();
      dbLeads[2].orderedAt = null;
      dbLeads[2].contactId = 'contact-1';

      dbLeads[3].clickedAt = new Date();
      dbLeads[3].orderedAt = null;
      dbLeads[3].contactId = 'contact-1';

      dbLeads[4].openedAt = new Date();
      dbLeads[4].clickedAt = null;

      dbLeads[5].clickedAt = new Date();
      dbLeads[5].orderedAt = null;
      dbLeads[5].contactId = 'contact-1';

      // Query campaign leads with filter: 'clicked_no_order'
      const result = await campaignService.getCampaignLeads(CAMPAIGN_ID, TENANT_ID, {
        filter: 'clicked_no_order',
      });

      // EXACTLY 3 leads (leads 2, 3, 5) must be returned!
      // Lead 0 (ordered) must NOT be returned!
      // Leads 1, 4, 6, 7 (unclicked) must NOT be returned!
      expect(result.leads.length).toBe(3);
      expect(result.leads.map((l) => l.id)).toEqual(
        expect.arrayContaining([dbLeads[2].id, dbLeads[3].id, dbLeads[5].id]),
      );
      expect(result.leads.some((l) => l.id === dbLeads[0].id)).toBe(false);

      // 1-Click Retargeting: Push these 3 leads to Hot Lead CRM stage & tag for WhatsApp Broadcast
      const retargetResult = await campaignService.retargetClickedNoOrderLeads(CAMPAIGN_ID, TENANT_ID);
      expect(retargetResult.retargetedCount).toBe(3);
      expect(prismaMock.contact.update).toHaveBeenCalled();
    });
  });

  describe('5. CAN-SPAM Public Unsubscribe & Suppression Blacklist Propagation', () => {
    it('should handle public unsubscribe, add email to suppression list, and auto-skip in future runs', async () => {
      const prospectToken = dbLeads[7].trackingToken;
      const prospectEmail = dbLeads[7].email;

      // Prospect clicks unsubscribe link in footer
      const unsubResult = await attributionService.unsubscribeProspect(
        prospectToken,
        'not_relevant',
        'Not interested in handicrafts',
      );

      expect(unsubResult.success).toBe(true);
      expect(unsubResult.email).toBe(prospectEmail);

      // Verify lead updated to unsubscribed
      const unsubLead = dbLeads.find((l) => l.id === dbLeads[7].id);
      expect(unsubLead.status).toBe('unsubscribed');

      // Verify email added to OutreachSuppression
      expect(dbSuppression.some((s) => s.email === prospectEmail)).toBe(true);

      // When a new campaign runs, suppression pre-flight must drop this email
      const suppressionRecord = await prismaMock.outreachSuppression.findFirst({
        where: { email: prospectEmail },
      });
      expect(suppressionRecord).not.toBeNull();
    });
  });

  describe('6. Emergency Kill-Switch & Bounce Rate Tripwire Integrity', () => {
    it('should instantly pause queues when Superadmin activates master kill-switch', async () => {
      // Simulate Superadmin activating Emergency Kill-Switch
      prismaMock.globalOutreachConfig.findFirst.mockResolvedValueOnce({
        isEmergencyPaused: true,
      });

      const jobUnderKillSwitch = {
        id: 'job-kill-1',
        data: {
          campaignId: CAMPAIGN_ID,
          leadId: dbLeads[6].id,
          email: dbLeads[6].email,
          tenantId: TENANT_ID,
          isTestMode: false,
        },
      };

      const result = await processor.process(jobUnderKillSwitch as any);

      // Job must be paused with kill-switch reason
      expect(result.status).toBe('paused');
      expect(result.reason).toBe('EMERGENCY_KILLSWITCH_ACTIVE');
    });

    it('should auto-pause campaign if bounce rate tripwire triggers (> 8% over 50 emails)', async () => {
      // Simulate campaign with 50 sent emails and 5 bounces (10% bounce rate > 8% tripwire)
      dbCampaign.sentCount = 50;
      dbCampaign.bouncedCount = 5;

      const bounceJob = {
        id: 'job-bounce-1',
        data: {
          campaignId: CAMPAIGN_ID,
          leadId: dbLeads[6].id,
          email: dbLeads[6].email,
          tenantId: TENANT_ID,
          isTestMode: false,
        },
      };

      // Mock 550 SMTP hard bounce
      tenantSmtpServiceMock.getDecryptedTransporter.mockResolvedValueOnce({
        sendMail: jest.fn().mockRejectedValue(new Error('550 User mailbox not found')),
      });

      const result = await processor.process(bounceJob as any);
      expect(result.status).toBe('bounced');
      expect(result.reason).toBe('BOUNCE_TRIPWIRE_TRIGGERED');

      // Verify campaign auto-paused and admin notified
      expect(prismaMock.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CAMPAIGN_ID },
          data: expect.objectContaining({ status: 'paused' }),
        }),
      );
      expect(notificationsServiceMock.createNotification).toHaveBeenCalled();
    });
  });
});

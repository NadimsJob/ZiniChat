import { Test, TestingModule } from '@nestjs/testing';
import { OutreachDispatchService } from './outreach-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { QuotaService } from '../tenants/quota.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('OutreachDispatchService', () => {
  let service: OutreachDispatchService;
  let mockPrisma: any;
  let mockQueue: any;
  let mockQuota: any;

  const mockCampaign = {
    id: 'camp-300',
    tenantId: 'tenant-300',
    name: 'Summer Outreach',
    status: 'draft',
    throttleIntervalSec: 60,
    startedAt: null,
    sentCount: 100,
    bouncedCount: 4,
    failedCount: 2,
    opensCount: 40,
    clicksCount: 10,
    ordersCount: 2,
    phoneOnlyLeadsCount: 5,
  };

  const mockSmtpSetting = {
    tenantId: 'tenant-300',
    isVerified: true,
  };

  const mockLeads = [
    {
      id: 'lead-1',
      campaignId: 'camp-300',
      tenantId: 'tenant-300',
      email: 'lead1@example.com',
      phoneOnly: false,
      status: 'pending',
    },
    {
      id: 'lead-2',
      campaignId: 'camp-300',
      tenantId: 'tenant-300',
      email: 'LEAD2@example.com', // Test email normalization
      phoneOnly: false,
      status: 'pending',
    },
  ];

  beforeEach(async () => {
    mockPrisma = {
      emailCampaign: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'camp-300') return Promise.resolve({ ...mockCampaign });
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...mockCampaign, ...args.data })),
      },
      tenantSmtpSetting: {
        findUnique: jest.fn().mockResolvedValue({ ...mockSmtpSetting }),
      },
      globalOutreachConfig: {
        findFirst: jest.fn().mockResolvedValue({ isEmergencyPaused: false }),
      },
      campaignLead: {
        findMany: jest.fn().mockResolvedValue([...mockLeads]),
        count: jest.fn().mockResolvedValue(2),
      },
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    };

    mockQuota = {
      checkActiveSubscription: jest.fn().mockResolvedValue(true),
      isTenantSubscriptionActive: jest.fn().mockResolvedValue({ isActive: true }),
      checkAiQuota: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutreachDispatchService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('outreach-email-queue'), useValue: mockQueue },
        { provide: QuotaService, useValue: mockQuota },
      ],
    }).compile();

    service = module.get<OutreachDispatchService>(OutreachDispatchService);
  });

  describe('startCampaign', () => {
    it('should throw NotFoundException if campaign does not exist', async () => {
      await expect(service.startCampaign('unknown-camp')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if tenant does not own campaign', async () => {
      await expect(service.startCampaign('camp-300', 'wrong-tenant')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if tenant SMTP settings are missing', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValueOnce(null);
      await expect(service.startCampaign('camp-300')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if tenant SMTP settings are unverified', async () => {
      mockPrisma.tenantSmtpSetting.findUnique.mockResolvedValueOnce({
        tenantId: 'tenant-300',
        isVerified: false,
      });
      await expect(service.startCampaign('camp-300', 'tenant-300', { isTestMode: false })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if global outreach is emergency paused', async () => {
      mockPrisma.globalOutreachConfig.findFirst.mockResolvedValueOnce({ isEmergencyPaused: true });
      await expect(service.startCampaign('camp-300')).rejects.toThrow(BadRequestException);
    });

    it('should enqueue eligible leads with deterministic job IDs and update status to running', async () => {
      const res = await service.startCampaign('camp-300', 'tenant-300', { isTestMode: true });

      expect(res.success).toBe(true);
      expect(res.queuedCount).toBe(2);
      expect(res.status).toBe('running');

      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      // Verify deterministic job IDs (lowercase normalized)
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-outreach-email',
        expect.objectContaining({ email: 'lead1@example.com' }),
        expect.objectContaining({ jobId: 'outreach-camp-300-lead1@example.com' }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-outreach-email',
        expect.objectContaining({ email: 'LEAD2@example.com' }),
        expect.objectContaining({ jobId: 'outreach-camp-300-lead2@example.com' }),
      );

      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-300' },
          data: expect.objectContaining({ status: 'running' }),
        }),
      );
    });
  });

  describe('pauseCampaign', () => {
    it('should update campaign status to paused', async () => {
      const res = await service.pauseCampaign('camp-300', 'tenant-300');
      expect(res.success).toBe(true);
      expect(res.status).toBe('paused');
      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-300' },
          data: { status: 'paused' },
        }),
      );
    });
  });

  describe('getCampaignQueueStats', () => {
    it('should compute metrics correctly including bounce rate, open rate, and click rate', async () => {
      const stats = await service.getCampaignQueueStats('camp-300', 'tenant-300');

      expect(stats.sentCount).toBe(100);
      expect(stats.bouncedCount).toBe(4);
      // totalEvaluated = 100 + 4 = 104; bounceRate = (4 * 100) / 104 = 3.85%
      expect(stats.bounceRate).toBe(3.85);
      // openRate = (40 * 100) / 100 = 40.00%
      expect(stats.openRate).toBe(40);
      // clickRate = (10 * 100) / 40 = 25.00%
      expect(stats.clickRate).toBe(25);
      expect(stats.pendingCount).toBe(2);
    });
  });
});

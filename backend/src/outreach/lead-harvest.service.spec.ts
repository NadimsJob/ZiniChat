import { Test, TestingModule } from '@nestjs/testing';
import { LeadHarvestService } from './lead-harvest.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { WaterfallEnricherService } from './waterfall-enricher.service';
import { QuotaService } from '../tenants/quota.service';
import { NotFoundException } from '@nestjs/common';

describe('LeadHarvestService', () => {
  let service: LeadHarvestService;
  let mockPrisma: any;
  let mockCrypto: any;
  let mockEnricher: any;
  let mockQuota: any;

  beforeEach(async () => {
    mockQuota = {
      checkActiveSubscription: jest.fn().mockResolvedValue(true),
      isTenantSubscriptionActive: jest.fn().mockResolvedValue({ isActive: true }),
      checkAiQuota: jest.fn().mockResolvedValue(undefined),
    };
    mockPrisma = {
      emailCampaign: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      globalOutreachConfig: {
        findFirst: jest.fn(),
      },
      kanbanStage: {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage-cold-lead', name: 'Cold Lead' }),
      },
      outreachSuppression: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      campaignLead: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: `lead-${Date.now()}`, ...args.data })),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      contact: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: `contact-${Date.now()}`, ...args.data })),
      },
      contactNote: {
        create: jest.fn().mockResolvedValue({ id: 'note-1' }),
      },
    };

    mockCrypto = {
      decrypt: jest.fn((val) => val.replace('enc.', '')),
    };

    mockEnricher = {
      enrichLeadCandidate: jest.fn().mockResolvedValue({ isValid: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadHarvestService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CryptoService, useValue: mockCrypto },
        { provide: WaterfallEnricherService, useValue: mockEnricher },
        { provide: QuotaService, useValue: mockQuota },
      ],
    }).compile();

    service = module.get<LeadHarvestService>(LeadHarvestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildDorkingQuery', () => {
    it('should generate Google Dorking queries for Facebook', () => {
      const q = service.buildDorkingQuery('handmade crafts', 'facebook', 'Bangladesh');
      expect(q).toContain('site:facebook.com');
      expect(q).toContain('"handmade crafts"');
      expect(q).toContain('"Bangladesh"');
      expect(q).toContain('@gmail.com');
    });

    it('should generate Google Dorking queries for Instagram', () => {
      const q = service.buildDorkingQuery('honey', 'instagram', 'Bangladesh');
      expect(q).toContain('site:instagram.com');
      expect(q).toContain('"honey"');
    });

    it('should generate Google Dorking queries for LinkedIn', () => {
      const q = service.buildDorkingQuery('software', 'linkedin', 'Bangladesh');
      expect(q).toContain('site:linkedin.com/company');
      expect(q).toContain('"software"');
    });
  });

  describe('harvestLeadsForCampaign', () => {
    it('should throw NotFoundException if campaign does not exist', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue(null);
      await expect(service.harvestLeadsForCampaign('campaign-xyz')).rejects.toThrow(NotFoundException);
    });

    it('should harvest leads, deduplicate, and sync valid email leads & phoneOnly leads to CRM', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        tenantId: 'tenant-100',
        targetKeywords: ['pottery'],
        channels: ['facebook'],
        targetCountry: 'Bangladesh',
        totalLimit: 5,
      });

      mockPrisma.globalOutreachConfig.findFirst.mockResolvedValue({
        serpApiKeyEncrypted: 'enc.serp_live_key',
      });

      // Mock enricher returns 1 email lead and 1 phone-only lead
      mockEnricher.enrichLeadCandidate
        .mockResolvedValueOnce({
          isValid: true,
          businessName: 'Pottery World BD',
          sourceChannel: 'facebook',
          sourcePageUrl: 'https://facebook.com/potteryworld',
          sourceWebsiteUrl: 'https://potteryworld.com',
          email: 'sales@potteryworld.com',
          phone: '01711223344',
          phoneOnly: false,
          notes: 'Discovered via facebook',
        })
        .mockResolvedValueOnce({
          isValid: true,
          businessName: 'Dhaka Clay Studio',
          sourceChannel: 'facebook',
          sourcePageUrl: 'https://facebook.com/dhakaclay',
          sourceWebsiteUrl: null,
          email: null,
          phone: '01899887766',
          phoneOnly: true,
          notes: 'Phone only lead',
        })
        .mockResolvedValue({
          isValid: false,
        });

      const res = await service.harvestLeadsForCampaign('campaign-1', { isTestMode: true, maxHarvestLimit: 2 });

      expect(res.success).toBe(true);
      expect(res.emailLeadsCount).toBe(1);
      expect(res.phoneOnlyCount).toBe(1);
      expect(res.totalCollected).toBe(2);

      // Verify CampaignLead persistence
      expect(mockPrisma.campaignLead.create).toHaveBeenCalledTimes(2);

      // Verify CRM Contact persistence
      expect(mockPrisma.contact.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.contactNote.create).toHaveBeenCalledTimes(2);

      // Verify campaign status updated back to draft
      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'campaign-1' },
          data: expect.objectContaining({
            status: 'draft',
          }),
        }),
      );
    });

    it('should skip email if on suppression blacklist', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        tenantId: 'tenant-100',
        targetKeywords: ['pottery'],
        channels: ['facebook'],
        totalLimit: 5,
      });

      mockPrisma.outreachSuppression.findFirst.mockResolvedValue({
        id: 'suppression-1',
        email: 'blocked@competitor.com',
      });

      mockEnricher.enrichLeadCandidate.mockResolvedValueOnce({
        isValid: true,
        businessName: 'Blocked Competitor',
        sourceChannel: 'facebook',
        sourcePageUrl: 'https://facebook.com/blocked',
        email: 'blocked@competitor.com',
        phone: '01700000000',
        phoneOnly: false,
      });

      const res = await service.harvestLeadsForCampaign('campaign-1', { isTestMode: true, maxHarvestLimit: 1 });
      expect(res.emailLeadsCount).toBe(0);
      expect(mockPrisma.campaignLead.create).not.toHaveBeenCalled();
    });

    it('should skip email if contacted within 30-day cooldown window', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        tenantId: 'tenant-100',
        targetKeywords: ['pottery'],
        channels: ['facebook'],
        totalLimit: 5,
      });

      // Mock recent campaign lead within 30 days
      mockPrisma.campaignLead.findFirst.mockResolvedValue({
        id: 'recent-lead-1',
        email: 'recentlycontacted@domain.com',
      });

      mockEnricher.enrichLeadCandidate.mockResolvedValueOnce({
        isValid: true,
        businessName: 'Recent Prospect',
        sourceChannel: 'facebook',
        sourcePageUrl: 'https://facebook.com/recent',
        email: 'recentlycontacted@domain.com',
        phone: '01711111111',
        phoneOnly: false,
      });

      const res = await service.harvestLeadsForCampaign('campaign-1', { isTestMode: true, maxHarvestLimit: 1 });
      expect(res.emailLeadsCount).toBe(0);
      expect(mockPrisma.campaignLead.create).not.toHaveBeenCalled();
    });
  });
});

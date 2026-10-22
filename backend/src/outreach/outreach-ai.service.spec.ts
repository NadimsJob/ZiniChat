import { Test, TestingModule } from '@nestjs/testing';
import { OutreachAiService } from './outreach-ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('OutreachAiService (Phase 5: Vision, Tone, Multi-Language & Prompt Caching)', () => {
  let service: OutreachAiService;
  let mockPrisma: any;
  let mockQuota: any;

  const mockCampaign = {
    id: 'camp-123',
    tenantId: 'tenant-abc',
    name: 'Winter Sale 2026',
    bannerImageUrl: 'https://example.com/banner.jpg',
    bannerClickUrl: 'https://myshop.com/offer',
    bannerSummary: null,
    geminiCacheId: null,
    language: 'bn',
    tone: 'consultative',
    targetCountry: 'Bangladesh',
    targetCity: 'Dhaka',
    targetKeywords: ['craft', 'leather', 'handicraft'],
    status: 'draft',
    tenant: {
      id: 'tenant-abc',
      name: 'Artisan Crafts BD',
    },
  };

  const mockLead = {
    id: 'lead-456',
    campaignId: 'camp-123',
    tenantId: 'tenant-abc',
    trackingToken: 'token-uuid-789',
    businessName: 'Dhaka Leather Works',
    sourceChannel: 'facebook',
    sourcePageUrl: 'https://facebook.com/dhakaleather',
    sourceWebsiteUrl: 'https://dhakaleather.com',
    email: 'info@dhakaleather.com',
    phone: '+8801711223344',
    phoneOnly: false,
    status: 'pending',
    personalizedSubject: null,
    personalizedBodyHtml: null,
  };

  const mockConfig = {
    id: 'config-global',
    visionAiProvider: 'gemini',
    visionAiModel: 'gemini-1.5-flash',
    draftAiProvider: 'gemini',
    draftAiModel: 'gemini-1.5-flash',
    masterVisionPrompt: 'Analyze this promotional banner and return structured JSON',
    masterDraftPrompt: 'You are a consultative B2B outreach copywriter for {{brandName}}.',
    visionCreditCost: 5,
    draftCreditCost: 1,
  };

  beforeEach(async () => {
    mockPrisma = {
      emailCampaign: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockCampaign.id) {
            return Promise.resolve({ ...mockCampaign });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...mockCampaign, ...args.data })),
      },
      campaignLead: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockLead.id) {
            return Promise.resolve({ ...mockLead });
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockResolvedValue([{ ...mockLead }]),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...mockLead, ...args.data })),
      },
      globalOutreachConfig: {
        findFirst: jest.fn().mockResolvedValue({ ...mockConfig }),
      },
    };

    mockQuota = {
      checkAiQuota: jest.fn().mockResolvedValue(undefined),
      checkActiveSubscription: jest.fn().mockResolvedValue(true),
      isTenantSubscriptionActive: jest.fn().mockResolvedValue({ isActive: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutreachAiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QuotaService, useValue: mockQuota },
      ],
    }).compile();

    service = module.get<OutreachAiService>(OutreachAiService);
  });

  describe('1. Vision Banner Analysis (REQ-31, REQ-32)', () => {
    it('should throw NotFoundException if campaign is not found', async () => {
      await expect(service.analyzeBannerImage('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if tenant does not own campaign', async () => {
      await expect(service.analyzeBannerImage('camp-123', {}, 'different-tenant')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should check AI quota before banner analysis', async () => {
      await service.analyzeBannerImage('camp-123', { isTestMode: false });
      expect(mockQuota.checkAiQuota).toHaveBeenCalledWith('tenant-abc');
    });

    it('should extract structured JSON analysis and persist to campaign.bannerSummary', async () => {
      const result = await service.analyzeBannerImage('camp-123', { isTestMode: true });

      expect(result).toHaveProperty('productCategory');
      expect(result).toHaveProperty('keyOffers');
      expect(result).toHaveProperty('pricingAndDiscounts');
      expect(result).toHaveProperty('targetAudiencePainPoint');

      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-123' },
          data: expect.objectContaining({
            bannerSummary: expect.stringContaining('productCategory'),
          }),
        }),
      );
    });
  });

  describe('2. Prompt Compilation & Gemini 32k Minimum Threshold Fallback (BRD 4.2 Point 1)', () => {
    it('should assemble static context containing system prompt, brand name, tone, and language', async () => {
      const compiled = await service.compileCampaignContext('camp-123', { isTestMode: true });

      expect(compiled.fullStaticContext).toContain('Artisan Crafts BD');
      expect(compiled.fullStaticContext).toContain('ভাষা নির্দেশিকা (বাংলা)');
      expect(compiled.fullStaticContext).toContain('Tone (Consultative)');
      expect(compiled.fullStaticContext).toContain(mockCampaign.bannerClickUrl);
    });

    it('should use Direct Fast Prompt Injection when tokens < 32,768 (single campaign banner)', async () => {
      const compiled = await service.compileCampaignContext('camp-123', { isTestMode: true });

      expect(compiled.estimatedTokens).toBeLessThan(service.MIN_CACHE_TOKENS);
      expect(compiled.useDirectInjection).toBe(true);
      expect(compiled.isCached).toBe(false);
      expect(compiled.geminiCacheId).toBeNull();
    });

    it('should switch to native Context Caching when tokens >= 32,768 and save geminiCacheId', async () => {
      // Create campaign with a large knowledge base / catalog injected
      const largeCatalogText = 'A'.repeat(140000); // ~35,000 tokens
      mockPrisma.emailCampaign.findUnique.mockResolvedValueOnce({
        ...mockCampaign,
        bannerSummary: largeCatalogText,
      });

      const compiled = await service.compileCampaignContext('camp-123', { isTestMode: true });

      expect(compiled.estimatedTokens).toBeGreaterThanOrEqual(service.MIN_CACHE_TOKENS);
      expect(compiled.useDirectInjection).toBe(false);
      expect(compiled.isCached).toBe(true);
      expect(compiled.geminiCacheId).toBeDefined();
      expect(mockPrisma.emailCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-123' },
          data: expect.objectContaining({
            geminiCacheId: expect.stringContaining('cachedContents/zini-camp-123'),
          }),
        }),
      );
    });
  });

  describe('3. Multi-Language & Tone Adaptation (Rule 5)', () => {
    it('should generate Bangla consultative draft by default', async () => {
      const draft = await service.generatePersonalizedEmail('camp-123', 'lead-456', { isTestMode: true });

      expect(draft.businessName).toBe('Dhaka Leather Works');
      expect(draft.subject).toContain('Dhaka Leather Works');
      expect(draft.htmlBody).toContain('আসসালামু আলাইকুম Dhaka Leather Works টিম');
      expect(draft.htmlBody).toContain('Artisan Crafts BD');
      expect(draft.usedDirectInjection).toBe(true);
    });

    it('should generate English friendly copy when language is "en" and tone is "friendly"', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValueOnce({
        ...mockCampaign,
        language: 'en',
        tone: 'friendly',
      });

      const draft = await service.generatePersonalizedEmail('camp-123', 'lead-456', { isTestMode: true });

      expect(draft.subject).toBe('Quick idea for Dhaka Leather Works!');
      expect(draft.htmlBody).toContain('Hi Dhaka Leather Works Team');
      expect(draft.htmlBody).toContain('Explore Free Trial');
    });

    it('should generate English urgent copy when language is "en" and tone is "urgent"', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValueOnce({
        ...mockCampaign,
        language: 'en',
        tone: 'urgent',
      });

      const draft = await service.generatePersonalizedEmail('camp-123', 'lead-456', { isTestMode: true });

      expect(draft.subject).toBe('Are you missing night-time leads at Dhaka Leather Works?');
    });

    it('should generate Banglish conversational copy when language is "banglish"', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValueOnce({
        ...mockCampaign,
        language: 'banglish',
        tone: 'consultative',
      });

      const draft = await service.generatePersonalizedEmail('camp-123', 'lead-456', { isTestMode: true });

      expect(draft.subject).toContain('Dhaka Leather Works er customer response time');
      expect(draft.htmlBody).toContain('Apnader page er regular updates dekhe besh bhalo laglo');
      expect(draft.htmlBody).toContain('3 Days Free Trial Dekhun');
    });

    it('should generate Problem-Agitate-Solve (PAS) copy in Bangla', async () => {
      mockPrisma.emailCampaign.findUnique.mockResolvedValueOnce({
        ...mockCampaign,
        language: 'bn',
        tone: 'pas',
      });

      const draft = await service.generatePersonalizedEmail('camp-123', 'lead-456', { isTestMode: true });

      expect(draft.subject).toContain('বিজ্ঞাপন চালানোর পরও কাস্টমার হারানো বন্ধ করার উপায়');
      expect(draft.htmlBody).toContain('সমস্যা:');
      expect(draft.htmlBody).toContain('সমাধান:');
    });
  });

  describe('4. Dynamic Base URL, Tracking Pixel & Unsubscribe Injection (BRD 4.2 Point 2)', () => {
    it('should dynamically inject tracking click, open pixel, and unsubscribe URLs without hardcoded domains', async () => {
      process.env.APP_URL = 'https://custom-domain.zinichat.com';

      const draft = await service.generatePersonalizedEmail('camp-123', 'lead-456', { isTestMode: true });

      expect(draft.clickUrl).toBe('https://custom-domain.zinichat.com/api/outreach/click?token=token-uuid-789');
      expect(draft.openPixelUrl).toBe('https://custom-domain.zinichat.com/api/outreach/open?token=token-uuid-789');
      expect(draft.unsubscribeUrl).toBe('https://custom-domain.zinichat.com/api/outreach/unsubscribe?token=token-uuid-789');

      // Verify embedded elements in HTML
      expect(draft.htmlBody).toContain('<img src="https://custom-domain.zinichat.com/api/outreach/open?token=token-uuid-789" width="1" height="1" alt="" style="display:none;" />');
      expect(draft.htmlBody).toContain('href="https://custom-domain.zinichat.com/api/outreach/click?token=token-uuid-789"');
      expect(draft.htmlBody).toContain('href="https://custom-domain.zinichat.com/api/outreach/unsubscribe?token=token-uuid-789"');

      delete process.env.APP_URL;
    });

    it('should persist personalized subject and body to database for non-preview generation', async () => {
      await service.generatePersonalizedEmail('camp-123', 'lead-456', { isPreview: false, isTestMode: true });

      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-456' },
          data: expect.objectContaining({
            personalizedSubject: expect.any(String),
            personalizedBodyHtml: expect.any(String),
          }),
        }),
      );
    });

    it('should not mutate database lead when isPreview is true', async () => {
      mockPrisma.campaignLead.update.mockClear();

      await service.generatePersonalizedEmail('camp-123', 'lead-456', { isPreview: true, isTestMode: true });

      expect(mockPrisma.campaignLead.update).not.toHaveBeenCalled();
    });
  });

  describe('5. Batch Drafting & Live Preview Endpoints', () => {
    it('should generate drafts for multiple pending leads in campaign', async () => {
      const res = await service.generateDraftsForCampaign('camp-123', { limit: 10, isTestMode: true });

      expect(res.count).toBe(1);
      expect(res.drafts).toHaveLength(1);
      expect(res.drafts[0].businessName).toBe('Dhaka Leather Works');
    });

    it('should generate an in-memory preview draft without requiring pre-existing leads', async () => {
      const preview = await service.previewDraft('camp-123', {
        businessName: 'Novelty Craft Shop',
        isTestMode: true,
      });

      expect(preview.businessName).toBe('Novelty Craft Shop');
      expect(preview.trackingToken).toContain('preview-');
      expect(preview.htmlBody).toContain('Novelty Craft Shop');
    });
  });

  describe('6. HTML Sanitization Engine', () => {
    it('should strip dangerous script tags and event handlers while preserving tracking pixel and links', () => {
      const maliciousHtml = `
        <div>
          <script>alert('pwned')</script>
          <p onclick="stealCookies()">Safe content</p>
          <iframe src="https://evil.com"></iframe>
          <a href="javascript:void(0)">Bad Link</a>
          <a href="https://myshop.com/offer">Good Link</a>
          <img src="https://zinichat.com/api/outreach/open?token=abc" width="1" height="1" alt="" style="display:none;" />
        </div>
      `;

      const sanitized = service.sanitizeHtml(maliciousHtml);

      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('javascript:void(0)');
      expect(sanitized).toContain('Safe content');
      expect(sanitized).toContain('href="https://myshop.com/offer"');
      expect(sanitized).toContain('<img src="https://zinichat.com/api/outreach/open?token=abc" width="1" height="1" alt="" style="display:none;" />');
    });
  });
});

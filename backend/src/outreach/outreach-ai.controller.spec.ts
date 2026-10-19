import { Test, TestingModule } from '@nestjs/testing';
import { OutreachAiController } from './outreach-ai.controller';
import { OutreachAiService } from './outreach-ai.service';

describe('OutreachAiController', () => {
  let controller: OutreachAiController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      analyzeBannerImage: jest.fn().mockResolvedValue({
        productCategory: 'E-commerce AI',
        keyOffers: '24/7 Auto Replies',
        pricingAndDiscounts: 'Free Trial',
        targetAudiencePainPoint: 'Delayed replies',
      }),
      compileCampaignContext: jest.fn().mockResolvedValue({
        campaignId: 'camp-123',
        useDirectInjection: true,
        isCached: false,
      }),
      previewDraft: jest.fn().mockResolvedValue({
        businessName: 'Novelty Shop',
        subject: 'Growth Inquiry',
        htmlBody: '<p>Preview</p>',
      }),
      generateDraftsForCampaign: jest.fn().mockResolvedValue({
        count: 5,
        drafts: [],
      }),
      generatePersonalizedEmail: jest.fn().mockResolvedValue({
        leadId: 'lead-1',
        businessName: 'Test Corp',
        subject: 'Hello',
        htmlBody: '<p>Body</p>',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutreachAiController],
      providers: [
        { provide: OutreachAiService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<OutreachAiController>(OutreachAiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate analyzeBanner to service', async () => {
    const req = { user: { tenantId: 'tenant-123' } };
    const res = await controller.analyzeBanner(req, 'camp-1', { isTestMode: true });

    expect(mockService.analyzeBannerImage).toHaveBeenCalledWith('camp-1', { isTestMode: true }, 'tenant-123');
    expect(res).toHaveProperty('productCategory');
  });

  it('should delegate getCampaignContext to service', async () => {
    const res = await controller.getCampaignContext('camp-1', { isTestMode: true });

    expect(mockService.compileCampaignContext).toHaveBeenCalledWith('camp-1', { isTestMode: true });
    expect(res).toHaveProperty('useDirectInjection', true);
  });

  it('should delegate previewDraft to service', async () => {
    const req = { user: { tenantId: 'tenant-123' } };
    const res = await controller.previewDraft(req, 'camp-1', { businessName: 'Novelty Shop' });

    expect(mockService.previewDraft).toHaveBeenCalledWith(
      'camp-1',
      { businessName: 'Novelty Shop' },
      'tenant-123',
    );
    expect(res).toHaveProperty('businessName', 'Novelty Shop');
  });

  it('should delegate generateDrafts to service', async () => {
    const req = { user: { tenantId: 'tenant-123' } };
    const res = await controller.generateDrafts(req, 'camp-1', { limit: 5 });

    expect(mockService.generateDraftsForCampaign).toHaveBeenCalledWith(
      'camp-1',
      { limit: 5 },
      'tenant-123',
    );
    expect(res).toHaveProperty('count', 5);
  });

  it('should delegate generateDraftForLead to service', async () => {
    const res = await controller.generateDraftForLead('camp-1', 'lead-1', { isPreview: false });

    expect(mockService.generatePersonalizedEmail).toHaveBeenCalledWith(
      'camp-1',
      'lead-1',
      { isPreview: false },
    );
    expect(res).toHaveProperty('leadId', 'lead-1');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { LeadHarvestController } from './lead-harvest.controller';
import { LeadHarvestService } from './lead-harvest.service';

describe('LeadHarvestController', () => {
  let controller: LeadHarvestController;
  let service: jest.Mocked<Partial<LeadHarvestService>>;

  beforeEach(async () => {
    service = {
      harvestLeadsForCampaign: jest.fn().mockResolvedValue({
        success: true,
        campaignId: 'camp-123',
        totalCollected: 10,
        emailLeadsCount: 8,
        phoneOnlyCount: 2,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadHarvestController],
      providers: [
        {
          provide: LeadHarvestService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<LeadHarvestController>(LeadHarvestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should trigger harvest for campaign', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    const dto = { maxHarvestLimit: 50, isTestMode: true };
    const res = await controller.triggerHarvest(req, 'camp-123', dto);

    expect(res.success).toBe(true);
    expect(service.harvestLeadsForCampaign).toHaveBeenCalledWith('camp-123', {
      maxHarvestLimit: 50,
      isTestMode: true,
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AdsAgentProcessor } from './ads-agent.processor';
import { PrismaService } from '../prisma/prisma.service';
import { AdsAgentService } from './ads-agent.service';

describe('AdsAgentProcessor', () => {
  let processor: AdsAgentProcessor;
  let prismaService: any;
  let adsAgentService: any;

  beforeEach(async () => {
    prismaService = {
      adCampaignDraft: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    adsAgentService = {
      executeCampaignAutoScaling: jest.fn(),
      purgeOldDataLogs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsAgentProcessor,
        { provide: PrismaService, useValue: prismaService },
        { provide: AdsAgentService, useValue: adsAgentService },
      ],
    }).compile();

    processor = module.get<AdsAgentProcessor>(AdsAgentProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleAutoScalingCron', () => {
    it('should query active auto-scaling campaigns and execute auto-scaling for each', async () => {
      prismaService.adCampaignDraft.findMany.mockResolvedValue([
        { id: 'draft-1', tenantId: 't1' },
        { id: 'draft-2', tenantId: 't2' },
      ]);
      adsAgentService.executeCampaignAutoScaling.mockResolvedValue(true);

      await processor.handleAutoScalingCron();

      expect(prismaService.adCampaignDraft.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', autoScalingEnabled: true },
        select: { id: true, tenantId: true },
      });
      expect(adsAgentService.executeCampaignAutoScaling).toHaveBeenCalledTimes(2);
      expect(adsAgentService.executeCampaignAutoScaling).toHaveBeenCalledWith('draft-1');
      expect(adsAgentService.executeCampaignAutoScaling).toHaveBeenCalledWith('draft-2');
    });
  });

  describe('handleDailyActionCounterReset', () => {
    it('should update autoScalingActionsToday to 0 at midnight', async () => {
      prismaService.adCampaignDraft.updateMany.mockResolvedValue({ count: 5 });

      await processor.handleDailyActionCounterReset();

      expect(prismaService.adCampaignDraft.updateMany).toHaveBeenCalledWith({
        where: { autoScalingActionsToday: { gt: 0 } },
        data: { autoScalingActionsToday: 0 },
      });
    });
  });

  describe('handleDataRetentionPurge', () => {
    it('should invoke purgeOldDataLogs', async () => {
      adsAgentService.purgeOldDataLogs.mockResolvedValue({ capiPurged: 10, draftsPurged: 5, tokensPurged: 20 });

      await processor.handleDataRetentionPurge();

      expect(adsAgentService.purgeOldDataLogs).toHaveBeenCalled();
    });
  });
});

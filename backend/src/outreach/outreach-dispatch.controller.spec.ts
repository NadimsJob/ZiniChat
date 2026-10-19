import { Test, TestingModule } from '@nestjs/testing';
import { OutreachDispatchController } from './outreach-dispatch.controller';
import { OutreachDispatchService } from './outreach-dispatch.service';

describe('OutreachDispatchController', () => {
  let controller: OutreachDispatchController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      startCampaign: jest.fn().mockResolvedValue({
        success: true,
        queuedCount: 15,
        status: 'running',
      }),
      pauseCampaign: jest.fn().mockResolvedValue({
        success: true,
        status: 'paused',
      }),
      resumeCampaign: jest.fn().mockResolvedValue({
        success: true,
        queuedCount: 10,
        status: 'running',
      }),
      getCampaignQueueStats: jest.fn().mockResolvedValue({
        id: 'camp-1',
        sentCount: 50,
        bouncedCount: 2,
        bounceRate: 3.85,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutreachDispatchController],
      providers: [
        { provide: OutreachDispatchService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<OutreachDispatchController>(OutreachDispatchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate startCampaign to service', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    const res = await controller.startCampaign(req, 'camp-1', { isTestMode: true });

    expect(mockService.startCampaign).toHaveBeenCalledWith('camp-1', 'tenant-1', { isTestMode: true });
    expect(res).toHaveProperty('queuedCount', 15);
  });

  it('should delegate pauseCampaign to service', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    const res = await controller.pauseCampaign(req, 'camp-1');

    expect(mockService.pauseCampaign).toHaveBeenCalledWith('camp-1', 'tenant-1');
    expect(res).toHaveProperty('status', 'paused');
  });

  it('should delegate resumeCampaign to service', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    const res = await controller.resumeCampaign(req, 'camp-1', { isTestMode: true });

    expect(mockService.resumeCampaign).toHaveBeenCalledWith('camp-1', 'tenant-1', { isTestMode: true });
    expect(res).toHaveProperty('status', 'running');
  });

  it('should delegate getCampaignStats to service', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    const res = await controller.getCampaignStats(req, 'camp-1');

    expect(mockService.getCampaignQueueStats).toHaveBeenCalledWith('camp-1', 'tenant-1');
    expect(res).toHaveProperty('bounceRate', 3.85);
  });
});

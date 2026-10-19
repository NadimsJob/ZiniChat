import { Test, TestingModule } from '@nestjs/testing';
import { OutreachCampaignController } from './outreach-campaign.controller';
import { OutreachCampaignService } from './outreach-campaign.service';

describe('OutreachCampaignController', () => {
  let controller: OutreachCampaignController;
  let service: OutreachCampaignService;

  const mockService = {
    getOverview: jest.fn().mockResolvedValue({ totalCampaigns: 5, activeCampaigns: 2 }),
    getCampaigns: jest.fn().mockResolvedValue({ campaigns: [], total: 0 }),
    createCampaign: jest.fn().mockResolvedValue({ id: 'c1', name: 'Test Campaign' }),
    getCampaignById: jest.fn().mockResolvedValue({ id: 'c1', name: 'Test Campaign' }),
    deleteCampaign: jest.fn().mockResolvedValue({ success: true }),
    getCampaignLeads: jest.fn().mockResolvedValue({ leads: [], total: 0 }),
    retargetClickedNoOrderLeads: jest.fn().mockResolvedValue({ retargetedCount: 10 }),
    exportLeadsCsv: jest.fn().mockResolvedValue('Business Name,Channel\r\n"Shop","FB"'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutreachCampaignController],
      providers: [{ provide: OutreachCampaignService, useValue: mockService }],
    }).compile();

    controller = module.get<OutreachCampaignController>(OutreachCampaignController);
    service = module.get<OutreachCampaignService>(OutreachCampaignService);
  });

  it('should get overview', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    const res = await controller.getOverview(req);
    expect(res.totalCampaigns).toBe(5);
    expect(mockService.getOverview).toHaveBeenCalledWith('tenant-1');
  });

  it('should list campaigns', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    await controller.getCampaigns(req, '1', '10', 'sale');
    expect(mockService.getCampaigns).toHaveBeenCalledWith('tenant-1', {
      page: 1,
      limit: 10,
      search: 'sale',
    });
  });

  it('should create campaign', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    const dto = {
      name: 'Festive Blast',
      bannerImageUrl: 'https://cdn.com/banner.jpg',
      bannerClickUrl: 'https://mybrand.com',
      targetKeywords: ['eid'],
      channels: ['facebook'],
    };
    await controller.createCampaign(req, dto);
    expect(mockService.createCampaign).toHaveBeenCalledWith('tenant-1', dto);
  });

  it('should get campaign by ID', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    await controller.getCampaignById(req, 'c1');
    expect(mockService.getCampaignById).toHaveBeenCalledWith('c1', 'tenant-1');
  });

  it('should delete campaign', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    await controller.deleteCampaign(req, 'c1');
    expect(mockService.deleteCampaign).toHaveBeenCalledWith('c1', 'tenant-1');
  });

  it('should get campaign leads with clicked_no_order filter', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    await controller.getCampaignLeads(req, 'c1', 'clicked_no_order', 'craft', '2', '20');
    expect(mockService.getCampaignLeads).toHaveBeenCalledWith('c1', 'tenant-1', {
      filter: 'clicked_no_order',
      search: 'craft',
      page: 2,
      limit: 20,
    });
  });

  it('should retarget broadcast for clicked no order leads', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    await controller.retargetBroadcast(req, 'c1');
    expect(mockService.retargetClickedNoOrderLeads).toHaveBeenCalledWith('c1', 'tenant-1');
  });

  it('should export leads as CSV', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    const mockRes = {
      setHeader: jest.fn(),
      send: jest.fn().mockImplementation((val) => val),
    };
    await controller.exportLeads(req, 'c1', 'clicked_no_order', mockRes);
    expect(mockService.exportLeadsCsv).toHaveBeenCalledWith('c1', 'tenant-1', 'clicked_no_order');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(mockRes.send).toHaveBeenCalledWith('Business Name,Channel\r\n"Shop","FB"');
  });
});

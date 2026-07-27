import { Test, TestingModule } from '@nestjs/testing';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

describe('LeadsController', () => {
  let controller: LeadsController;
  let service: LeadsService;

  const mockLeadsService = {
    getStages: jest.fn(),
    createStage: jest.fn(),
    updateStage: jest.fn(),
    deleteStage: jest.fn(),
    getLeads: jest.fn(),
    getTeamMembers: jest.fn(),
    createLead: jest.fn(),
    updateLead: jest.fn(),
    addNote: jest.fn(),
    deleteContact: jest.fn(),
    exportLeadsToExcel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        { provide: LeadsService, useValue: mockLeadsService },
      ],
    }).compile();

    controller = module.get<LeadsController>(LeadsController);
    service = module.get<LeadsService>(LeadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return stages', async () => {
    const req = { user: { tenantId: 'tenant1' } };
    mockLeadsService.getStages.mockResolvedValue([{ id: '1' }]);
    
    const result = await controller.getStages(req);
    expect(result).toEqual([{ id: '1' }]);
    expect(mockLeadsService.getStages).toHaveBeenCalledWith('tenant1');
  });

  it('should export leads', async () => {
    const req = { user: { tenantId: 'tenant1' } };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as any;
    
    const mockBuffer = Buffer.from('excel data');
    mockLeadsService.exportLeadsToExcel.mockResolvedValue(mockBuffer);
    
    await controller.exportLeads(req, res);
    
    expect(mockLeadsService.exportLeadsToExcel).toHaveBeenCalledWith('tenant1');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=leads.xlsx');
    expect(res.send).toHaveBeenCalledWith(mockBuffer);
  });
});

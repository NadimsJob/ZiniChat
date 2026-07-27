import { Test, TestingModule } from '@nestjs/testing';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';

describe('LabelsController', () => {
  let controller: LabelsController;
  let service: LabelsService;

  const mockLabelsService = {
    syncToAi: jest.fn(),
    getLabels: jest.fn(),
    createLabel: jest.fn(),
    updateLabel: jest.fn(),
    deleteLabel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LabelsController],
      providers: [
        { provide: LabelsService, useValue: mockLabelsService },
      ],
    }).compile();

    controller = module.get<LabelsController>(LabelsController);
    service = module.get<LabelsService>(LabelsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should sync to AI', async () => {
    const req = { user: { tenantId: 'tenant1' } };
    mockLabelsService.syncToAi.mockResolvedValue({ success: true });
    
    const result = await controller.syncToAi(req, 'label-1');
    expect(result).toEqual({ success: true });
    expect(mockLabelsService.syncToAi).toHaveBeenCalledWith('tenant1', 'label-1');
  });
});

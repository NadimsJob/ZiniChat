import { Test, TestingModule } from '@nestjs/testing';
import { AiTrainingController } from './ai-training.controller';
import { AiTrainingService } from './ai-training.service';

describe('AiTrainingController', () => {
  let controller: AiTrainingController;
  let service: any;

  const mockAiTrainingService = {
    getConfig: jest.fn(),
    updateSystemPrompt: jest.fn(),
    generateSamplePrompt: jest.fn(),
    getTools: jest.fn(),
    updateTool: jest.fn(),
    updateByokConfig: jest.fn(),
    getQnaList: jest.fn(),
    createCustomQna: jest.fn(),
    updateQna: jest.fn(),
    deleteQna: jest.fn(),
    getDocuments: jest.fn(),
    uploadDocument: jest.fn(),
    deleteDocument: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiTrainingController],
      providers: [
        { provide: AiTrainingService, useValue: mockAiTrainingService },
      ],
    }).compile();

    controller = module.get<AiTrainingController>(AiTrainingController);
    service = module.get<AiTrainingService>(AiTrainingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate updateSystemPrompt to service', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    const dto = { systemPrompt: 'Valid prompt content long enough' };
    mockAiTrainingService.updateSystemPrompt.mockResolvedValue({ success: true });

    const res = await controller.updateSystemPrompt(req, dto as any);
    expect(service.updateSystemPrompt).toHaveBeenCalledWith('tenant-1', dto.systemPrompt);
    expect(res).toEqual({ success: true });
  });

  it('should delegate createQna to service', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    const dto = { question: 'What is refund policy?', answer: 'We offer 30 day return.' };
    mockAiTrainingService.createCustomQna.mockResolvedValue({ id: 'qna-1' });

    const res = await controller.createQna(req, dto as any);
    expect(service.createCustomQna).toHaveBeenCalledWith('tenant-1', dto.question, dto.answer);
    expect(res).toEqual({ id: 'qna-1' });
  });
});

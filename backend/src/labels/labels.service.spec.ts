import { Test, TestingModule } from '@nestjs/testing';
import { LabelsService } from './labels.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('LabelsService', () => {
  let service: LabelsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    label: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    aiAssistant: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LabelsService>(LabelsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncToAi', () => {
    const tenantId = 'tenant-1';
    const labelId = 'label-1';
    
    it('should throw NotFoundException if label does not exist', async () => {
      mockPrismaService.label.findFirst.mockResolvedValue(null);
      await expect(service.syncToAi(tenantId, labelId)).rejects.toThrow(NotFoundException);
    });

    it('should return early if label has no aiPrompt', async () => {
      mockPrismaService.label.findFirst.mockResolvedValue({ id: labelId, name: 'VIP', aiPrompt: null });
      const result = await service.syncToAi(tenantId, labelId);
      expect(result).toEqual({ success: true, message: 'No AI prompt to sync' });
      expect(mockPrismaService.aiAssistant.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if aiAssistant does not exist', async () => {
      mockPrismaService.label.findFirst.mockResolvedValue({ id: labelId, name: 'VIP', aiPrompt: 'Help VIPs' });
      mockPrismaService.aiAssistant.findFirst.mockResolvedValue(null);
      
      await expect(service.syncToAi(tenantId, labelId)).rejects.toThrow(NotFoundException);
    });

    it('should append the aiPrompt to systemPrompt if the tag does not exist', async () => {
      mockPrismaService.label.findFirst.mockResolvedValue({ id: labelId, name: 'VIP', aiPrompt: 'Help VIPs' });
      mockPrismaService.aiAssistant.findFirst.mockResolvedValue({ id: 'assistant-1', systemPrompt: 'Base prompt' });
      mockPrismaService.aiAssistant.update.mockResolvedValue({});

      const result = await service.syncToAi(tenantId, labelId);
      
      expect(result).toEqual({ success: true, message: 'Synced to AI Training successfully' });
      expect(mockPrismaService.aiAssistant.update).toHaveBeenCalledWith({
        where: { id: 'assistant-1' },
        data: { systemPrompt: 'Base prompt\n\n<Label: VIP>\nHelp VIPs\n</Label: VIP>' }
      });
    });

    it('should replace the existing tag block if it already exists', async () => {
      mockPrismaService.label.findFirst.mockResolvedValue({ id: labelId, name: 'VIP', aiPrompt: 'Help VIPs faster' });
      const existingSystemPrompt = 'Base prompt\n\n<Label: VIP>\nOld instructions\n</Label: VIP>\nOther stuff';
      mockPrismaService.aiAssistant.findFirst.mockResolvedValue({ id: 'assistant-1', systemPrompt: existingSystemPrompt });
      mockPrismaService.aiAssistant.update.mockResolvedValue({});

      const result = await service.syncToAi(tenantId, labelId);
      
      expect(result).toEqual({ success: true, message: 'Synced to AI Training successfully' });
      // The old block should be replaced with the new one
      expect(mockPrismaService.aiAssistant.update).toHaveBeenCalledWith({
        where: { id: 'assistant-1' },
        data: { systemPrompt: 'Base prompt\n\n<Label: VIP>\nHelp VIPs faster\n</Label: VIP>\nOther stuff' }
      });
    });
  });
});

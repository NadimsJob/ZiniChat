import { Test, TestingModule } from '@nestjs/testing';
import { LabelsService } from './labels.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiCacheService } from '../ai/ai-cache.service';
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
        {
          provide: AiCacheService,
          useValue: { invalidateCache: jest.fn(), getOrCreateCache: jest.fn(), computeChecksum: jest.fn() },
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

    it('should return success and invalidate cache if label exists', async () => {
      mockPrismaService.label.findFirst.mockResolvedValue({ id: labelId, name: 'VIP', aiPrompt: 'Help VIPs' });
      const result = await service.syncToAi(tenantId, labelId);
      expect(result).toEqual({ success: true, message: 'Synced to AI Training successfully' });
    });
  });
});

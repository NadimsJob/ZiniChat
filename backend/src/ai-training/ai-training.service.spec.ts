import { Test, TestingModule } from '@nestjs/testing';
import { AiTrainingService } from './ai-training.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AiTrainingService', () => {
  let service: AiTrainingService;
  let prisma: any;

  const mockPrisma: any = {
    aiAssistant: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    aiAssistantTool: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    qnAKnowledgeBase: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    knowledgeDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    knowledgeChunk: {
      deleteMany: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiTrainingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AiTrainingService>(AiTrainingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConfig', () => {
    it('should return AI assistant config and BYOK plan permissions', async () => {
      const mockAssistant = {
        id: 'ast-1',
        tenantId: 'tenant-1',
        routingMode: 'system_only',
        systemPrompt: 'You are a helpful assistant.',
        byokApiKeyEncrypted: null,
        aiOrderEnabled: true,
        isActive: true,
        agentName: 'Zini',
      };
      mockPrisma.aiAssistant.findFirst.mockResolvedValue(mockAssistant);
      mockPrisma.aiAssistantTool.findMany.mockResolvedValue([]);
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customAllowByok: null,
        subscriptions: [{ plan: { name: 'Pro', allowByok: true, aiQuota: 1000 } }],
      });

      const result = await service.getConfig('tenant-1');
      expect(result).toMatchObject({
        routingMode: 'system_only',
        systemPrompt: 'You are a helpful assistant.',
        hasCustomKey: false,
        aiOrderEnabled: true,
        isActive: true,
        agentName: 'Zini',
        allowByok: true,
      });
    });
  });

  describe('getTools & updateTool', () => {
    it('should return tools array for tenant assistant', async () => {
      mockPrisma.aiAssistant.findFirst.mockResolvedValue({ id: 'ast-1', aiOrderEnabled: true });
      mockPrisma.aiAssistantTool.findMany.mockResolvedValue([
        { toolType: 'order_placement', isEnabled: true },
        { toolType: 'image_reading', isEnabled: true },
      ]);

      const tools = await service.getTools('tenant-1');
      expect(tools).toHaveLength(2);
      expect(tools[0].toolType).toBe('order_placement');
    });

    it('should update tool state', async () => {
      mockPrisma.aiAssistant.findFirst.mockResolvedValue({ id: 'ast-1', aiOrderEnabled: true });
      mockPrisma.aiAssistantTool.findMany.mockResolvedValue([]);
      mockPrisma.aiAssistantTool.findFirst.mockResolvedValue({ id: 'tool-1', toolType: 'support_detection', isEnabled: false });
      mockPrisma.aiAssistantTool.update.mockResolvedValue({ id: 'tool-1', toolType: 'support_detection', isEnabled: true });

      const updated = await service.updateTool('tenant-1', 'support_detection', true);
      expect(mockPrisma.aiAssistantTool.update).toHaveBeenCalledWith({
        where: { id: 'tool-1' },
        data: { isEnabled: true },
      });
      expect(updated.isEnabled).toBe(true);
    });
  });

  describe('updateSystemPrompt', () => {
    it('should update assistant system prompt', async () => {
      mockPrisma.aiAssistant.findFirst.mockResolvedValue({ id: 'ast-1' });
      mockPrisma.aiAssistantTool.findMany.mockResolvedValue([]);
      mockPrisma.aiAssistant.update.mockResolvedValue({ id: 'ast-1', systemPrompt: 'New prompt' });

      const result = await service.updateSystemPrompt('tenant-1', 'New prompt');
      expect(mockPrisma.aiAssistant.update).toHaveBeenCalledWith({
        where: { id: 'ast-1' },
        data: { systemPrompt: 'New prompt' },
      });
      expect(result.systemPrompt).toBe('New prompt');
    });
  });

  describe('createCustomQna', () => {
    it('should create QnA pair', async () => {
      const mockQna = { id: 'qna-1', question: 'What are hours?', answer: '9 to 5', isDefault: false };
      mockPrisma.qnAKnowledgeBase.create.mockResolvedValue(mockQna);

      const result = await service.createCustomQna('tenant-1', 'What are hours?', '9 to 5');
      expect(mockPrisma.qnAKnowledgeBase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          question: 'What are hours?',
          answer: '9 to 5',
          isDefault: false,
        }),
      });
      expect(result).toEqual(mockQna);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and associated vector embeddings', async () => {
      mockPrisma.knowledgeDocument.findFirst.mockResolvedValue({ id: 'doc-1', tenantId: 'tenant-1' });
      mockPrisma.knowledgeChunk.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.knowledgeDocument.delete.mockResolvedValue({ id: 'doc-1' });

      const result = await service.deleteDocument('tenant-1', 'doc-1');
      expect(mockPrisma.knowledgeChunk.deleteMany).toHaveBeenCalledWith({ where: { documentId: 'doc-1' } });
      expect(mockPrisma.knowledgeDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if document not found', async () => {
      mockPrisma.knowledgeDocument.findFirst.mockResolvedValue(null);
      await expect(service.deleteDocument('tenant-1', 'invalid-doc')).rejects.toThrow(NotFoundException);
    });
  });
});

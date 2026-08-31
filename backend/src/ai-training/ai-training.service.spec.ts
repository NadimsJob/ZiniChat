import { Test, TestingModule } from '@nestjs/testing';
import { AiTrainingService } from './ai-training.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { CryptoService } from '../crypto/crypto.service';
import { FileValidationService } from '../file-validation/file-validation.service';
import { ToolConfigValidatorService } from './services/tool-config-validator.service';

import { AiCacheService } from '../ai/ai-cache.service';
import { AiService } from '../ai/ai.service';
import { WebsiteCrawlerService } from './website-crawler.service';

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
      deleteMany: jest.fn(),
    },
    knowledgeDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
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
        CryptoService,
        FileValidationService,
        ToolConfigValidatorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QuotaService, useValue: { checkFeature: jest.fn().mockResolvedValue(true), checkAiQuota: jest.fn().mockResolvedValue(true), getActivePeriodForTenant: jest.fn().mockResolvedValue({ periodStart: new Date(), aiQuota: 100 }) } },
        { provide: AiCacheService, useValue: { invalidateCache: jest.fn(), getOrCreateCache: jest.fn(), computeChecksum: jest.fn() } },
        { provide: AiService, useValue: { generateCompletion: jest.fn().mockResolvedValue('Mock AI response') } },
        { provide: WebsiteCrawlerService, useValue: { crawlWebsite: jest.fn().mockResolvedValue({ combinedText: 'Mock content', pageCount: 1 }) } },
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

  describe('updateByokConfig encryption', () => {
    it('should encrypt BYOK API key before saving to database', async () => {
      mockPrisma.aiAssistant.findFirst.mockResolvedValue({ id: 'ast-1', tenantId: 'tenant-1' });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customAllowByok: true,
        subscriptions: [],
      });

      const plainKey = 'sk-proj-test1234567890';
      await service.updateByokConfig('tenant-1', 'custom_only', plainKey);

      expect(mockPrisma.aiAssistant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ast-1' },
          data: expect.objectContaining({
            routingMode: 'custom_only',
            byokApiKeyEncrypted: expect.stringMatching(/^.+\..+\..+$/), // dot-separated encrypted base64
          }),
        })
      );
    });
  });

  describe('generateSamplePrompt Guardrails', () => {
    it('should inject mandatory anti-hallucination guardrails into sample prompt', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        businessName: 'ZiniShop',
        labels: [],
      });

      const res = await service.generateSamplePrompt('tenant-1');
      expect(res.prompt).toContain('MANDATORY ANTI-HALLUCINATION GUARDRAILS');
      expect(res.prompt).toContain('ALWAYS use Q&A/Documents first as the source of truth');
      expect(res.prompt).toContain('NEVER invent products, features, or prices');
      expect(res.prompt).toContain('Never promise discounts or refunds without strict authorization');
      expect(res.prompt).toContain('If uncertain, explicitly state that you do not know and suggest human handoff');
    });
  });
});

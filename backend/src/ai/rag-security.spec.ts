import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { AiTrainingService } from '../ai-training/ai-training.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiCacheService } from './ai-cache.service';
import { QuotaService } from '../tenants/quota.service';
import { CryptoService } from '../crypto/crypto.service';
import { FileValidationService } from '../file-validation/file-validation.service';
import { ToolConfigValidatorService } from '../ai-training/services/tool-config-validator.service';
import { BadRequestException } from '@nestjs/common';

describe('RAG Vector Search Security - Strict Multi-Tenant Isolation', () => {
  let aiService: AiService;
  let aiTrainingService: AiTrainingService;
  let prismaService: PrismaService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';

  const mockDbChunks = [
    {
      id: 'chunk-a-1',
      documentId: 'doc-a-1',
      tenantId: tenantA,
      content: 'Tenant A confidential business policy',
      similarity: 0.95,
    },
    {
      id: 'chunk-a-2',
      documentId: 'doc-a-2',
      tenantId: tenantA,
      content: 'Tenant A product list',
      similarity: 0.88,
    },
    {
      id: 'chunk-b-1',
      documentId: 'doc-b-1',
      tenantId: tenantB,
      content: 'Tenant B secret financial figures',
      similarity: 0.99,
    },
  ];

  const mockPrisma = {
    $queryRaw: jest.fn(),
    aiConfig: {
      findFirst: jest.fn(),
    },
  };

  const mockAiCacheService = {
    invalidateCache: jest.fn(),
  };

  const mockQuotaService = {
    checkAiQuota: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        AiTrainingService,
        CryptoService,
        FileValidationService,
        ToolConfigValidatorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiCacheService, useValue: mockAiCacheService },
        { provide: QuotaService, useValue: mockQuotaService },
      ],
    }).compile();

    aiService = module.get<AiService>(AiService);
    aiTrainingService = module.get<AiTrainingService>(AiTrainingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should strictly return only Tenant A vector chunks and 0 chunks from Tenant B', async () => {
    mockPrisma.$queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: any[]) => {
      const requestedTenantId = values.find(v => typeof v === 'string' && (v === tenantA || v === tenantB));
      const filteredResults = mockDbChunks.filter(c => c.tenantId === requestedTenantId);
      return Promise.resolve(filteredResults);
    });

    const dummyVector = Array.from({ length: 1536 }, () => 0.1);

    const resultsA = await aiService.searchRelevantChunks(tenantA, dummyVector, 5);

    expect(resultsA.length).toBe(2);
    expect(resultsA.every(c => c.tenantId === tenantA)).toBe(true);
    expect(resultsA.some(c => c.tenantId === tenantB)).toBe(false);
  });

  it('should enforce tenant isolation in AiTrainingService searchRelevantChunks', async () => {
    mockPrisma.$queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: any[]) => {
      const requestedTenantId = values.find(v => typeof v === 'string' && (v === tenantA || v === tenantB));
      const filteredResults = mockDbChunks.filter(c => c.tenantId === requestedTenantId);
      return Promise.resolve(filteredResults);
    });

    const dummyVector = [0.1, 0.2, 0.3];

    const resultsB = await aiTrainingService.searchRelevantChunks(tenantB, dummyVector, 5);

    expect(resultsB.length).toBe(1);
    expect(resultsB[0].content).toContain('Tenant B secret financial figures');
    expect(resultsB.some(c => c.tenantId === tenantA)).toBe(false);
  });

  it('should throw BadRequestException if tenantId is missing or empty', async () => {
    const dummyVector = [0.1, 0.2];

    await expect(aiService.searchRelevantChunks('', dummyVector)).rejects.toThrow(BadRequestException);
    await expect(aiTrainingService.searchRelevantChunks('', dummyVector)).rejects.toThrow(BadRequestException);
  });
});

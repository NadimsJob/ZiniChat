import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiCacheService } from './ai-cache.service';
import { GeminiCacheAdapter } from './adapters/gemini-cache.adapter';
import { OpenAICacheAdapter } from './adapters/openai-cache.adapter';
import { AnthropicCacheAdapter } from './adapters/anthropic-cache.adapter';

describe('AiService & AiCacheService - Prompt Caching & Token Logging Audit', () => {
  let service: AiService;
  let cacheService: AiCacheService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const mockPrisma = {
    aiConfig: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    aiAssistant: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    aiUsageLog: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        AiCacheService,
        GeminiCacheAdapter,
        OpenAICacheAdapter,
        AnthropicCacheAdapter,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = moduleRef.get<AiService>(AiService);
    cacheService = moduleRef.get<AiCacheService>(AiCacheService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
  });

  it('should extract cachedContentTokenCount > 0 and calculate discounted costUsd on cache hit', async () => {
    const mockConfig = {
      id: 'cfg-gemini',
      provider: 'gemini',
      modelName: 'gemini-1.5-flash',
      apiKey: 'test-key',
      isActive: true,
    };

    mockPrisma.aiConfig.findUnique.mockResolvedValue(mockConfig);
    mockPrisma.aiConfig.findFirst.mockResolvedValue(mockConfig);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'Cached response' }] } }],
        usageMetadata: {
          promptTokenCount: 35000,
          cachedContentTokenCount: 34000,
          candidatesTokenCount: 1000,
          totalTokenCount: 36000,
        },
      }),
    } as any);

    const result = await service.generateCompletionDetailed('Hello from customer', 'cfg-gemini', undefined, 'cachedContents/xyz123');

    expect(result.text).toBe('Cached response');
    expect(result.usage.promptTokenCount).toBe(35000);
    expect(result.usage.cachedContentTokenCount).toBe(34000);
    expect(result.usage.candidatesTokenCount).toBe(1000);
    expect(result.usage.totalTokenCount).toBe(36000);
    expect(result.usage.cachedContentTokenCount).toBeGreaterThan(0);

    expect(result.usage.costUsd).toBeCloseTo(0.0010125, 5);
  });

  it('should record cachedTokens and costUsd in ai_usage_logs table', async () => {
    const mockUsage = {
      promptTokenCount: 35000,
      cachedContentTokenCount: 34000,
      candidatesTokenCount: 1000,
      totalTokenCount: 36000,
      costUsd: 0.0010125,
    };

    mockPrisma.aiUsageLog.create.mockResolvedValue({
      id: 'log-1',
      tenantId: 'tenant-1',
      assistantId: 'ast-1',
      tokensUsed: 36000,
      cachedTokens: 34000,
      costUsd: 0.0010125,
    });

    await service.recordUsageLog('tenant-1', 'ast-1', mockUsage);

    expect(mockPrisma.aiUsageLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        assistantId: 'ast-1',
        tokensUsed: 36000,
        cachedTokens: 34000,
        costUsd: 0.0010125,
      },
    });
  });

  it('should format cached content payload with systemPrompt and toolsConfig', async () => {
    const adapter = moduleRef.get<GeminiCacheAdapter>(GeminiCacheAdapter);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        name: 'cachedContents/test1234',
        expireTime: new Date(Date.now() + 86400000).toISOString(),
      }),
    } as any);

    const cacheResult = await adapter.createCache({
      tenantId: 'tenant-1',
      systemPrompt: 'System Prompt Content',
      knowledgeContext: 'Knowledge Base Content',
      toolsConfig: { order_placement: true },
      ttlSeconds: 86400,
      apiKey: 'test-api-key',
      modelName: 'gemini-1.5-flash',
    });

    expect(cacheResult.cacheKey).toBe('cachedContents/test1234');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('--- ASSISTANT TOOLS CONFIGURATION ---'),
      })
    );
  });
});

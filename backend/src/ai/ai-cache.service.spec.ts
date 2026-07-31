import { Test, TestingModule } from '@nestjs/testing';
import { AiCacheService } from './ai-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiCacheAdapter } from './adapters/gemini-cache.adapter';
import { OpenAICacheAdapter } from './adapters/openai-cache.adapter';
import { AnthropicCacheAdapter } from './adapters/anthropic-cache.adapter';

describe('AiCacheService', () => {
  let service: AiCacheService;
  let prismaService: any;
  let geminiAdapter: GeminiCacheAdapter;
  let openAiAdapter: OpenAICacheAdapter;
  let anthropicAdapter: AnthropicCacheAdapter;

  const mockPrismaService = {
    aiAssistant: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCacheService,
        { provide: PrismaService, useValue: mockPrismaService },
        GeminiCacheAdapter,
        OpenAICacheAdapter,
        AnthropicCacheAdapter,
      ],
    }).compile();

    service = module.get<AiCacheService>(AiCacheService);
    prismaService = module.get(PrismaService);
    geminiAdapter = module.get<GeminiCacheAdapter>(GeminiCacheAdapter);
    openAiAdapter = module.get<OpenAICacheAdapter>(OpenAICacheAdapter);
    anthropicAdapter = module.get<AnthropicCacheAdapter>(AnthropicCacheAdapter);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('computeChecksum', () => {
    it('should compute consistent SHA-256 hash for identical static context', () => {
      const sp = 'You are a support assistant.';
      const kd = [{ id: '1', content: 'Doc text' }];
      const qna = [{ question: 'Hours?', answer: '9am to 6pm' }];
      const labels = [{ name: 'VIP', aiPrompt: 'Treat nicely' }];

      const hash1 = service.computeChecksum(sp, kd, qna, labels);
      const hash2 = service.computeChecksum(sp, kd, qna, labels);

      expect(hash1).toEqual(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string length
    });

    it('should compute different SHA-256 hashes when static context changes', () => {
      const sp1 = 'Prompt V1';
      const sp2 = 'Prompt V2';

      const hash1 = service.computeChecksum(sp1, [], [], []);
      const hash2 = service.computeChecksum(sp2, [], [], []);

      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('getAdapter', () => {
    it('should return GeminiCacheAdapter for gemini provider', () => {
      const adapter = service.getAdapter('gemini');
      expect(adapter).toBeInstanceOf(GeminiCacheAdapter);
    });

    it('should return OpenAICacheAdapter for openai provider', () => {
      const adapter = service.getAdapter('openai');
      expect(adapter).toBeInstanceOf(OpenAICacheAdapter);
    });

    it('should return AnthropicCacheAdapter for anthropic provider', () => {
      const adapter = service.getAdapter('anthropic');
      expect(adapter).toBeInstanceOf(AnthropicCacheAdapter);
    });
  });

  describe('getOrCreateCache (Fallback Mechanism)', () => {
    it('should fallback gracefully without caching when token count is below provider threshold', async () => {
      mockPrismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'assistant-1',
        cacheKey: null,
      });

      const result = await service.getOrCreateCache({
        tenantId: 'tenant-123',
        provider: 'gemini',
        modelName: 'gemini-1.5-flash',
        systemPrompt: 'Short prompt',
        knowledgeContext: 'Short context',
        checksum: 'checksum123',
      });

      expect(result).toEqual({ cacheKey: null, isCached: false });
    });

    it('should return existing valid cache when checksum matches and cache is active', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      mockPrismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'assistant-1',
        cacheKey: 'cachedContents/valid123',
        cacheChecksum: 'validchecksum',
        cacheExpiresAt: futureDate,
      });

      const result = await service.getOrCreateCache({
        tenantId: 'tenant-123',
        provider: 'gemini',
        modelName: 'gemini-1.5-flash',
        systemPrompt: 'Test',
        knowledgeContext: 'Test',
        checksum: 'validchecksum',
      });

      expect(result).toEqual({ cacheKey: 'cachedContents/valid123', isCached: true });
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate active cache and clear DB fields', async () => {
      mockPrismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'assistant-1',
        provider: 'openai',
        cacheKey: 'openai_auto_cache_123',
      });
      mockPrismaService.aiAssistant.update.mockResolvedValue({});

      await service.invalidateCache('tenant-123');

      expect(mockPrismaService.aiAssistant.update).toHaveBeenCalledWith({
        where: { id: 'assistant-1' },
        data: {
          cacheKey: null,
          cacheExpiresAt: null,
          cacheChecksum: null,
        },
      });
    });
  });
});

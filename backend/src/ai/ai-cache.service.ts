import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiCacheAdapter } from './adapters/gemini-cache.adapter';
import { OpenAICacheAdapter } from './adapters/openai-cache.adapter';
import { AnthropicCacheAdapter } from './adapters/anthropic-cache.adapter';
import { IAiCacheProvider } from './interfaces/ai-cache-provider.interface';
import * as crypto from 'crypto';

@Injectable()
export class AiCacheService {
  private readonly logger = new Logger(AiCacheService.name);

  constructor(
    private prisma: PrismaService,
    private geminiAdapter: GeminiCacheAdapter,
    private openAiAdapter: OpenAICacheAdapter,
    private anthropicAdapter: AnthropicCacheAdapter
  ) {}

  getAdapter(provider: string): IAiCacheProvider {
    const p = (provider || 'gemini').toLowerCase();
    if (p === 'openai') return this.openAiAdapter;
    if (p === 'anthropic') return this.anthropicAdapter;
    return this.geminiAdapter;
  }

  computeChecksum(systemPrompt: string = '', knowledgeDocs: any[] = [], qnaPairs: any[] = [], labels: any[] = []): string {
    const serialized = JSON.stringify({
      sp: systemPrompt || '',
      kd: (knowledgeDocs || []).map(d => ({ id: d.id, content: d.content || d.title })),
      qna: (qnaPairs || []).map(q => ({ q: q.question, a: q.answer })),
      lbl: (labels || []).map(l => ({ name: l.name, prompt: l.aiPrompt }))
    });

    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  estimateTokenCount(text: string): number {
    if (!text) return 0;
    // Rough estimate: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  async getOrCreateCache(params: {
    tenantId: string;
    provider: string;
    modelName: string;
    apiKey?: string;
    systemPrompt: string;
    knowledgeContext: string;
    checksum: string;
    ttlSeconds?: number;
  }): Promise<{ cacheKey: string | null; isCached: boolean }> {
    const { tenantId, provider, modelName, apiKey, systemPrompt, knowledgeContext, checksum } = params;
    const ttlSeconds = params.ttlSeconds || 86400; // 24 hours default TTL

    try {
      const assistant = await this.prisma.aiAssistant.findFirst({
        where: { tenantId }
      });

      if (!assistant) {
        return { cacheKey: null, isCached: false };
      }

      const now = new Date();

      // Check if existing cache is valid
      if (
        assistant.cacheKey &&
        assistant.cacheChecksum === checksum &&
        assistant.cacheExpiresAt &&
        assistant.cacheExpiresAt > now
      ) {
        this.logger.debug(`Hit Active Prompt Cache for Tenant ${tenantId}: ${assistant.cacheKey}`);
        return { cacheKey: assistant.cacheKey, isCached: true };
      }

      // Check if token threshold is supported by provider
      const adapter = this.getAdapter(provider);
      const totalText = `${systemPrompt}\n${knowledgeContext}`;
      const estimatedTokens = this.estimateTokenCount(totalText);

      if (!adapter.supportsNativeCaching(modelName, estimatedTokens)) {
        this.logger.debug(`Prompt token count (${estimatedTokens}) below provider ${provider} caching threshold. Skipping native cache.`);
        return { cacheKey: null, isCached: false };
      }

      // Create new cache
      const cacheResult = await adapter.createCache({
        tenantId,
        systemPrompt,
        knowledgeContext,
        ttlSeconds,
        modelName,
        apiKey
      });

      // Update AiAssistant in DB
      await this.prisma.aiAssistant.update({
        where: { id: assistant.id },
        data: {
          provider: provider || 'gemini',
          cacheKey: cacheResult.cacheKey,
          cacheExpiresAt: cacheResult.expiresAt,
          cacheChecksum: checksum
        }
      });

      return { cacheKey: cacheResult.cacheKey, isCached: true };
    } catch (err: any) {
      this.logger.warn(`Failed to create or retrieve prompt cache for tenant ${tenantId}: ${err.message}. Falling back.`);
      return { cacheKey: null, isCached: false };
    }
  }

  async invalidateCache(tenantId: string): Promise<void> {
    try {
      const assistant = await this.prisma.aiAssistant.findFirst({
        where: { tenantId }
      });

      if (!assistant || !assistant.cacheKey) return;

      const adapter = this.getAdapter(assistant.provider || 'gemini');
      await adapter.deleteCache(assistant.cacheKey);

      await this.prisma.aiAssistant.update({
        where: { id: assistant.id },
        data: {
          cacheKey: null,
          cacheExpiresAt: null,
          cacheChecksum: null
        }
      });

      this.logger.log(`Invalidated AI Assistant prompt cache for tenant ${tenantId}`);
    } catch (err: any) {
      this.logger.error(`Error invalidating cache for tenant ${tenantId}: ${err.message}`);
    }
  }

  async getOrCreateSupportCache(params: {
    aiConfigId: string;
    provider: string;
    modelName: string;
    apiKey?: string;
    baseSystemPrompt: string;
    verticalName?: string;
    ttlSeconds?: number;
  }): Promise<{ cacheKey: string | null; isCached: boolean }> {
    const { aiConfigId, provider, modelName, apiKey, baseSystemPrompt, verticalName } = params;
    const ttlSeconds = params.ttlSeconds || 86400; // 24 hours default TTL
    const vertical = verticalName || 'retail';

    try {
      const config = await this.prisma.aiConfig.findUnique({
        where: { id: aiConfigId }
      });

      if (!config) {
        return { cacheKey: null, isCached: false };
      }

      // Checksum includes verticalName so each vertical has its own checksum
      const checksum = crypto.createHash('sha256').update(`${vertical}::${baseSystemPrompt}`).digest('hex');
      const now = new Date();

      // supportCacheKey stores a JSON map: { "retail": "cachedContents/xyz", "healthcare": "..." }
      // supportCacheChecksum stores a JSON map: { "retail": "abc123...", "healthcare": "..." }
      let cacheKeyMap: Record<string, string> = {};
      let checksumMap: Record<string, string> = {};

      try {
        if (config.supportCacheKey) cacheKeyMap = JSON.parse(config.supportCacheKey);
      } catch { cacheKeyMap = {}; }
      try {
        if (config.supportCacheChecksum) checksumMap = JSON.parse(config.supportCacheChecksum);
      } catch { checksumMap = {}; }

      const existingKey = cacheKeyMap[vertical];
      const existingChecksum = checksumMap[vertical];
      const expiresAt = config.supportCacheExpiresAt;

      // Cache HIT: same vertical, same checksum, not expired
      if (
        existingKey &&
        existingChecksum === checksum &&
        expiresAt &&
        expiresAt > now
      ) {
        this.logger.debug(`Hit Active Support AI Prompt Cache [${vertical}]: ${existingKey}`);
        return { cacheKey: existingKey, isCached: true };
      }

      const adapter = this.getAdapter(provider);
      const estimatedTokens = this.estimateTokenCount(baseSystemPrompt);

      // For Gemini: only create explicit cache if token threshold is met (32,768 tokens)
      // For OpenAI: prefix-caching is automatic — we store a marker key so we know the prefix is stable
      if (!adapter.supportsNativeCaching(modelName, estimatedTokens)) {
        if ((provider || 'gemini').toLowerCase() === 'openai') {
          // OpenAI: prefix-caching is automatic. Store a stable marker so we know the prefix
          // is consistent. No API call needed — just mark as cached.
          const markerKey = `openai_prefix_cache::${vertical}::${checksum.slice(0, 16)}`;
          cacheKeyMap[vertical] = markerKey;
          checksumMap[vertical] = checksum;

          await this.prisma.aiConfig.update({
            where: { id: config.id },
            data: {
              supportCacheKey: JSON.stringify(cacheKeyMap),
              supportCacheChecksum: JSON.stringify(checksumMap),
              supportCacheExpiresAt: new Date(Date.now() + ttlSeconds * 1000)
            }
          });

          this.logger.debug(`[Support Cache] OpenAI prefix-cache marker set [${vertical}]: stable prefix registered.`);
          // Return false — OpenAI handles caching automatically, no explicit key needed
          return { cacheKey: null, isCached: false };
        }

        this.logger.debug(`Support AI System Prompt tokens (${estimatedTokens}) below ${provider} threshold. Skipping native cache.`);
        return { cacheKey: null, isCached: false };
      }

      // Gemini native cache creation
      const cacheResult = await adapter.createCache({
        tenantId: `platform_support_${vertical}`,
        systemPrompt: baseSystemPrompt,
        knowledgeContext: '',
        ttlSeconds,
        modelName,
        apiKey: apiKey || config.apiKey
      });

      cacheKeyMap[vertical] = cacheResult.cacheKey;
      checksumMap[vertical] = checksum;

      await this.prisma.aiConfig.update({
        where: { id: config.id },
        data: {
          supportCacheKey: JSON.stringify(cacheKeyMap),
          supportCacheExpiresAt: cacheResult.expiresAt,
          supportCacheChecksum: JSON.stringify(checksumMap)
        }
      });

      this.logger.log(`Created Platform Support AI Cache [${vertical}]: ${cacheResult.cacheKey}`);
      return { cacheKey: cacheResult.cacheKey, isCached: true };
    } catch (err: any) {
      this.logger.warn(`Failed to create/retrieve Support AI cache: ${err.message}. Falling back.`);
      return { cacheKey: null, isCached: false };
    }
  }


  async invalidateSupportCache(aiConfigId?: string): Promise<void> {
    try {
      const where = aiConfigId ? { id: aiConfigId } : { isSupportDefault: true };
      const config = await this.prisma.aiConfig.findFirst({ where });

      if (!config || !config.supportCacheKey) return;

      const adapter = this.getAdapter(config.provider || 'gemini');
      await adapter.deleteCache(config.supportCacheKey);

      await this.prisma.aiConfig.update({
        where: { id: config.id },
        data: {
          supportCacheKey: null,
          supportCacheExpiresAt: null,
          supportCacheChecksum: null
        }
      });

      this.logger.log(`Invalidated Platform Support AI Prompt Cache for Config ${config.id}`);
    } catch (err: any) {
      this.logger.error(`Error invalidating Support AI cache: ${err.message}`);
    }
  }
}

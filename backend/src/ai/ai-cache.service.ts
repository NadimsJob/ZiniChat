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
    ttlSeconds?: number;
  }): Promise<{ cacheKey: string | null; isCached: boolean }> {
    const { aiConfigId, provider, modelName, apiKey, baseSystemPrompt } = params;
    const ttlSeconds = params.ttlSeconds || 86400; // 24 hours default TTL

    try {
      const config = await this.prisma.aiConfig.findUnique({
        where: { id: aiConfigId }
      });

      if (!config) {
        return { cacheKey: null, isCached: false };
      }

      const checksum = crypto.createHash('sha256').update(baseSystemPrompt).digest('hex');
      const now = new Date();

      if (
        config.supportCacheKey &&
        config.supportCacheChecksum === checksum &&
        config.supportCacheExpiresAt &&
        config.supportCacheExpiresAt > now
      ) {
        this.logger.debug(`Hit Active Support AI Prompt Cache: ${config.supportCacheKey}`);
        return { cacheKey: config.supportCacheKey, isCached: true };
      }

      const adapter = this.getAdapter(provider);
      const estimatedTokens = this.estimateTokenCount(baseSystemPrompt);

      if (!adapter.supportsNativeCaching(modelName, estimatedTokens)) {
        this.logger.debug(`Support AI System Prompt tokens (${estimatedTokens}) below ${provider} threshold. Skipping native cache.`);
        return { cacheKey: null, isCached: false };
      }

      const cacheResult = await adapter.createCache({
        tenantId: 'platform_support',
        systemPrompt: baseSystemPrompt,
        knowledgeContext: '',
        ttlSeconds,
        modelName,
        apiKey: apiKey || config.apiKey
      });

      await this.prisma.aiConfig.update({
        where: { id: config.id },
        data: {
          supportCacheKey: cacheResult.cacheKey,
          supportCacheExpiresAt: cacheResult.expiresAt,
          supportCacheChecksum: checksum
        }
      });

      this.logger.log(`Created Platform Support AI Cache: ${cacheResult.cacheKey}`);
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

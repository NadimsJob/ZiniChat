import { Injectable, Logger } from '@nestjs/common';
import { IAiCacheProvider, CreateCacheParams, CacheResult } from '../interfaces/ai-cache-provider.interface';

@Injectable()
export class OpenAICacheAdapter implements IAiCacheProvider {
  private readonly logger = new Logger(OpenAICacheAdapter.name);

  // OpenAI automatic prompt caching applies to prompts >= 1024 tokens
  private readonly MIN_CACHE_TOKENS = 1024;

  supportsNativeCaching(modelName: string, tokenCount: number): boolean {
    const m = (modelName || '').toLowerCase();
    const isSupportedModel = m.includes('gpt-4o') || m.includes('gpt-4') || m.includes('o1') || m.includes('o3');
    return isSupportedModel && tokenCount >= this.MIN_CACHE_TOKENS;
  }

  async createCache(params: CreateCacheParams): Promise<CacheResult> {
    const { tenantId, ttlSeconds } = params;
    
    // OpenAI automatic caching happens server-side based on exact prefix matching.
    // We register a virtual cache key in DB to track context validity and expiration.
    const cacheKey = `openai_auto_cache_${tenantId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    this.logger.log(`OpenAI Automatic Cache Metadata Registered: ${cacheKey}`);
    return { cacheKey, expiresAt };
  }

  async getCache(cacheKey: string, apiKey?: string): Promise<any> {
    return { status: 'active', provider: 'openai', cacheKey };
  }

  async deleteCache(cacheKey: string, apiKey?: string): Promise<boolean> {
    return true;
  }
}

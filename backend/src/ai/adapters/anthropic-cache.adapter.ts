import { Injectable, Logger } from '@nestjs/common';
import { IAiCacheProvider, CreateCacheParams, CacheResult } from '../interfaces/ai-cache-provider.interface';

@Injectable()
export class AnthropicCacheAdapter implements IAiCacheProvider {
  private readonly logger = new Logger(AnthropicCacheAdapter.name);

  // Anthropic prompt caching threshold is 1024 tokens for Claude 3.5 Sonnet / Claude 3 Haiku
  private readonly MIN_CACHE_TOKENS = 1024;

  supportsNativeCaching(modelName: string, tokenCount: number): boolean {
    const m = (modelName || '').toLowerCase();
    const isClaude = m.includes('claude');
    return isClaude && tokenCount >= this.MIN_CACHE_TOKENS;
  }

  async createCache(params: CreateCacheParams): Promise<CacheResult> {
    const { tenantId, ttlSeconds } = params;

    // Anthropic caching uses ephemeral cache_control blocks in API payload.
    // We store metadata reference in DB to track invalidation.
    const cacheKey = `anthropic_ephemeral_cache_${tenantId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    this.logger.log(`Anthropic Ephemeral Cache Metadata Registered: ${cacheKey}`);
    return { cacheKey, expiresAt };
  }

  async getCache(cacheKey: string, apiKey?: string): Promise<any> {
    return { status: 'active', provider: 'anthropic', cacheKey };
  }

  async deleteCache(cacheKey: string, apiKey?: string): Promise<boolean> {
    return true;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { IAiCacheProvider, CreateCacheParams, CacheResult } from '../interfaces/ai-cache-provider.interface';

@Injectable()
export class GeminiCacheAdapter implements IAiCacheProvider {
  private readonly logger = new Logger(GeminiCacheAdapter.name);

  // Gemini native context caching minimum threshold is 32,768 tokens
  private readonly MIN_CACHE_TOKENS = 32768;

  supportsNativeCaching(modelName: string, tokenCount: number): boolean {
    const m = (modelName || '').toLowerCase();
    const isGemini = m.includes('gemini') || m.includes('1.5');
    return isGemini && tokenCount >= this.MIN_CACHE_TOKENS;
  }

  async createCache(params: CreateCacheParams): Promise<CacheResult> {
    const { systemPrompt, knowledgeContext, ttlSeconds, apiKey, modelName } = params;
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      this.logger.warn('Gemini API key missing for prompt cache creation. Falling back.');
      throw new Error('Gemini API key missing');
    }

    const fullModelName = modelName || 'gemini-1.5-flash';
    const targetModel = fullModelName.startsWith('models/') ? fullModelName : `models/${fullModelName}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n--- KNOWLEDGE BASE ---\n${knowledgeContext}` }]
            }
          ],
          ttl: `${ttlSeconds}s`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Gemini Cache API Error: ${JSON.stringify(data)}`);
        throw new Error(data.error?.message || 'Failed to create Gemini cache');
      }

      const cacheKey = data.name; // Format: cachedContents/xyz
      const expiresAt = data.expireTime ? new Date(data.expireTime) : new Date(Date.now() + ttlSeconds * 1000);

      this.logger.log(`Gemini Cache Created Successfully: ${cacheKey}, Expires: ${expiresAt.toISOString()}`);
      return { cacheKey, expiresAt };
    } catch (err: any) {
      this.logger.error(`Gemini Cache Creation Exception: ${err.message}`);
      throw err;
    }
  }

  async getCache(cacheKey: string, apiKey?: string): Promise<any> {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key || !cacheKey) return null;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${cacheKey}?key=${key}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      return null;
    }
  }

  async deleteCache(cacheKey: string, apiKey?: string): Promise<boolean> {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key || !cacheKey) return false;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${cacheKey}?key=${key}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (err) {
      return false;
    }
  }
}

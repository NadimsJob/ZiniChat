export interface CreateCacheParams {
  tenantId: string;
  systemPrompt: string;
  knowledgeContext: string;
  toolsConfig?: any;
  ttlSeconds: number;
  modelName?: string;
  apiKey?: string;
}

export interface CacheResult {
  cacheKey: string;
  expiresAt: Date;
}

export interface IAiCacheProvider {
  createCache(params: CreateCacheParams): Promise<CacheResult>;
  getCache(cacheKey: string, apiKey?: string): Promise<any>;
  deleteCache(cacheKey: string, apiKey?: string): Promise<boolean>;
  supportsNativeCaching(modelName: string, tokenCount: number): boolean;
}

import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiCacheService } from './ai-cache.service';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const pdf = require('pdf-parse');
export interface AiUsageMetrics {
  promptTokenCount: number;
  cachedContentTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  costUsd: number;
}

export interface AiCompletionResult {
  text: string;
  usage: AiUsageMetrics;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private aiCacheService: AiCacheService
  ) {}

  isVisionSupported(provider?: string, modelName?: string): boolean {
    if (!modelName) return false;
    const p = (provider || 'openai').toLowerCase();
    const m = modelName.toLowerCase();

    if (p === 'gemini') return true;
    if (p === 'anthropic') return true;

    if (m.includes('4o') || m.includes('vision') || m.includes('turbo') || m.includes('o1') || m.includes('o3') || m.includes('llava') || m.includes('claude-3') || m.includes('gemini')) {
      return true;
    }
    return false;
  }

  async getConfigs() {
    const configs = await this.prisma.aiConfig.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return configs.map(c => ({
      ...c,
      isVisionSupported: this.isVisionSupported(c.provider, c.modelName)
    }));
  }

  async saveConfig(data: any) {
    let result: any;
    if (data.id) {
      result = await this.prisma.aiConfig.update({
        where: { id: data.id },
        data: {
          name: data.name,
          provider: data.provider || 'openai',
          modelName: data.modelName,
          apiKey: data.apiKey,
          apiEndpoint: data.apiEndpoint || null,
          systemPrompt: data.systemPrompt !== undefined ? data.systemPrompt : undefined,
          isActive: !!data.isActive
        }
      });
      await this.aiCacheService.invalidateSupportCache(data.id);
    } else {
      result = await this.prisma.aiConfig.create({
        data: {
          name: data.name,
          provider: data.provider || 'openai',
          modelName: data.modelName,
          apiKey: data.apiKey,
          apiEndpoint: data.apiEndpoint || null,
          systemPrompt: data.systemPrompt || null,
          isActive: !!data.isActive
        }
      });
    }
    return result;
  }

  async deleteConfig(id: string) {
    await this.aiCacheService.invalidateSupportCache(id);
    return this.prisma.aiConfig.delete({
      where: { id }
    });
  }

  async setDefaultConfig(id: string, overrideAllTenants: boolean) {
    await this.prisma.$transaction(async (tx) => {
      // Set all configs to inactive
      await tx.aiConfig.updateMany({
        data: { isActive: false }
      });
      // Set target config to active
      await tx.aiConfig.update({
        where: { id },
        data: { isActive: true }
      });
      
      // Optionally reset tenant overrides
      if (overrideAllTenants) {
        await tx.tenant.updateMany({
          data: { customAiConfigId: null }
        });
      }
    });
    
    return { success: true };
  }

  async setSupportDefaultConfig(id: string) {
    await this.prisma.$transaction(async (tx) => {
      // Set all configs to not support default
      await tx.aiConfig.updateMany({
        data: { isSupportDefault: false }
      });
      // Set target config to support default
      await tx.aiConfig.update({
        where: { id },
        data: { isSupportDefault: true }
      });
    });

    await this.aiCacheService.invalidateSupportCache(id);
    
    return { success: true };
  }

  async fetchAvailableModels(data: { apiKey: string; apiEndpoint?: string; provider?: string }) {
    const { apiKey, apiEndpoint, provider } = data;
    const actualProvider = provider || 'openai';
    if (!apiKey) throw new BadRequestException('API Key is required.');

    if (actualProvider === 'gemini') {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch Gemini models');
        if (json.models && Array.isArray(json.models)) {
          return json.models.map((m: any) => m.name.replace('models/', ''));
        }
        return [];
      } catch (err) {
        this.logger.error('Fetch Gemini models failed:', err);
        throw new BadRequestException('Failed to fetch models from Gemini API. Check your API key.');
      }
    }

    if (actualProvider === 'anthropic') {
      try {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch Anthropic models');
        if (json.data && Array.isArray(json.data)) {
          return json.data.map((m: any) => m.id);
        }
        return [];
      } catch (err) {
        this.logger.error('Fetch Anthropic models failed:', err);
        throw new BadRequestException('Failed to fetch models from Anthropic API. Check your API key.');
      }
    }

    const baseUrl = apiEndpoint 
      ? apiEndpoint.replace('/chat/completions', '').replace('/v1/messages', '') 
      : (actualProvider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1');
    
    // Handle trailing slashes
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const modelsUrl = `${cleanBaseUrl}/models`;
    
    try {
      const res = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to fetch models');
      }
      
      if (json.data && Array.isArray(json.data)) {
        return json.data.map((m: any) => m.id);
      }
      
      return [];
    } catch (err) {
      this.logger.error('Fetch models failed:', err);
      throw new BadRequestException('Failed to fetch models from the provided endpoint and API key. Ensure they are correct and OpenAI-compatible.');
    }
  }

  async generateCompletionDetailed(prompt: string, configId?: string, imagePaths?: string[], cacheKey?: string): Promise<AiCompletionResult> {
    let config: any;

    if (configId) {
      config = await this.prisma.aiConfig.findUnique({ where: { id: configId } });
    } else {
      config = await this.prisma.aiConfig.findFirst({ where: { isActive: true } });
    }

    if (!config) {
      throw new BadRequestException('No active AI model configuration found.');
    }

    const { modelName, apiKey, apiEndpoint, provider } = config;
    const actualProvider = provider || 'openai';

    if (actualProvider === 'gemini') {
      try {
        const parts = [{ text: prompt }];
        if (imagePaths && imagePaths.length > 0) {
          for (const imgPath of imagePaths) {
            try {
              const buffer = fs.readFileSync(imgPath);
              const base64 = buffer.toString('base64');
              let mime = 'image/jpeg';
              if (imgPath.endsWith('.png')) mime = 'image/png';
              else if (imgPath.endsWith('.webp')) mime = 'image/webp';
              
              parts.push({
                inline_data: { mime_type: mime, data: base64 }
              } as any);
            } catch(e) {
              this.logger.error('Failed to read image for AI: ' + imgPath);
            }
          }
        }
        const bodyPayload: any = { contents: [{ parts }] };
        if (cacheKey && cacheKey.startsWith('cachedContents/')) {
          bodyPayload.cachedContent = cacheKey;
        }

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Gemini generation error');
        
        const promptTokenCount = data.usageMetadata?.promptTokenCount || 0;
        const cachedContentTokenCount = data.usageMetadata?.cachedContentTokenCount || 0;
        const candidatesTokenCount = data.usageMetadata?.candidatesTokenCount || 0;
        const totalTokenCount = promptTokenCount + candidatesTokenCount;

        const uncachedPromptTokens = Math.max(0, promptTokenCount - cachedContentTokenCount);
        const costUsd = (uncachedPromptTokens * 0.000000075) + 
                        (cachedContentTokenCount * 0.00000001875) + 
                        (candidatesTokenCount * 0.00000030);

        const savingsPercent = promptTokenCount > 0 
          ? ((cachedContentTokenCount / promptTokenCount) * 75).toFixed(1)
          : '0.0';

        this.logger.log(`[AI Cache Audit] Total Tokens: ${totalTokenCount} | Cached Tokens: ${cachedContentTokenCount} | Savings: ${savingsPercent}%`);

        return {
          text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
          usage: {
            promptTokenCount,
            cachedContentTokenCount,
            candidatesTokenCount,
            totalTokenCount,
            costUsd,
          }
        };
      } catch (err: any) {
        this.logger.error(`Gemini execution failed:`, err);
        throw new InternalServerErrorException(err.message || 'Gemini request failed.');
      }
    }

    if (actualProvider === 'anthropic') {
      try {
        const content: any[] = [
          {
            type: 'text',
            text: prompt,
            ...(cacheKey ? { cache_control: { type: 'ephemeral' } } : {})
          }
        ];
        if (imagePaths && imagePaths.length > 0) {
          for (const imgPath of imagePaths) {
            try {
              const buffer = fs.readFileSync(imgPath);
              const base64 = buffer.toString('base64');
              let mime = 'image/jpeg';
              if (imgPath.endsWith('.png')) mime = 'image/png';
              else if (imgPath.endsWith('.webp')) mime = 'image/webp';
              
              content.push({
                type: 'image',
                source: { type: 'base64', media_type: mime, data: base64 }
              });
            } catch(e) {
              this.logger.error('Failed to read image for AI: ' + imgPath);
            }
          }
        }
        const headers: Record<string, string> = {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        };
        if (cacheKey) {
          headers['anthropic-beta'] = 'prompt-caching-2024-07-31';
        }
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelName,
            max_tokens: 4096,
            messages: [{ role: 'user', content }]
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Anthropic generation error');
        
        const promptTokenCount = data.usage?.input_tokens || 0;
        const cachedContentTokenCount = data.usage?.cache_read_input_tokens || 0;
        const candidatesTokenCount = data.usage?.output_tokens || 0;
        const totalTokenCount = promptTokenCount + candidatesTokenCount;
        const uncachedPromptTokens = Math.max(0, promptTokenCount - cachedContentTokenCount);
        const costUsd = (uncachedPromptTokens * 0.000003) + (cachedContentTokenCount * 0.0000003) + (candidatesTokenCount * 0.000015);

        return {
          text: data.content?.[0]?.text || '',
          usage: {
            promptTokenCount,
            cachedContentTokenCount,
            candidatesTokenCount,
            totalTokenCount,
            costUsd
          }
        };
      } catch (err: any) {
        this.logger.error(`Anthropic execution failed:`, err);
        throw new InternalServerErrorException(err.message || 'Anthropic request failed.');
      }
    }

    const imagePartsOpenAI = [];
    
    if (imagePaths && imagePaths.length > 0) {
      for (const imgPath of imagePaths) {
        try {
          const buffer = fs.readFileSync(imgPath);
          const base64 = buffer.toString('base64');
          let mime = 'image/jpeg';
          if (imgPath.endsWith('.png')) mime = 'image/png';
          else if (imgPath.endsWith('.webp')) mime = 'image/webp';
          
          imagePartsOpenAI.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } });
        } catch(e) {
          this.logger.error('Failed to read image for AI: ' + imgPath);
        }
      }
    }

    try {
      const url = apiEndpoint || 'https://api.openai.com/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...imagePartsOpenAI] }]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'AI generation error');

      const promptTokenCount = data.usage?.prompt_tokens || 0;
      const cachedContentTokenCount = data.usage?.prompt_tokens_details?.cached_tokens || 0;
      const candidatesTokenCount = data.usage?.completion_tokens || 0;
      const totalTokenCount = data.usage?.total_tokens || (promptTokenCount + candidatesTokenCount);
      const uncachedPromptTokens = Math.max(0, promptTokenCount - cachedContentTokenCount);
      const costUsd = (uncachedPromptTokens * 0.00000015) + (cachedContentTokenCount * 0.000000075) + (candidatesTokenCount * 0.00000060);

      return {
        text: data.choices?.[0]?.message?.content || '',
        usage: {
          promptTokenCount,
          cachedContentTokenCount,
          candidatesTokenCount,
          totalTokenCount,
          costUsd
        }
      };
    } catch (err: any) {
      this.logger.error(`AI execution failed for model (${modelName}):`, err);
      throw new InternalServerErrorException(err.message || 'AI request dispatch failed.');
    }
  }

  async generateCompletion(prompt: string, configId?: string, imagePaths?: string[], cacheKey?: string): Promise<string> {
    const res = await this.generateCompletionDetailed(prompt, configId, imagePaths, cacheKey);
    return res.text;
  }

  async recordUsageLog(tenantId: string, assistantId: string, usage: AiUsageMetrics) {
    const savingsPercent = usage.promptTokenCount > 0 
      ? ((usage.cachedContentTokenCount / usage.promptTokenCount) * 75).toFixed(1)
      : '0.0';

    this.logger.log(
      `[AI Cache Audit] Total Tokens: ${usage.totalTokenCount} | Cached Tokens: ${usage.cachedContentTokenCount} | Savings: ${savingsPercent}%`
    );

    return this.prisma.aiUsageLog.create({
      data: {
        tenantId,
        assistantId,
        tokensUsed: usage.totalTokenCount,
        cachedTokens: usage.cachedContentTokenCount,
        costUsd: usage.costUsd,
      }
    });
  }

  async testConfigConnection(id: string): Promise<string> {
    const testPrompt = 'Say "API Connection Successful" and nothing else.';
    return this.generateCompletion(testPrompt, id);
  }

  async transcribeAudio(filePath: string, tenantId: string): Promise<string> {
    try {
      // 1. Check for Groq API Key first (Free Tier: 7,000 requests/day, 2,000 mins/month)
      const groqConfig = await this.prisma.aiConfig.findFirst({
        where: { provider: 'groq', isActive: true }
      });
      const groqApiKey = groqConfig?.apiKey || process.env.GROQ_API_KEY;

      if (groqApiKey) {
        try {
          const groq = new OpenAI({
            apiKey: groqApiKey,
            baseURL: 'https://api.groq.com/openai/v1',
          });
          const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-large-v3',
          });
          this.logger.log(`Transcribed audio using Groq Free Whisper for tenant ${tenantId}`);
          return transcription.text;
        } catch (groqErr: any) {
          this.logger.warn(`Groq Whisper failed, falling back to OpenAI: ${groqErr.message}`);
        }
      }

      // 2. Fallback to OpenAI Whisper
      let config = await this.prisma.aiConfig.findFirst({
        where: { provider: 'openai', isActive: true }
      });
      const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('No Groq or OpenAI API key available for transcription.');
      }

      const openai = new OpenAI({ apiKey });
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
      });

      return transcription.text;
    } catch (err: any) {
      this.logger.error(`Transcription failed for ${filePath}: ${err.message}`);
      return '[Audio transcription failed or unavailable]';
    }
  }

  /**
   * Download an audio file from a remote CDN URL (e.g. Messenger/Instagram),
   * save it to OS temp dir (does NOT count toward tenant storage),
   * transcribe via Whisper, then always delete the temp file.
   */
  async transcribeFromUrl(url: string, tenantId: string): Promise<string> {
    const tmpPath = path.join(os.tmpdir(), `zini_audio_${Date.now()}_${Math.round(Math.random() * 1e6)}.ogg`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download audio from CDN: HTTP ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(tmpPath, buffer);
      this.logger.log(`Downloaded audio from CDN for tenant ${tenantId}: ${buffer.length} bytes (tmp)`);
      return await this.transcribeAudio(tmpPath, tenantId);
    } catch (err) {
      this.logger.error(`transcribeFromUrl failed for tenant ${tenantId}: ${err.message}`);
      return '[Audio transcription failed or unavailable]';
    } finally {
      // Always delete temp file — it lives in OS tmpdir, never in tenant upload dir
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
    }
  }

  async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (err) {
      this.logger.error(`PDF extraction failed for ${filePath}: ${err.message}`);
      return '[PDF extraction failed or document is unreadable]';
    }
  }

  async buildOptimizedContext(conversationId: string): Promise<Array<{ role: string; content: string }>> {
    const MAX_RECENT_MESSAGES = 10;

    const count = await this.prisma.message.count({
      where: { conversationId },
    });

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    let isTrimmed = false;
    if (typeof count === 'number' && count > 0) {
      isTrimmed = count > MAX_RECENT_MESSAGES;
    } else {
      isTrimmed = !!(conversation && conversation.summary);
    }

    let messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    if (isTrimmed) {
      messages = messages.slice(-MAX_RECENT_MESSAGES);
    }

    const context = messages.map(msg => {
      let role = 'user';
      if (msg.senderType === 'customer') {
        role = 'user';
      } else if (msg.senderType === 'bot' || msg.senderType === 'agent' || msg.senderType === 'ai') {
        role = 'assistant';
      }

      let content = '';
      if (typeof msg.content === 'object' && msg.content !== null) {
        content = (msg.content as any).text || (msg.content as any).caption || JSON.stringify(msg.content);
      } else {
        content = String(msg.content);
      }

      return { role, content };
    });

    if (isTrimmed && conversation && conversation.summary) {
      context.unshift({
        role: 'system',
        content: `System Note: Summary of earlier conversation history: ${conversation.summary}`,
      });
    }

    return context;
  }

  async generateConversationSummary(conversationId: string): Promise<string> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    if (!messages || messages.length === 0) {
      return '';
    }

    const conversationText = messages.map(msg => {
      const sender = msg.senderType === 'customer' ? 'Customer' : 'Assistant';
      let text = '';
      if (typeof msg.content === 'object' && msg.content !== null) {
        text = (msg.content as any).text || (msg.content as any).caption || JSON.stringify(msg.content);
      } else {
        text = String(msg.content);
      }
      return `${sender}: ${text}`;
    }).join('\n');

    const prompt = `Summarize the key decisions, user preferences, and facts from this conversation in 2-3 concise sentences:\n\n${conversationText}`;

    const config = await this.prisma.aiConfig.findFirst({
      where: { provider: 'gemini', modelName: 'gemini-1.5-flash' }
    });

    const configId = config?.id || undefined;
    const summary = await this.generateCompletion(prompt, configId);

    if (summary) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          summary: summary.trim(),
          summaryGeneratedAt: new Date(),
        },
      });
    }

    return summary;
  }

  /** The target vector dimension for pgvector storage — Gemini text-embedding-004 */
  static readonly EMBEDDING_DIMENSION = 768;

  /**
   * Generate a 768-dim embedding vector using Gemini text-embedding-004.
   * Throws a clear error if the API returns an unexpected dimension,
   * preventing cryptic pgvector dimension mismatch errors downstream.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured for embedding generation.');
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text }] } }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini Embedding API error (${res.status}): ${errBody}`);
    }

    const json = await res.json();
    const vector: number[] = json?.embedding?.values;

    if (!Array.isArray(vector)) {
      throw new Error('Gemini embedding response did not contain a valid values array.');
    }

    // Runtime dimension guard — prevents silent data corruption in pgvector
    if (vector.length !== AiService.EMBEDDING_DIMENSION) {
      this.logger.error(
        `Embedding dimension mismatch: expected ${AiService.EMBEDDING_DIMENSION}, got ${vector.length}`
      );
      throw new Error(
        `Invalid embedding vector dimension: ${vector.length}. Expected ${AiService.EMBEDDING_DIMENSION}.`
      );
    }

    return vector;
  }

  async searchRelevantChunks(tenantId: string, queryVector: number[] | string, limit = 5) {
    if (!tenantId || tenantId.trim() === '') {
      throw new BadRequestException('tenantId is required for vector search');
    }

    // Validate query vector dimension before sending to PostgreSQL
    if (Array.isArray(queryVector) && queryVector.length !== AiService.EMBEDDING_DIMENSION) {
      throw new BadRequestException(
        `Query vector dimension mismatch: expected ${AiService.EMBEDDING_DIMENSION}, got ${queryVector.length}. ` +
        `Re-generate the query embedding using the correct model (Gemini text-embedding-004).`
      );
    }

    const vectorStr = Array.isArray(queryVector) ? `[${queryVector.join(',')}]` : queryVector;

    const chunks: any[] = await this.prisma.$queryRaw`
      SELECT kc.id, kc.content, kc."documentId", kc."chunkIndex", (1 - (kc.embedding <=> ${vectorStr}::vector)) as similarity
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kc."documentId" = kd.id
      WHERE kd."tenantId" = ${tenantId}::uuid AND kd.status = 'completed'
      ORDER BY kc.embedding <=> ${vectorStr}::vector
      LIMIT ${limit};
    `;

    return chunks;
  }

  /**
   * Dynamically search tenant products based on customer query to minimize token usage.
   * If query is generic greeting, returns empty array.
   */
  async searchRelevantProducts(tenantId: string, queryText: string, limit = 5): Promise<any[]> {
    if (!tenantId || !queryText) return [];

    try {
      const cleanText = queryText.trim().toLowerCase();
      const genericGreetings = ['hi', 'hello', 'hey', 'salam', 'assalamu alaikum', 'hola', 'test', 'hlw', 'hlo', 'kemon achen', 'good morning', 'good evening'];
      
      // If generic greeting or ultra-short, do not load product catalog
      if (genericGreetings.includes(cleanText) || cleanText.length <= 3) {
        return [];
      }

      // Extract significant search keywords (>2 chars)
      const keywords = cleanText
        .replace(/[^\w\s\u0980-\u09FF]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'for', 'you', 'have', 'what', 'price', 'cost', 'dam', 'koto', 'naki', 'ache'].includes(w));

      const orConditions: any[] = [];
      keywords.forEach(kw => {
        orConditions.push({ name: { contains: kw, mode: 'insensitive' } });
        orConditions.push({ sku: { contains: kw, mode: 'insensitive' } });
        orConditions.push({ description: { contains: kw, mode: 'insensitive' } });
        orConditions.push({ location: { contains: kw, mode: 'insensitive' } });
      });

      if (orConditions.length > 0) {
        const matched = await this.prisma.product.findMany({
          where: {
            tenantId,
            isActive: true,
            OR: orConditions
          },
          take: limit
        });

        if (matched.length > 0) {
          return matched;
        }
      }

      // Fallback: If query mentions product/catalog terms, return top `limit` products
      const productIntentTerms = ['product', 'item', 'catalog', 'price', 'list', 'buy', 'order', 'room', 'property', 'doctor', 'course', 'package', 'shipping', 'দাম', 'প্রোডাক্ট', 'মাল', 'অর্ডার', 'ক্যাটালগ', 'তালিকা', 'সার্ভিস', 'service'];
      const looksLikeProductQuery = productIntentTerms.some(term => cleanText.includes(term));

      if (looksLikeProductQuery) {
        return await this.prisma.product.findMany({
          where: { tenantId, isActive: true },
          take: limit
        });
      }

      return [];
    } catch (err: any) {
      this.logger.error(`Error in searchRelevantProducts: ${err.message}`);
      return [];
    }
  }

  /**
   * Dynamically search tenant Q&As based on customer query.
   */
  async searchRelevantQnas(tenantId: string, queryText: string, limit = 5): Promise<any[]> {
    if (!tenantId) return [];

    try {
      const allQnas = await this.prisma.qnAKnowledgeBase.findMany({
        where: { tenantId, isActive: true }
      });

      if (allQnas.length === 0) return [];

      const cleanText = (queryText || '').trim().toLowerCase();
      if (!cleanText || ['hi', 'hello', 'hey', 'salam', 'test'].includes(cleanText)) {
        // For generic greetings, include only default or top 2 Q&As
        return allQnas.filter(q => q.answer && q.answer.trim()).slice(0, 2);
      }

      const keywords = cleanText
        .replace(/[^\w\s\u0980-\u09FF]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);

      const scored = allQnas.map(q => {
        let score = 0;
        const qText = `${q.question} ${q.answer}`.toLowerCase();
        keywords.forEach(kw => {
          if (qText.includes(kw)) score += 1;
        });
        return { qna: q, score };
      });

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);

      // Return items with score > 0, or top default Q&As if none matched
      const matches = scored.filter(s => s.score > 0).map(s => s.qna);
      if (matches.length > 0) {
        return matches.slice(0, limit);
      }

      return allQnas.filter(q => q.answer && q.answer.trim()).slice(0, limit);
    } catch (err: any) {
      this.logger.error(`Error in searchRelevantQnas: ${err.message}`);
      return [];
    }
  }
}



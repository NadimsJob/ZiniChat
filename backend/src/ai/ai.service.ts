import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import * as fs from 'fs';
const pdf = require('pdf-parse');
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  async getConfigs() {
    return this.prisma.aiConfig.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async saveConfig(data: any) {
    if (data.id) {
      return this.prisma.aiConfig.update({
        where: { id: data.id },
        data: {
          name: data.name,
          provider: data.provider || 'openai',
          modelName: data.modelName,
          apiKey: data.apiKey,
          apiEndpoint: data.apiEndpoint || null,
          isActive: !!data.isActive
        }
      });
    } else {
      return this.prisma.aiConfig.create({
        data: {
          name: data.name,
          provider: data.provider || 'openai',
          modelName: data.modelName,
          apiKey: data.apiKey,
          apiEndpoint: data.apiEndpoint || null,
          isActive: !!data.isActive
        }
      });
    }
  }

  async deleteConfig(id: string) {
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
      : 'https://api.openai.com/v1';
    
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

  async generateCompletion(prompt: string, configId?: string, imagePaths?: string[]): Promise<string> {
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
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Gemini generation error');
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (err) {
        this.logger.error(`Gemini execution failed:`, err);
        throw new InternalServerErrorException(err.message || 'Gemini request failed.');
      }
    }

    if (actualProvider === 'anthropic') {
      try {
        const content: any[] = [{ type: 'text', text: prompt }];
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
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            max_tokens: 4096,
            messages: [{ role: 'user', content }]
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Anthropic generation error');
        return data.content?.[0]?.text || '';
      } catch (err) {
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
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      this.logger.error(`AI execution failed for model (${modelName}):`, err);
      throw new InternalServerErrorException(err.message || 'AI request dispatch failed.');
    }
  }

  async testConfigConnection(id: string): Promise<string> {
    const testPrompt = 'Say "API Connection Successful" and nothing else.';
    return this.generateCompletion(testPrompt, id);
  }

  async transcribeAudio(filePath: string, tenantId: string): Promise<string> {
    try {
      // Find a config that has an OpenAI key, since Whisper requires OpenAI.
      let config = await this.prisma.aiConfig.findFirst({
        where: { provider: 'openai', isActive: true }
      });
      
      // Fallback: If no OpenAI config, we might need a platform default key from env
      const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('No OpenAI API key available for transcription.');
      }

      const openai = new OpenAI({ apiKey });
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
      });

      return transcription.text;
    } catch (err) {
      this.logger.error(`Transcription failed for ${filePath}: ${err.message}`);
      return '[Audio transcription failed or unavailable]';
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
}

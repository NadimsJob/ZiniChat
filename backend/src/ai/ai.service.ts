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
          provider: data.provider,
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
          provider: data.provider,
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

    const { provider, modelName, apiKey, apiEndpoint } = config;

    const imagePartsOpenAI = [];
    const imagePartsGemini = [];
    const imagePartsAnthropic = [];
    
    if (imagePaths && imagePaths.length > 0) {
      for (const imgPath of imagePaths) {
        try {
          const buffer = fs.readFileSync(imgPath);
          const base64 = buffer.toString('base64');
          let mime = 'image/jpeg';
          if (imgPath.endsWith('.png')) mime = 'image/png';
          else if (imgPath.endsWith('.webp')) mime = 'image/webp';
          
          imagePartsOpenAI.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } });
          imagePartsGemini.push({ inlineData: { mimeType: mime, data: base64 } });
          imagePartsAnthropic.push({ type: 'image', source: { type: 'base64', media_type: mime, data: base64 } });
        } catch(e) {
          this.logger.error('Failed to read image for AI: ' + imgPath);
        }
      }
    }

    try {
      if (provider === 'openai') {
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
        if (!res.ok) throw new Error(data.error?.message || 'OpenAI error');
        return data.choices?.[0]?.message?.content || '';
      }

      if (provider === 'gemini') {
        const url = apiEndpoint || `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, ...imagePartsGemini] }]
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Gemini error');
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      if (provider === 'anthropic') {
        const url = apiEndpoint || 'https://api.anthropic.com/v1/messages';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            max_tokens: 1024,
            messages: [{ role: 'user', content: [...imagePartsAnthropic, { type: 'text', text: prompt }] }]
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Anthropic error');
        return data.content?.[0]?.text || '';
      }


      if (provider === 'custom') {
        if (!apiEndpoint) throw new Error('API Endpoint is required for custom AI models.');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ prompt })
        });

        const data = await res.json();
        if (!res.ok) throw new Error('Custom provider connection error');
        return data.completion || data.text || JSON.stringify(data);
      }

      throw new BadRequestException(`Provider ${provider} is not supported.`);
    } catch (err) {
      this.logger.error(`AI execution failed for ${provider} (${modelName}):`, err);
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

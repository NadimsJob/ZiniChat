import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';

import { AiCacheService } from './ai-cache.service';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-image-data')),
}));

const mockPrisma: any = {
  aiConfig: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  },
  tenant: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((callback: any) => callback(mockPrisma)),
};

describe('AiService', () => {
  let service: AiService;
  let globalFetchMock: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    globalFetchMock = jest.fn();
    global.fetch = globalFetchMock as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiCacheService, useValue: { invalidateSupportCache: jest.fn(), invalidateCache: jest.fn() } },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  describe('isVisionSupported', () => {
    it('should return true for gemini and anthropic regardless of model name', () => {
      expect(service.isVisionSupported('gemini', 'some-model')).toBe(true);
      expect(service.isVisionSupported('anthropic', 'other-model')).toBe(true);
    });

    it('should return true for specific model keywords', () => {
      expect(service.isVisionSupported('openai', 'gpt-4o')).toBe(true);
      expect(service.isVisionSupported('openai', 'gpt-4-vision-preview')).toBe(true);
      expect(service.isVisionSupported('ollama', 'llava')).toBe(true);
      expect(service.isVisionSupported('openai', 'o1-preview')).toBe(true);
    });

    it('should return false for models without vision support', () => {
      expect(service.isVisionSupported('openai', 'gpt-3.5')).toBe(false);
      expect(service.isVisionSupported('openai', 'gpt-4')).toBe(false);
    });

    it('should return false if no modelName is provided', () => {
      expect(service.isVisionSupported('openai')).toBe(false);
    });
  });

  describe('fetchAvailableModels', () => {
    it('should throw error if no API key is provided', async () => {
      await expect(service.fetchAvailableModels({ apiKey: '' })).rejects.toThrow(BadRequestException);
    });

    it('should correctly parse OpenAI models response', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 'gpt-4o' }, { id: 'gpt-3.5-turbo' }],
        }),
      });

      const models = await service.fetchAvailableModels({ apiKey: 'test-key', provider: 'openai' });
      expect(models).toEqual(['gpt-4o', 'gpt-3.5-turbo']);
      expect(globalFetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/models', expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer test-key' })
      }));
    });

    it('should correctly parse Gemini models response', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'models/gemini-1.5-pro' }, { name: 'models/gemini-1.5-flash' }],
        }),
      });

      const models = await service.fetchAvailableModels({ apiKey: 'gemini-key', provider: 'gemini' });
      expect(models).toEqual(['gemini-1.5-pro', 'gemini-1.5-flash']);
      expect(globalFetchMock).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models?key=gemini-key'
      );
    });

    it('should correctly parse Anthropic models response', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 'claude-3-opus' }, { id: 'claude-3-sonnet' }],
        }),
      });

      const models = await service.fetchAvailableModels({ apiKey: 'anthropic-key', provider: 'anthropic' });
      expect(models).toEqual(['claude-3-opus', 'claude-3-sonnet']);
      expect(globalFetchMock).toHaveBeenCalledWith('https://api.anthropic.com/v1/models', expect.objectContaining({
        headers: expect.objectContaining({ 
          'x-api-key': 'anthropic-key',
          'anthropic-version': '2023-06-01'
        })
      }));
    });
  });

  describe('generateCompletion', () => {
    it('should throw BadRequestException if no config is found', async () => {
      mockPrisma.aiConfig.findFirst.mockResolvedValueOnce(null);
      await expect(service.generateCompletion('hello')).rejects.toThrow(BadRequestException);
    });

    it('should send correct payload for OpenAI', async () => {
      mockPrisma.aiConfig.findFirst.mockResolvedValueOnce({
        modelName: 'gpt-4',
        apiKey: 'test-key',
        provider: 'openai',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'openai response' } }],
        }),
      });

      const res = await service.generateCompletion('hello');
      expect(res).toBe('openai response');
      expect(globalFetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
        body: expect.stringContaining('"role":"user"')
      }));
    });

    it('should send correct payload for Gemini', async () => {
      mockPrisma.aiConfig.findFirst.mockResolvedValueOnce({
        modelName: 'gemini-pro',
        apiKey: 'gemini-key',
        provider: 'gemini',
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'gemini response' }] } }],
        }),
      });

      const res = await service.generateCompletion('hello');
      expect(res).toBe('gemini response');
      expect(globalFetchMock).toHaveBeenCalledWith('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=gemini-key', expect.objectContaining({
        body: expect.stringContaining('contents')
      }));
    });

    it('should send correct payload for Anthropic', async () => {
      mockPrisma.aiConfig.findFirst.mockResolvedValueOnce({
        modelName: 'claude-3',
        apiKey: 'anthropic-key',
        provider: 'anthropic',
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'anthropic response' }],
        }),
      });

      const res = await service.generateCompletion('hello');
      expect(res).toBe('anthropic response');
      expect(globalFetchMock).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({
        headers: expect.objectContaining({ 'x-api-key': 'anthropic-key' }),
        body: expect.stringContaining('max_tokens')
      }));
    });

    it('should send correct payload with image paths for OpenAI', async () => {
      mockPrisma.aiConfig.findFirst.mockResolvedValueOnce({
        modelName: 'gpt-4o',
        apiKey: 'test-key',
        provider: 'openai',
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'openai vision response' } }] }),
      });

      const res = await service.generateCompletion('describe this', undefined, ['test.png']);
      expect(res).toBe('openai vision response');
      expect(globalFetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
        body: expect.stringContaining('image_url')
      }));
      expect(fs.readFileSync).toHaveBeenCalledWith('test.png');
    });

    it('should send correct payload with image paths for Gemini', async () => {
      mockPrisma.aiConfig.findFirst.mockResolvedValueOnce({
        modelName: 'gemini-1.5-pro',
        apiKey: 'gemini-key',
        provider: 'gemini',
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'gemini vision response' }] } }] }),
      });

      const res = await service.generateCompletion('describe this', undefined, ['test.webp']);
      expect(res).toBe('gemini vision response');
      expect(globalFetchMock).toHaveBeenCalledWith(expect.stringContaining('gemini-1.5-pro:generateContent'), expect.objectContaining({
        body: expect.stringContaining('inline_data')
      }));
      expect(fs.readFileSync).toHaveBeenCalledWith('test.webp');
    });

    it('should send correct payload with image paths for Anthropic', async () => {
      mockPrisma.aiConfig.findFirst.mockResolvedValueOnce({
        modelName: 'claude-3',
        apiKey: 'anthropic-key',
        provider: 'anthropic',
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ text: 'anthropic vision response' }] }),
      });

      const res = await service.generateCompletion('describe this', undefined, ['test.jpeg']);
      expect(res).toBe('anthropic vision response');
      expect(globalFetchMock).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({
        body: expect.stringContaining('base64')
      }));
      expect(fs.readFileSync).toHaveBeenCalledWith('test.jpeg');
    });
  });
});

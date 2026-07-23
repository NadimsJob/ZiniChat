import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

const mockPrisma = {
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
  $transaction: jest.fn((callback) => callback(mockPrisma)),
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
      ],
    }).compile();

    service = module.get<AiService>(AiService);
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
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiCacheService } from './ai-cache.service';
import { BadRequestException } from '@nestjs/common';

/**
 * RAG Embedding Dimension Tests
 * Verifies that AiService correctly:
 *  1. Accepts valid 768-dim embeddings (Gemini text-embedding-004)
 *  2. Rejects non-768-dim embeddings before they reach PostgreSQL
 */
describe('AiService — RAG Embedding Dimension Validation', () => {
  let service: AiService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockAiCacheService = {
    getCachedResponse: jest.fn().mockResolvedValue(null),
    cacheResponse: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiCacheService, useValue: mockAiCacheService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    jest.clearAllMocks();
  });

  describe('EMBEDDING_DIMENSION constant', () => {
    it('should be 768 (Gemini text-embedding-004)', () => {
      expect(AiService.EMBEDDING_DIMENSION).toBe(768);
    });
  });

  describe('generateEmbedding()', () => {
    const valid768Vector = new Array(768).fill(0).map((_, i) => i * 0.001);

    it('Test 1 — Valid 768-dim Embedding: should return a 768-element vector and pass validation', async () => {
      // Mock Gemini API returning a valid 768-dim vector
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: { values: valid768Vector },
        }),
      } as any);

      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const result = await service.generateEmbedding('Hello world');

      expect(result).toHaveLength(768);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBeCloseTo(0, 5);
      // Verify Gemini text-embedding-004 endpoint was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('text-embedding-004'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('Test 2 — Dimension Mismatch Rejection: should throw Error when API returns 1536-dim (OpenAI-size) vector', async () => {
      // Mock returning OpenAI-compatible 1536-dim vector (wrong size)
      const wrong1536Vector = new Array(1536).fill(0).map((_, i) => i * 0.0005);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: { values: wrong1536Vector },
        }),
      } as any);

      process.env.GEMINI_API_KEY = 'test-gemini-key';

      await expect(service.generateEmbedding('Hello world')).rejects.toThrow(
        /Invalid embedding vector dimension: 1536\. Expected 768\./
      );
    });

    it('should throw Error if GEMINI_API_KEY is not set', async () => {
      delete process.env.GEMINI_API_KEY;

      await expect(service.generateEmbedding('some text')).rejects.toThrow(
        'GEMINI_API_KEY is not configured for embedding generation.'
      );
    });

    it('should throw Error if Gemini API returns an error status', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'API key expired',
      } as any);

      await expect(service.generateEmbedding('some text')).rejects.toThrow(
        /Gemini Embedding API error \(403\)/
      );
    });

    it('should throw Error if Gemini response has no embedding values', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: {} }), // missing 'values'
      } as any);

      await expect(service.generateEmbedding('some text')).rejects.toThrow(
        'Gemini embedding response did not contain a valid values array.'
      );
    });
  });

  describe('searchRelevantChunks() — query vector dimension guard', () => {
    const valid768Vector = new Array(768).fill(0.1);
    const invalid1536Vector = new Array(1536).fill(0.1);

    it('should accept a valid 768-dim query vector and execute search', async () => {
      const mockChunks = [
        { id: 'chunk-1', content: 'Hello from the knowledge base', similarity: 0.92 },
      ];
      mockPrismaService.$queryRaw.mockResolvedValue(mockChunks);

      const result = await service.searchRelevantChunks('tenant-abc', valid768Vector);

      expect(result).toEqual(mockChunks);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when query vector has wrong dimension (1536 instead of 768)', async () => {
      await expect(
        service.searchRelevantChunks('tenant-abc', invalid1536Vector)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.searchRelevantChunks('tenant-abc', invalid1536Vector)
      ).rejects.toThrow(/Query vector dimension mismatch: expected 768, got 1536/);

      // Must NOT reach PostgreSQL when dimension is wrong
      expect(mockPrismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it('should accept string-form query vectors (pre-formatted) without dimension check', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      // String form bypasses dimension check (caller is responsible for correctness)
      await expect(
        service.searchRelevantChunks('tenant-abc', '[0.1,0.2,0.3]')
      ).resolves.toEqual([]);
    });

    it('should throw BadRequestException if tenantId is empty', async () => {
      await expect(
        service.searchRelevantChunks('', valid768Vector)
      ).rejects.toThrow(BadRequestException);
    });
  });
});

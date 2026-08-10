import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiCacheService } from './ai-cache.service';

describe('AiService - Rolling Window & Summarization', () => {
  let service: AiService;
  let prisma: PrismaService;

  const mockPrisma = {
    conversation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    aiConfig: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockAiCacheService = {
    invalidateSupportCache: jest.fn(),
    computeChecksum: jest.fn(),
    getOrCreateCache: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiCacheService, useValue: mockAiCacheService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return full message list when messages count is <= 10', async () => {
    const mockMessages = Array.from({ length: 6 }, (_, i) => ({
      id: `msg-${i}`,
      content: { text: `Message ${i}` },
      senderType: i % 2 === 0 ? 'customer' : 'bot',
    }));

    mockPrisma.message.findMany.mockResolvedValue(mockMessages);

    const context = await service.buildOptimizedContext('conv-123');
    expect(context.length).toBe(6);
    expect(context[0].content).not.toContain('Summary of earlier conversation');
  });

  it('should trim to last 10 messages and inject summary when count > 10', async () => {
    const mockMessages = Array.from({ length: 20 }, (_, i) => ({
      id: `msg-${i}`,
      content: { text: `Message ${i}` },
      senderType: i % 2 === 0 ? 'customer' : 'bot',
    }));

    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-123',
      summary: 'User was looking for Wireless Headphones under 2500 BDT.',
    });
    mockPrisma.message.findMany.mockResolvedValue(mockMessages.slice(-10));

    const context = await service.buildOptimizedContext('conv-123');
    
    // Should contain system summary + 10 recent messages
    expect(context[0].role).toBe('system');
    expect(context[0].content).toContain('User was looking for Wireless Headphones');
    expect(context.length).toBe(11); // 1 summary + 10 messages
  });
});

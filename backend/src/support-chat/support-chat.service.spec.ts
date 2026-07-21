import { Test, TestingModule } from '@nestjs/testing';
import { SupportChatService } from './support-chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

describe('SupportChatService', () => {
  let service: SupportChatService;
  let prismaService: any;
  let aiService: any;

  beforeEach(async () => {
    prismaService = {
      supportConversation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conv-id', tenantId: 'tenant1', messages: [] }),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      supportMessage: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      aiConfig: {
        findFirst: jest.fn().mockResolvedValue({ apiKey: 'test', modelName: 'test-model', isSupportDefault: true }),
      },
      ticket: {
        create: jest.fn(),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'user-id' }),
      }
    };

    aiService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportChatService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AiService, useValue: aiService },
      ],
    }).compile();

    service = module.get<SupportChatService>(SupportChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Basic mocking structure for OpenAI is tricky since we instantiate it inside the method.
  // The fact that the module compiles and the service is defined is a good start.
  // Deeper tests would require jest.mock('openai').
});

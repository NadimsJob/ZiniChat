import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from './orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { InboxService } from '../inbox/inbox.service';
import { BillingService } from '../billing/billing.service';

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let prismaService: any;
  let aiService: any;
  let inboxService: any;
  let billingService: any;

  beforeEach(async () => {
    prismaService = {
      message: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      aiAssistant: {
        findFirst: jest.fn(),
      },
      aiUsageLog: {
        aggregate: jest.fn().mockResolvedValue({ _count: 0 }),
        create: jest.fn(),
      },
      conversation: {
        findUnique: jest.fn().mockResolvedValue({
          tenantId: 'tenant1',
          contact: { name: 'John Doe', stage: { name: 'Lead' } },
          tenant: { businessName: 'Test Business' }
        }),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    aiService = {
      generateCompletion: jest.fn().mockResolvedValue('Hello from AI'),
    };

    inboxService = {
      saveOutboundMessage: jest.fn(),
    };

    billingService = {
      getTenantQuotas: jest.fn().mockResolvedValue({ aiQuota: 1000, messageQuota: 5000 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AiService, useValue: aiService },
        { provide: InboxService, useValue: inboxService },
        { provide: BillingService, useValue: billingService },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
  });

  it('should ignore non-inbound messages', async () => {
    prismaService.message.findUnique.mockResolvedValue({ direction: 'outbound', type: 'text' });
    await service.processMessage('msg1');
    expect(prismaService.aiAssistant.findFirst).not.toHaveBeenCalled();
  });

  it('should ignore if AI is disabled', async () => {
    prismaService.message.findUnique.mockResolvedValue({
      id: 'msg1', direction: 'inbound', type: 'text', content: 'hello',
      conversation: { tenantId: 't1', conversationId: 'c1' }
    });
    prismaService.aiAssistant.findFirst.mockResolvedValue({ isActive: false });
    
    await service.processMessage('msg1');
    expect(aiService.generateCompletion).not.toHaveBeenCalled();
  });

  it('should abort if AI quota is exceeded', async () => {
    prismaService.message.findUnique.mockResolvedValue({
      id: 'msg1', direction: 'inbound', type: 'text', content: 'hello',
      conversation: { tenantId: 't1', conversationId: 'c1' }
    });
    prismaService.aiAssistant.findFirst.mockResolvedValue({ isActive: true, routingMode: 'ai_first' });
    billingService.getTenantQuotas.mockResolvedValue({ aiQuota: 10, messageQuota: 5000 });
    prismaService.aiUsageLog.aggregate.mockResolvedValue({ _count: 15 }); // Used 15, Limit 10

    await service.processMessage('msg1');
    expect(aiService.generateCompletion).not.toHaveBeenCalled();
  });

  it('should orchestrate successfully', async () => {
    prismaService.message.findUnique.mockResolvedValue({
      id: 'msg1', direction: 'inbound', type: 'text', content: { text: 'hello' },
      conversationId: 'c1',
      conversation: { tenantId: 't1', id: 'c1' }
    });
    prismaService.aiAssistant.findFirst.mockResolvedValue({ 
      id: 'ai1', isActive: true, routingMode: 'ai_first', systemPrompt: 'Be nice'
    });

    await service.processMessage('msg1');

    expect(aiService.generateCompletion).toHaveBeenCalled();
    expect(inboxService.saveOutboundMessage).toHaveBeenCalledWith(
      't1', 'c1', 'Hello from AI', 'text'
    );
    expect(prismaService.aiUsageLog.create).toHaveBeenCalled();
  });
});

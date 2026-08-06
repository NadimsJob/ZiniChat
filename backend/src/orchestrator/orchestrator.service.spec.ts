import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from './orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { InboxService } from '../inbox/inbox.service';
import { BillingService } from '../billing/billing.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QuotaService } from '../tenants/quota.service';
import { ActivityLogService } from '../inbox/activity-log.service';
import { InboxGateway } from '../inbox/inbox.gateway';
import { AiCacheService } from '../ai/ai-cache.service';

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let prismaService: any;
  let aiService: any;
  let inboxService: any;
  let billingService: any;
  let ordersService: any;
  let notificationsService: any;
  let quotaService: any;
  let activityLogService: any;
  let inboxGateway: any;

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
      aiConfig: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ provider: 'gemini', modelName: 'gemini-1.5-flash' })
      },
      aiUsageLog: {
        aggregate: jest.fn().mockResolvedValue({ _count: 0 }),
        create: jest.fn(),
        createMany: jest.fn(),
      },
      conversation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          tenantId: 'tenant1',
          contactId: 'contact1',
          contact: { name: 'John Doe', stage: { name: 'Lead' } },
          tenant: { businessName: 'Test Business' }
        }),
        update: jest.fn().mockResolvedValue({ id: 'c1', tenantId: 'tenant1' }),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      order: {
        update: jest.fn().mockResolvedValue({ id: 'ord1' }),
      },
      qnAKnowledgeBase: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      knowledgeDocument: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      websiteWidget: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      label: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      conversationLabel: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant1', businessNature: 'E-commerce' }),
      },
      businessNature: {
        findFirst: jest.fn().mockResolvedValue({ id: 'bn1', name: 'E-commerce', isPropertyMode: false }),
      }
    };

    aiService = {
      isVisionSupported: jest.fn().mockReturnValue(true),
      generateCompletion: jest.fn().mockResolvedValue(JSON.stringify({
        replyText: 'Hello from AI',
        intent: 'general',
        supportSignal: false
      })),
    };

    inboxService = {
      saveOutboundMessage: jest.fn(),
    };

    billingService = {
      getTenantQuotas: jest.fn().mockResolvedValue({ aiQuota: 1000, messageQuota: 5000 }),
    };

    ordersService = {
      createOrder: jest.fn().mockResolvedValue({ id: 'ord12345678', totalAmount: 1200 }),
    };

    notificationsService = {
      createNotificationForTenantAdmins: jest.fn().mockResolvedValue(true),
    };

    quotaService = {
      checkFeature: jest.fn().mockResolvedValue(true),
    };

    activityLogService = {
      record: jest.fn().mockResolvedValue(true),
    };

    inboxGateway = {
      broadcastToTenant: jest.fn(),
    };

    const aiCacheService = {
      computeChecksum: jest.fn().mockReturnValue('checksum123'),
      getOrCreateCache: jest.fn().mockResolvedValue({ isCached: false, cacheKey: null }),
      invalidateCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AiService, useValue: aiService },
        { provide: AiCacheService, useValue: aiCacheService },
        { provide: InboxService, useValue: inboxService },
        { provide: BillingService, useValue: billingService },
        { provide: OrdersService, useValue: ordersService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: QuotaService, useValue: quotaService },
        { provide: ActivityLogService, useValue: activityLogService },
        { provide: InboxGateway, useValue: inboxGateway },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
  });

  it('should ignore non-inbound messages', async () => {
    prismaService.message.findUnique.mockResolvedValue({ direction: 'outbound', type: 'text' });
    await service.processMessage('msg1');
    expect(prismaService.aiAssistant.findFirst).not.toHaveBeenCalled();
  });

  it('should ignore if AI is disabled globally', async () => {
    prismaService.message.findUnique.mockResolvedValue({
      id: 'msg1', direction: 'inbound', type: 'text', content: 'hello',
      conversation: { tenantId: 't1', conversationId: 'c1' }
    });
    prismaService.aiAssistant.findFirst.mockResolvedValue({ tenantId: 't1', isActive: false });
    
    await service.processMessage('msg1');
    expect(aiService.generateCompletion).not.toHaveBeenCalled();
  });

  it('should fallback gracefully to raw text reply if structured JSON parsing fails', async () => {
    prismaService.message.findUnique.mockResolvedValue({
      id: 'msg1', direction: 'inbound', type: 'text', content: { text: 'hello' },
      conversationId: 'c1',
      conversation: { 
        tenantId: 't1', id: 'c1',
        channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true }
      }
    });
    prismaService.aiAssistant.findFirst.mockResolvedValue({ 
      id: 'ai1', tenantId: 't1', isActive: true, routingMode: 'ai_first', systemPrompt: 'Be nice', tools: []
    });

    aiService.generateCompletion.mockResolvedValue('Plain text response without JSON');

    await service.processMessage('msg1');

    expect(inboxService.saveOutboundMessage).toHaveBeenCalledWith(
      't1', 'c1', 'Plain text response without JSON', 'text', undefined, 'ai1'
    );
  });

  it('should charge only 1 credit if image_reading tool is disabled, even for vision models', async () => {
    prismaService.message.findUnique.mockResolvedValue({
      id: 'msg_img', direction: 'inbound', type: 'image', content: { caption: 'Product photo' },
      conversationId: 'c1',
      conversation: { 
        tenantId: 't1', id: 'c1',
        channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true }
      }
    });
    prismaService.aiAssistant.findFirst.mockResolvedValue({ 
      id: 'ai1', tenantId: 't1', isActive: true, routingMode: 'ai_first', systemPrompt: 'Be nice',
      tools: [{ toolType: 'image_reading', isEnabled: false }]
    });

    await service.processMessage('msg_img');

    expect(prismaService.aiUsageLog.createMany).toHaveBeenCalled();
    const callArg = prismaService.aiUsageLog.createMany.mock.calls[0][0];
    expect(callArg.data.length).toBe(1); // 1 credit charged because image_reading is OFF
  });

  it('should process support detection and flag conversation for follow-up', async () => {
    prismaService.message.findUnique.mockResolvedValue({
      id: 'msg_sup', direction: 'inbound', type: 'text', content: 'I need refund for broken item',
      conversationId: 'c1',
      conversation: { 
        tenantId: 't1', id: 'c1', contactId: 'cnt1', contact: { name: 'Alice' },
        channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true }
      }
    });
    prismaService.aiAssistant.findFirst.mockResolvedValue({ 
      id: 'ai1', tenantId: 't1', isActive: true, routingMode: 'ai_first',
      tools: [{ toolType: 'support_detection', isEnabled: true }]
    });

    aiService.generateCompletion.mockResolvedValue(JSON.stringify({
      replyText: 'Connecting you with support team.',
      intent: 'support_needed',
      supportSignal: true,
      supportReason: 'refund_return'
    }));

    await service.processMessage('msg_sup');

    expect(prismaService.conversation.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { requiresFollowUp: true }
    });
    expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({
      type: 'AI_HANDOVER',
      metadataJson: { reason: 'refund_return' }
    }));
    expect(notificationsService.createNotificationForTenantAdmins).toHaveBeenCalled();
  });

  it('should enforce strict cross-tenant isolation and throw on cross-tenant security violation', () => {
    expect(() => {
      (service as any).assertBelongsToTenant({ tenantId: 'tenantA' }, 'tenantB', 'TestModel');
    }).toThrow('Security Violation');
  });

  describe('Anti-Hallucination & Safety Features', () => {
    it('should require explicit hard confirmation for order placement when soft consent is given', async () => {
      const mockConv = {
        id: 'c1', tenantId: 't1', contactId: 'cnt1',
        pendingOrderProposal: {
          items: [{ productId: 'p1', quantity: 1, priceAtTime: 500 }],
          expiresAt: new Date(Date.now() + 100000).toISOString()
        }
      };

      const result = await (service as any).handleOrderPlacement(
        't1', mockConv, { replyText: 'Sure', intent: 'order_confirmation' }, 'c1', 'okay'
      );

      expect(result).toEqual({
        overrideReplyText: expect.stringContaining("CONFIRM")
      });
      expect(ordersService.createOrder).not.toHaveBeenCalled();
    });

    it('should create order when explicit hard confirmation keyword is provided', async () => {
      const mockConv = {
        id: 'c1', tenantId: 't1', contactId: 'cnt1',
        pendingOrderProposal: {
          items: [{ productId: 'p1', quantity: 1, priceAtTime: 500 }],
          expiresAt: new Date(Date.now() + 100000).toISOString()
        }
      };

      prismaService.product.findFirst.mockResolvedValue({ id: 'p1', tenantId: 't1', price: 500, isActive: true });

      const result = await (service as any).handleOrderPlacement(
        't1', mockConv, { replyText: 'CONFIRM', intent: 'order_confirmation' }, 'c1', 'CONFIRM ORDER'
      );

      expect(ordersService.createOrder).toHaveBeenCalled();
      expect(result.overrideReplyText).toContain('অর্ডারটি নিশ্চিত করা হয়েছে');
    });

    it('should send clarifying question for moderate confidence product matches (0.60 - 0.79)', async () => {
      prismaService.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Wireless Headphones Black', price: 2500, imageUrl: '/img.jpg', isActive: true }
      ]);

      await (service as any).handleProductMatching('t1', 'c1', {
        replyText: 'Looking for Headphones',
        intent: 'product_lookup',
        imageProductDescription: 'Wireless Headphones Earbuds'
      }, 0.8);

      expect(inboxService.saveOutboundMessage).toHaveBeenCalledWith(
        't1', 'c1', expect.stringContaining("প্রোডাক্টটি খুঁজছেন")
      );
    });

    it('should filter out knowledge documents older than 60 days in buildContextPrompt', async () => {
      const oldDate = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000); // 70 days ago
      prismaService.qnAKnowledgeBase = { findMany: jest.fn().mockResolvedValue([]) };
      prismaService.knowledgeDocument = { findMany: jest.fn().mockResolvedValue([]) };

      const prompt = await (service as any).buildContextPrompt('c1', { systemPrompt: 'System' });

      expect(prismaService.knowledgeDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            uploadedAt: expect.objectContaining({
              gte: expect.any(Date)
            })
          })
        })
      );
      expect(prompt).toContain('MANDATORY ANTI-HALLUCINATION GUARDRAILS');
    });

    it('should handle property inquiry by creating ContactNote and moving stage to Intake in Property Mode', async () => {
      prismaService.kanbanStage = {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage_intake', name: 'Intake' }),
        create: jest.fn()
      };
      prismaService.contact = {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact1', name: 'Buyer', stageId: null }),
        update: jest.fn().mockResolvedValue({})
      };
      prismaService.contactNote = {
        create: jest.fn().mockResolvedValue({})
      };

      await (service as any).handlePropertyInquiry('t1', { contactId: 'contact1', tenantId: 't1' }, 'c1', '3 BHK Apartment', 'I want to visit this property');

      expect(prismaService.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact1' },
        data: { stageId: 'stage_intake' }
      });
      expect(prismaService.contactNote.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact1',
          content: expect.stringContaining('3 BHK Apartment')
        }
      });
    });
  });
});

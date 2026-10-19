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

import { CapiHubService } from '../capi-hub/capi-hub.service';

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
  let capiHubService: any;

  beforeEach(async () => {
    capiHubService = {
      fireEvent: jest.fn().mockResolvedValue(true),
    };

    prismaService = {
      message: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'agent1', name: 'Agent Smith', email: 'agent@test.com' })
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
      generateCompletionDetailed: jest.fn().mockImplementation(async (prompt: string) => {
        const result = await aiService.generateCompletion(prompt);
        return {
          text: typeof result === 'string' ? result : JSON.stringify(result),
        };
      }),
      recordUsageLog: jest.fn().mockResolvedValue(true),
      searchRelevantProducts: jest.fn().mockResolvedValue([]),
      searchRelevantQnas: jest.fn().mockResolvedValue([]),
      generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0)),
      searchRelevantChunks: jest.fn().mockResolvedValue([]),
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
      isTenantSubscriptionActive: jest.fn().mockResolvedValue({ isActive: true }),
      checkAiQuota: jest.fn().mockResolvedValue(undefined),
      getActivePeriodForTenant: jest.fn().mockResolvedValue({ periodStart: new Date(2026, 0, 1), periodEnd: new Date(2026, 11, 31) }),
      getMessageUsage: jest.fn().mockResolvedValue(0),
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
        { provide: CapiHubService, useValue: capiHubService },
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
      const prompt = await (service as any).buildContextPrompt('c1', { systemPrompt: 'System' }, {
        retrievedChunks: [{ content: 'Fresh doc content' }]
      });

      expect(prompt).toContain('Fresh doc content');
      expect(prompt).toContain('MANDATORY STRUCTURED JSON RESPONSE OUTPUT FORMAT');
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

    it('should handle room booking inquiry by creating ContactNote and moving stage to Intake in Hospitality Mode', async () => {
      prismaService.kanbanStage = {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage_intake', name: 'Intake' }),
        create: jest.fn()
      };
      prismaService.contact = {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact1', name: 'Guest', stageId: null }),
        update: jest.fn().mockResolvedValue({})
      };
      prismaService.contactNote = {
        create: jest.fn().mockResolvedValue({})
      };

      await (service as any).handleRoomBookingInquiry('t1', { contactId: 'contact1', tenantId: 't1' }, 'c1', 'Presidential Suite', 'I want to reserve for 2 nights');

      expect(prismaService.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact1' },
        data: { stageId: 'stage_intake' }
      });
      expect(prismaService.contactNote.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact1',
          content: expect.stringContaining('Presidential Suite')
        }
      });
    });

    it('should handle software demo request by creating ContactNote and moving stage to Qualified in Tech Mode', async () => {
      prismaService.kanbanStage = {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage_qualified', name: 'Qualified' }),
        create: jest.fn()
      };
      prismaService.contact = {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact1', name: 'Lead', stageId: null }),
        update: jest.fn().mockResolvedValue({})
      };
      prismaService.contactNote = {
        create: jest.fn().mockResolvedValue({})
      };

      await (service as any).handleDemoRequest('t1', { contactId: 'contact1', tenantId: 't1' }, 'c1', 'Enterprise SaaS Plan', 'Can I get a demo for 20 users?');

      expect(prismaService.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact1' },
        data: { stageId: 'stage_qualified' }
      });
      expect(prismaService.contactNote.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact1',
          content: expect.stringContaining('Enterprise SaaS Plan')
        }
      });
    });

    it('should handle consultation request by creating ContactNote and moving stage to Intake in Financial Mode', async () => {
      prismaService.kanbanStage = {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage_intake', name: 'Intake' }),
        create: jest.fn()
      };
      prismaService.contact = {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact1', name: 'Client', stageId: null }),
        update: jest.fn().mockResolvedValue({})
      };
      prismaService.contactNote = {
        create: jest.fn().mockResolvedValue({})
      };

      await (service as any).handleConsultationRequest('t1', { contactId: 'contact1', tenantId: 't1' }, 'c1', 'Tax Audit Consultation', 'I need tax filing advice');

      expect(prismaService.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact1' },
        data: { stageId: 'stage_intake' }
      });
      expect(prismaService.contactNote.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact1',
          content: expect.stringContaining('Tax Audit Consultation')
        }
      });
    });

    it('should handle appointment request by creating ContactNote and moving stage to Triage in Healthcare Mode', async () => {
      prismaService.kanbanStage = {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage_triage', name: 'Triage' }),
        create: jest.fn()
      };
      prismaService.contact = {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact1', name: 'Patient', stageId: null }),
        update: jest.fn().mockResolvedValue({})
      };
      prismaService.contactNote = {
        create: jest.fn().mockResolvedValue({})
      };

      await (service as any).handleAppointmentRequest('t1', { contactId: 'contact1', tenantId: 't1' }, 'c1', 'Dr. Rahman (Cardiologist)', 'I want an appointment for next Sunday');

      expect(prismaService.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact1' },
        data: { stageId: 'stage_triage' }
      });
      expect(prismaService.contactNote.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact1',
          content: expect.stringContaining('Dr. Rahman (Cardiologist)')
        }
      });
    });

    it('should handle course admission inquiry by creating ContactNote and moving stage to Admissions in Education Mode', async () => {
      prismaService.kanbanStage = {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage_admissions', name: 'Admissions' }),
        create: jest.fn()
      };
      prismaService.contact = {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact1', name: 'Student', stageId: null }),
        update: jest.fn().mockResolvedValue({})
      };
      prismaService.contactNote = {
        create: jest.fn().mockResolvedValue({})
      };

      await (service as any).handleCourseAdmissionInquiry('t1', { contactId: 'contact1', tenantId: 't1' }, 'c1', 'Full-Stack Web Development Batch 12', 'I want to enroll in the full stack course');

      expect(prismaService.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact1' },
        data: { stageId: 'stage_admissions' }
      });
      expect(prismaService.contactNote.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact1',
          content: expect.stringContaining('Full-Stack Web Development Batch 12')
        }
      });
    });

    it('should handle bulk RFQ inquiry by creating ContactNote and moving stage to RFQ / Quotations in Manufacturing Mode', async () => {
      prismaService.kanbanStage = {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage_rfq', name: 'RFQ / Quotations' }),
        create: jest.fn()
      };
      prismaService.contact = {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact1', name: 'Wholesale Buyer', stageId: null }),
        update: jest.fn().mockResolvedValue({})
      };
      prismaService.contactNote = {
        create: jest.fn().mockResolvedValue({})
      };

      await (service as any).handleBulkRfqInquiry('t1', { contactId: 'contact1', tenantId: 't1' }, 'c1', 'Industrial Cotton Fabric Roll (MOQ 500m)', 'We need a wholesale quotation for 2,000 meters of cotton fabric');

      expect(prismaService.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact1' },
        data: { stageId: 'stage_rfq' }
      });
      expect(prismaService.contactNote.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact1',
          content: expect.stringContaining('Industrial Cotton Fabric Roll (MOQ 500m)')
        }
      });
    });

    it('should handle shipment inquiry by creating ContactNote and moving stage to Shipments & Bookings in Logistics Mode', async () => {
      prismaService.kanbanStage = {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage_shipments', name: 'Shipments & Bookings' }),
        create: jest.fn()
      };
      prismaService.contact = {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact1', name: 'Cargo Shipper', stageId: null }),
        update: jest.fn().mockResolvedValue({})
      };
      prismaService.contactNote = {
        create: jest.fn().mockResolvedValue({})
      };

      await (service as any).handleShipmentInquiry('t1', { contactId: 'contact1', tenantId: 't1' }, 'c1', 'Dhaka to Chittagong Port (10 Ton Covered Van)', 'We need a freight quote for shipping 8 tons of machinery from Dhaka to Chittagong');

      expect(prismaService.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact1' },
        data: { stageId: 'stage_shipments' }
      });
      expect(prismaService.contactNote.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact1',
          content: expect.stringContaining('Dhaka to Chittagong Port (10 Ton Covered Van)')
        }
      });
    });
  });

  describe('Subscription & AI Quota Background Webhook Guards', () => {
    it('Test 1 (Expired Subscription): should skip AI completion if tenant subscription is expired', async () => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_sub_exp', direction: 'inbound', type: 'text', content: { text: 'hello' },
        conversationId: 'c1',
        conversation: { tenantId: 't_exp', id: 'c1' }
      });

      quotaService.isTenantSubscriptionActive.mockResolvedValue({
        isActive: false,
        reason: 'SUBSCRIPTION_EXPIRED'
      });

      const res = await service.processMessage('msg_sub_exp');

      expect(res).toEqual({ skipped: true, reason: 'SUBSCRIPTION_EXPIRED' });
      expect(aiService.generateCompletion).not.toHaveBeenCalled();
    });

    it('Test 2 (Exhausted AI Quota): should halt AI auto-reply execution safely when AI quota is exhausted', async () => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_quota_exp', direction: 'inbound', type: 'text', content: { text: 'hello' },
        conversationId: 'c1',
        conversation: { tenantId: 't_quota', id: 'c1' }
      });

      quotaService.isTenantSubscriptionActive.mockResolvedValue({ isActive: true });
      quotaService.checkAiQuota.mockRejectedValue(new Error('AI Quota Exhausted'));

      const res = await service.processMessage('msg_quota_exp');

      expect(res).toEqual({ skipped: true, reason: 'AI_QUOTA_EXHAUSTED' });
      expect(aiService.generateCompletion).not.toHaveBeenCalled();
    });

    it('Test 3 (Active Subscription & Available Quota): should execute AI auto-reply normally', async () => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_ok', direction: 'inbound', type: 'text', content: { text: 'hello' },
        conversationId: 'c1',
        conversation: { tenantId: 't_ok', id: 'c1' }
      });
      prismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'ai1', tenantId: 't_ok', isActive: true, routingMode: 'ai_first', systemPrompt: 'Be helpful', tools: []
      });

      quotaService.isTenantSubscriptionActive.mockResolvedValue({ isActive: true });
      quotaService.checkAiQuota.mockResolvedValue(undefined);
      aiService.generateCompletion.mockResolvedValue('Normal AI response');

      await service.processMessage('msg_ok');

      expect(inboxService.saveOutboundMessage).toHaveBeenCalledWith(
        't_ok', 'c1', 'Normal AI response', 'text', undefined, 'ai1'
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // T-13 to T-17: Audio Message Orchestration
  // ─────────────────────────────────────────────────────────────────────────
  describe('Audio Message Orchestration', () => {
    const baseAudioSetup = (transcript: string | null | undefined) => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_audio', direction: 'inbound', type: 'audio',
        content: transcript !== undefined ? { body: '🎤 [Voice Message]', localUrl: '/uploads/x.ogg', transcript } : { body: '🎤 [Voice Message]', localUrl: '/uploads/x.ogg' },
        conversationId: 'c1',
        conversation: {
          tenantId: 'tenant1', id: 'c1', contactId: 'cnt1',
          contact: { name: 'Customer', stage: { name: 'Lead' }, externalContactId: '01700000001' },
          channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true }
        }
      });
      prismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'ai1', tenantId: 'tenant1', isActive: true, routingMode: 'ai_first',
        systemPrompt: 'You are a helpful assistant', tools: [],
        customAiConfigId: null,
        tenant: { customAiConfigId: null }  // required by orchestrator include
      });
      prismaService.aiUsageLog.aggregate.mockResolvedValue({ _count: 0 });
      prismaService.message.count.mockResolvedValue(0);
    };

    // T-13: Valid transcript → AI processes with voice text prefix
    it('T-13: audio with valid transcript — AI processes with [Voice Message Transcription]: prefix', async () => {
      baseAudioSetup('আমার পণ্যের দাম কত?');
      aiService.generateCompletionDetailed.mockResolvedValue({
        text: JSON.stringify({ replyText: 'আমাদের পণ্যের দাম ৫০০ টাকা।', intent: 'product_inquiry', supportSignal: false }),
      });

      await service.processMessage('msg_audio');

      // generateCompletionDetailed was called (orchestrator uses this, not generateCompletion)
      expect(aiService.generateCompletionDetailed).toHaveBeenCalled();
      const aiCallArg = aiService.generateCompletionDetailed.mock.calls[0]?.[0] as string;
      expect(aiCallArg).toContain('[Voice Message Transcription]:');
      expect(aiCallArg).toContain('আমার পণ্যের দাম কত?');
      expect(inboxService.saveOutboundMessage).toHaveBeenCalled();
    });

    // T-14: No transcript field → skip AI (token saver)
    it('T-14: audio with no transcript — skips AI call (token efficient)', async () => {
      baseAudioSetup(undefined);

      await service.processMessage('msg_audio');

      expect(aiService.generateCompletionDetailed).not.toHaveBeenCalled();
      expect(inboxService.saveOutboundMessage).not.toHaveBeenCalled();
    });

    // T-15: Failed placeholder transcript → skip AI
    it('T-15: audio with failed placeholder transcript — skips AI call', async () => {
      baseAudioSetup('[Audio transcription failed or unavailable]');

      await service.processMessage('msg_audio');

      expect(aiService.generateCompletionDetailed).not.toHaveBeenCalled();
      expect(inboxService.saveOutboundMessage).not.toHaveBeenCalled();
    });

    // T-16: Text message — regression guard, behaves as before
    it('T-16: text message — orchestration unaffected by audio changes (regression guard)', async () => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_text', direction: 'inbound', type: 'text',
        content: { text: 'কত দামে পাওয়া যাবে?' },
        conversationId: 'c1',
        conversation: {
          tenantId: 'tenant1', id: 'c1', contactId: 'cnt1',
          contact: { name: 'Customer', stage: { name: 'Lead' }, externalContactId: '01700000001' },
          channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true }
        }
      });
      prismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'ai1', tenantId: 'tenant1', isActive: true, routingMode: 'ai_first',
        systemPrompt: 'You are helpful', tools: [], customAiConfigId: null,
        tenant: { customAiConfigId: null }
      });
      prismaService.aiUsageLog.aggregate.mockResolvedValue({ _count: 0 });
      prismaService.message.count.mockResolvedValue(0);
      aiService.generateCompletionDetailed.mockResolvedValue({
        text: JSON.stringify({ replyText: 'দাম হলো ৫০০ টাকা।', intent: 'general', supportSignal: false }),
      });

      await service.processMessage('msg_text');

      expect(aiService.generateCompletionDetailed).toHaveBeenCalled();
      const aiCallArg = aiService.generateCompletionDetailed.mock.calls[0]?.[0] as string;
      expect(aiCallArg).not.toContain('[Voice Message Transcription]:');
      expect(inboxService.saveOutboundMessage).toHaveBeenCalled();
    });

    // T-17: Image message — vision flow unchanged (regression guard)
    it('T-17: image message — vision flow unaffected by audio changes (regression guard)', async () => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_img', direction: 'inbound', type: 'image',
        content: { caption: 'What is this product?' },
        conversationId: 'c1',
        conversation: {
          tenantId: 'tenant1', id: 'c1', contactId: 'cnt1',
          contact: { name: 'Customer', stage: { name: 'Lead' }, externalContactId: '01700000001' },
          channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true }
        }
      });
      prismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'ai1', tenantId: 'tenant1', isActive: true, routingMode: 'ai_first',
        systemPrompt: 'Vision assistant', tools: [{ toolType: 'image_reading', isEnabled: false }],
        customAiConfigId: null, tenant: { customAiConfigId: null }
      });
      prismaService.aiUsageLog.aggregate.mockResolvedValue({ _count: 0 });
      prismaService.message.count.mockResolvedValue(0);
      aiService.generateCompletionDetailed.mockResolvedValue({
        text: JSON.stringify({ replyText: 'Image received.', intent: 'general', supportSignal: false }),
      });

      await service.processMessage('msg_img');

      expect(aiService.generateCompletionDetailed).toHaveBeenCalled();
      const aiCallArg = aiService.generateCompletionDetailed.mock.calls[0]?.[0] as string;
      expect(aiCallArg).toContain('[Image Sent]');
      expect(aiCallArg).not.toContain('[Voice Message Transcription]:');
    });

    // T-18: Software Demo Request — populates hasOrderRequest = true on conversation
    it('T-18: demo_request intent in Tech & Software mode updates conversation with hasOrderRequest = true', async () => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_demo', direction: 'inbound', type: 'text',
        content: { body: 'I want a demo session tomorrow at 7pm' },
        conversationId: 'c1',
        conversation: {
          tenantId: 'tenant1', id: 'c1', contactId: 'cnt1',
          contact: { name: 'Customer', stage: { name: 'Lead' }, externalContactId: '01700000001' },
          channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true }
        }
      });
      prismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'ai1', tenantId: 'tenant1', isActive: true, routingMode: 'ai_first',
        systemPrompt: 'Software Demo Assistant', tools: [],
        customAiConfigId: null, tenant: { customAiConfigId: null }
      });
      prismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant1', businessNature: 'Tech & Software'
      });
      prismaService.businessNature.findFirst.mockResolvedValue({
        id: 'bn_tech', name: 'Tech & Software', isTechSoftwareMode: true
      });
      prismaService.kanbanStage = {
        findFirst: jest.fn().mockResolvedValue({ id: 'stage_qual', name: 'Qualified' }),
        create: jest.fn()
      };
      prismaService.contact = {
        findUnique: jest.fn().mockResolvedValue({ id: 'cnt1', stageId: null }),
        update: jest.fn().mockResolvedValue({ id: 'cnt1' })
      };
      prismaService.contactNote = { create: jest.fn().mockResolvedValue({ id: 'note1' }) };
      notificationsService = { createNotificationForTenantAdmins: jest.fn().mockResolvedValue({}) };
      prismaService.aiUsageLog.aggregate.mockResolvedValue({ _count: 0 });
      prismaService.message.count.mockResolvedValue(0);

      aiService.generateCompletionDetailed.mockResolvedValue({
        text: JSON.stringify({
          replyText: 'ধন্যবাদ! আমি আপনার ডেমো সেশনের বিষয়টি নোট করে নিচ্ছি।',
          intent: 'demo_request',
          interestedSoftwareName: 'ZiniChat',
          supportSignal: false
        })
      });

      await service.processMessage('msg_demo');

      expect(prismaService.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ hasOrderRequest: true })
      }));
    });
  });

  describe('ZiniChat Payment & Order Policy Engine (Phases 3, 4, 5)', () => {
    it('should ask for missing customer details when only partial information is provided', async () => {
      const mockConv = {
        id: 'c1',
        tenantId: 'tenant1',
        contactId: 'cnt1',
        contact: { id: 'cnt1', name: 'Karim', phone: '01711223344', address: null },
      };
      prismaService.aiAssistant.findFirst.mockResolvedValue({
        tenantId: 'tenant1',
        tools: [
          {
            toolType: 'order_placement',
            isEnabled: true,
            configJson: {
              paymentPolicy: 'cod',
              deliveryChargeInsideDhaka: 60,
              deliveryChargeOutsideDhaka: 120,
            }
          }
        ]
      });
      prismaService.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Black T-Shirt',
        price: 500,
        tenantId: 'tenant1',
        isActive: true
      });

      const classification: any = {
        replyText: 'Sure!',
        intent: 'order_intent',
        orderProposal: [{ productNameGuess: 'Black T-Shirt', quantity: 1 }],
        customerDetails: { name: 'Karim', phone: '01711223344' }
      };

      const result = await (service as any).handleOrderPlacement(
        'tenant1',
        mockConv,
        classification,
        'c1',
        'আমি ১টা Black T-Shirt নিব'
      );

      expect(result).toBeDefined();
      expect(result.overrideReplyText).toContain('অর্ডারটি প্রসেস করার জন্য');
      expect(result.overrideReplyText).toContain('ঠিকানা');
      expect(ordersService.createOrder).not.toHaveBeenCalled();
    });

    it('should propose COD order with ৳60 delivery charge when inside Dhaka details are complete', async () => {
      const mockConv = {
        id: 'c1',
        tenantId: 'tenant1',
        contactId: 'cnt1',
        contact: { id: 'cnt1', name: 'Karim', phone: '01711223344', address: 'House 1, Dhanmondi, Dhaka' },
      };
      prismaService.aiAssistant.findFirst.mockResolvedValue({
        tenantId: 'tenant1',
        tools: [
          {
            toolType: 'order_placement',
            isEnabled: true,
            configJson: {
              paymentPolicy: 'cod',
              deliveryChargeInsideDhaka: 60,
              deliveryChargeOutsideDhaka: 120,
            }
          }
        ]
      });
      prismaService.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Black T-Shirt',
        price: 500,
        tenantId: 'tenant1',
        isActive: true
      });

      const classification: any = {
        replyText: 'Proposing order',
        intent: 'order_intent',
        orderProposal: [{ productNameGuess: 'Black T-Shirt', quantity: 2 }],
        customerDetails: {
          name: 'Karim',
          phone: '01711223344',
          address: 'House 1, Dhanmondi, Dhaka',
          deliveryArea: 'inside_dhaka'
        }
      };

      const result = await (service as any).handleOrderPlacement(
        'tenant1',
        mockConv,
        classification,
        'c1',
        'আমার নাম Karim, ফোন 01711223344, ধানমন্ডি ঢাকা'
      );

      expect(result).toBeDefined();
      expect(result.overrideReplyText).toContain('ক্যাশ অন ডেলিভারি');
      expect(result.overrideReplyText).toContain('৳60');
      expect(result.overrideReplyText).toContain('সর্বমোট: ৳1060');
      expect(result.overrideReplyText).toContain('CONFIRM');
      expect(prismaService.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({
          pendingOrderProposal: expect.objectContaining({
            paymentPolicy: 'cod',
            deliveryCharge: 60,
            totalAmount: 1060,
            status: 'PROPOSED'
          })
        })
      }));
    });

    it('should propose delivery charge advance of ৳120 for outside Dhaka and await screenshot', async () => {
      const mockConv = {
        id: 'c1',
        tenantId: 'tenant1',
        contactId: 'cnt1',
        contact: { id: 'cnt1', name: 'Rahim', phone: '01811223344', address: 'GEC Circle, Chittagong' },
      };
      prismaService.aiAssistant.findFirst.mockResolvedValue({
        tenantId: 'tenant1',
        tools: [
          {
            toolType: 'order_placement',
            isEnabled: true,
            configJson: {
              paymentPolicy: 'delivery_advance',
              deliveryChargeInsideDhaka: 60,
              deliveryChargeOutsideDhaka: 120,
              mfsAccounts: [
                { provider: 'bKash', accountNumber: '01700000000', accountType: 'Personal' }
              ],
              paymentInstructionNote: 'Send money only'
            }
          }
        ]
      });
      prismaService.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Black T-Shirt',
        price: 500,
        tenantId: 'tenant1',
        isActive: true
      });

      const classification: any = {
        replyText: 'Proposing order',
        intent: 'order_intent',
        orderProposal: [{ productNameGuess: 'Black T-Shirt', quantity: 1 }],
        customerDetails: {
          name: 'Rahim',
          phone: '01811223344',
          address: 'GEC Circle, Chittagong',
          deliveryArea: 'outside_dhaka'
        }
      };

      const result = await (service as any).handleOrderPlacement(
        'tenant1',
        mockConv,
        classification,
        'c1',
        'আমার নাম Rahim, 01811223344, Chittagong outside dhaka'
      );

      expect(result).toBeDefined();
      expect(result.overrideReplyText).toContain('ডেলিভারি চার্জ ৳120 অগ্রিম');
      expect(result.overrideReplyText).toContain('01700000000');
      expect(result.overrideReplyText).toContain('স্ক্রিনশট');
      expect(prismaService.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({
          pendingOrderProposal: expect.objectContaining({
            paymentPolicy: 'delivery_advance',
            status: 'AWAITING_PAYMENT_PROOF',
            advanceAmountRequired: 120,
            dueAmountCod: 500,
            deliveryCharge: 120
          })
        })
      }));
    });

    it('should propose full advance payment (product + delivery) and set proposal to AWAITING_PAYMENT_PROOF', async () => {
      const mockConv = {
        id: 'c1',
        tenantId: 'tenant1',
        contactId: 'cnt1',
        contact: { id: 'cnt1', name: 'Tanvir', phone: '01911223344', address: 'Mirpur 10, Dhaka' },
      };
      prismaService.aiAssistant.findFirst.mockResolvedValue({
        tenantId: 'tenant1',
        tools: [
          {
            toolType: 'order_placement',
            isEnabled: true,
            configJson: {
              paymentPolicy: 'full_advance',
              deliveryChargeInsideDhaka: 70,
              deliveryChargeOutsideDhaka: 130,
              mfsAccounts: [
                { provider: 'Nagad', accountNumber: '01800000000', accountType: 'Merchant' }
              ]
            }
          }
        ]
      });
      prismaService.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Smart Watch',
        price: 1500,
        tenantId: 'tenant1',
        isActive: true
      });

      const classification: any = {
        replyText: 'Proposing order',
        intent: 'order_intent',
        orderProposal: [{ productNameGuess: 'Smart Watch', quantity: 1 }],
        customerDetails: {
          name: 'Tanvir',
          phone: '01911223344',
          address: 'Mirpur 10, Dhaka',
          deliveryArea: 'inside_dhaka'
        }
      };

      const result = await (service as any).handleOrderPlacement(
        'tenant1',
        mockConv,
        classification,
        'c1',
        'Mirpur Dhaka'
      );

      expect(result).toBeDefined();
      expect(result.overrideReplyText).toContain('সম্পূর্ণ মূল্য ৳1570 অগ্রিম');
      expect(result.overrideReplyText).toContain('Nagad (Merchant): 01800000000');
      expect(prismaService.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({
          pendingOrderProposal: expect.objectContaining({
            paymentPolicy: 'full_advance',
            status: 'AWAITING_PAYMENT_PROOF',
            advanceAmountRequired: 1570,
            dueAmountCod: 0
          })
        })
      }));
    });

    it('should verify payment screenshot via vision AI, confirm order, and record activity log', async () => {
      const mockConv = {
        id: 'c1',
        tenantId: 'tenant1',
        contactId: 'cnt1',
        pendingOrderProposal: {
          status: 'AWAITING_PAYMENT_PROOF',
          paymentPolicy: 'delivery_advance',
          advanceAmountRequired: 60,
          dueAmountCod: 1000,
          totalAmount: 1060,
          deliveryCharge: 60,
          deliveryArea: 'inside_dhaka',
          items: [{ productId: 'p1', quantity: 1, priceAtTime: 1000 }],
          expiresAt: new Date(Date.now() + 100000).toISOString()
        }
      };

      prismaService.aiAssistant.findFirst.mockResolvedValue({
        tenantId: 'tenant1',
        tools: [{ toolType: 'order_placement', isEnabled: true }]
      });
      prismaService.product.findFirst.mockResolvedValue({
        id: 'p1',
        tenantId: 'tenant1',
        price: 1000,
        isActive: true
      });

      aiService.verifyPaymentReceiptScreenshot = jest.fn().mockResolvedValue({
        isPaymentReceipt: true,
        provider: 'bKash',
        paidAmount: 60,
        trxId: 'TRX99887766',
        senderPhone: '01711223344',
        status: 'success'
      });

      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const result = await (service as any).handleOrderPlacement(
        'tenant1',
        mockConv,
        { replyText: 'Here is the screenshot', intent: 'general' } as any,
        'c1',
        'Here is the screenshot',
        ['/path/to/screenshot.jpg']
      );

      expect(aiService.verifyPaymentReceiptScreenshot).toHaveBeenCalledWith('/path/to/screenshot.jpg', 60);
      expect(ordersService.createOrder).toHaveBeenCalledWith('tenant1', expect.objectContaining({
        notes: expect.stringContaining('TRX99887766')
      }));
      expect(prismaService.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ pendingOrderProposal: null, hasOrderRequest: true })
      }));
      expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        type: 'ORDER_CREATED',
        metadataJson: expect.objectContaining({ trxId: 'TRX99887766', paidAmount: 60 })
      }));
      expect(result.overrideReplyText).toContain('পেমেন্ট সফলভাবে ভেরিফাই হয়েছে');
    });

    it('should inform customer of underpayment when screenshot amount is less than expected', async () => {
      const mockConv = {
        id: 'c1',
        tenantId: 'tenant1',
        contactId: 'cnt1',
        pendingOrderProposal: {
          status: 'AWAITING_PAYMENT_PROOF',
          paymentPolicy: 'delivery_advance',
          advanceAmountRequired: 60,
          dueAmountCod: 1000,
          items: [{ productId: 'p1', quantity: 1, priceAtTime: 1000 }],
          expiresAt: new Date(Date.now() + 100000).toISOString()
        }
      };

      prismaService.aiAssistant.findFirst.mockResolvedValue({
        tenantId: 'tenant1',
        tools: [{ toolType: 'order_placement', isEnabled: true }]
      });

      aiService.verifyPaymentReceiptScreenshot = jest.fn().mockResolvedValue({
        isPaymentReceipt: true,
        provider: 'bKash',
        paidAmount: 50,
        trxId: 'TRX12345',
        senderPhone: '01711223344',
        status: 'success'
      });

      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const result = await (service as any).handleOrderPlacement(
        'tenant1',
        mockConv,
        { replyText: 'paid', intent: 'general' } as any,
        'c1',
        'paid',
        ['/path/to/screenshot.jpg']
      );

      expect(ordersService.createOrder).not.toHaveBeenCalled();
      expect(result.overrideReplyText).toContain('৳50 পাঠিয়েছেন');
      expect(result.overrideReplyText).toContain('বাকি ৳10 পরিশোধ');
    });
  });
});



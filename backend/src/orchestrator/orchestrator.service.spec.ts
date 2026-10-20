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

import * as path from 'path';
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
        findFirst: jest.fn().mockResolvedValue(null),
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
      contact: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      order: {
        update: jest.fn().mockResolvedValue({ id: 'ord1' }),
        findFirst: jest.fn().mockResolvedValue(null),
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
      verifyPaymentReceiptScreenshot: jest.fn().mockResolvedValue({
        isPaymentReceipt: true,
        status: 'verified',
        paidAmount: 120,
        provider: 'bKash',
        trxId: 'TRX123'
      }),
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

  describe('Quoted Message & Referenced Photo Product Resolution', () => {
    it('T-Q1: Explicit Quote — should augment RAG query and prepend quoted product context to userText', async () => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_quoted_1',
        direction: 'inbound',
        type: 'text',
        content: {
          text: 'এইটার দাম কত?',
          quotedMsg: {
            text: '📸 Premium Silk Panjabi — BDT 2,200',
            productId: 'prod_silk_1',
            productName: 'Premium Silk Panjabi',
            productPrice: 2200,
          },
        },
        conversationId: 'c1',
        conversation: {
          tenantId: 'tenant1',
          id: 'c1',
          channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true },
        },
      });

      prismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'ai1',
        tenantId: 'tenant1',
        isActive: true,
        routingMode: 'ai_first',
        systemPrompt: 'You are helpful assistant.',
        tools: [],
      });

      await service.processMessage('msg_quoted_1');

      // Verify that RAG product search was invoked with augmented query containing the quoted product text
      expect(aiService.searchRelevantProducts).toHaveBeenCalledWith(
        'tenant1',
        expect.stringContaining('📸 Premium Silk Panjabi — BDT 2,200'),
        expect.any(Number)
      );

      // Verify that generateCompletion was called with prompt containing the quoted context and customer reply
      expect(aiService.generateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('[Replying to Product/Message: "📸 Premium Silk Panjabi — BDT 2,200"]')
      );
    });

    it('T-Q2: Implicit Demonstrative Inquiry — should resolve recent outbound product photo when user asks without quoting', async () => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_demonstrative_1',
        direction: 'inbound',
        type: 'text',
        content: { text: 'এইটার দাম কত?' }, // No explicit quotedMsg
        conversationId: 'c1',
        conversation: {
          tenantId: 'tenant1',
          id: 'c1',
          channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true },
        },
      });

      // Mock recent outbound product image sent to this customer
      prismaService.message.findFirst.mockResolvedValue({
        id: 'outbound_img_1',
        conversationId: 'c1',
        direction: 'outbound',
        type: 'image',
        content: JSON.stringify({
          body: '📸 Smart Watch Ultra — BDT 3,500',
          productId: 'prod_watch_1',
          productName: 'Smart Watch Ultra',
          productPrice: 3500,
        }),
      });

      prismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'ai1',
        tenantId: 'tenant1',
        isActive: true,
        routingMode: 'ai_first',
        systemPrompt: 'You are helpful assistant.',
        tools: [],
      });

      await service.processMessage('msg_demonstrative_1');

      // Verify RAG search was augmented with the referenced photo title
      expect(aiService.searchRelevantProducts).toHaveBeenCalledWith(
        'tenant1',
        expect.stringContaining('Smart Watch Ultra'),
        expect.any(Number)
      );

      // Verify prompt contains Referenced Recent Product Photo directive
      expect(aiService.generateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('[Referenced Recent Product Photo: "📸 Smart Watch Ultra — BDT 3,500"]')
      );
    });

    it('T-Q3: Context History Formatting — correctly extracts body from stringified JSON image messages and displays quotes', async () => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_flow_1',
        direction: 'inbound',
        type: 'text',
        content: { text: 'সাইজ কি কি আছে?' },
        conversationId: 'c1',
        conversation: {
          tenantId: 'tenant1',
          id: 'c1',
          channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true },
        },
      });

      // Mock history with an outbound image message having stringified JSON content
      prismaService.message.findMany.mockResolvedValue([
        {
          id: 'hist_img_1',
          sender: 'assistant',
          direction: 'outbound',
          type: 'image',
          content: JSON.stringify({
            body: '📸 Casual Linen Shirt — BDT 1,200',
            mediaUrl: 'https://cdn.zinichat.com/shirt.jpg',
          }),
          createdAt: new Date('2026-10-20T00:00:00Z'),
        },
        {
          id: 'hist_inbound_1',
          sender: 'user',
          direction: 'inbound',
          type: 'text',
          content: {
            text: 'এইটার দাম কত?',
            quotedMsg: { text: '📸 Casual Linen Shirt — BDT 1,200' },
          },
          createdAt: new Date('2026-10-20T00:01:00Z'),
        },
      ]);

      prismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'ai1',
        tenantId: 'tenant1',
        isActive: true,
        routingMode: 'ai_first',
        systemPrompt: 'You are helpful assistant.',
        tools: [],
      });

      await service.processMessage('msg_flow_1');

      // Verify generateCompletion was called and prompt includes history with parsed body and quoting line
      expect(aiService.generateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('📸 Casual Linen Shirt — BDT 1,200')
      );
      expect(aiService.generateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('[Quoting: "📸 Casual Linen Shirt — BDT 1,200"]')
      );
    });

    it('T-Q4: Regular Inquiry — does NOT trigger demonstrative photo lookup when inquiry is general', async () => {
      prismaService.message.findUnique.mockResolvedValue({
        id: 'msg_regular_1',
        direction: 'inbound',
        type: 'text',
        content: { text: 'আপনাদের শোরুমের ঠিকানা কোথায়?' }, // General location inquiry, > 3 words, no demonstrative
        conversationId: 'c1',
        conversation: {
          tenantId: 'tenant1',
          id: 'c1',
          channelConnection: { id: 'conn1', isAiAutoReplyEnabled: true },
        },
      });

      prismaService.message.findFirst.mockResolvedValue(null);

      prismaService.aiAssistant.findFirst.mockResolvedValue({
        id: 'ai1',
        tenantId: 'tenant1',
        isActive: true,
        routingMode: 'ai_first',
        systemPrompt: 'You are helpful assistant.',
        tools: [],
      });

      await service.processMessage('msg_regular_1');

      // Verify RAG search query is the original user query without photo prefix
      expect(aiService.searchRelevantProducts).toHaveBeenCalledWith(
        'tenant1',
        'আপনাদের শোরুমের ঠিকানা কোথায়?',
        expect.any(Number)
      );
    });
  });

  describe('Product Photo Deduplication & Order Flow Suppression', () => {
    it('should skip photo matching when user expresses order intent without asking for pictures', async () => {
      const classification: any = {
        intent: 'order_intent',
        replyText: 'আপনার অর্ডারটি কনফার্ম করার জন্য তথ্য দিন',
        imageProductDescription: 'টি শার্ট',
        sendProductPhotoIds: ['p1', 'p2']
      };

      await (service as any).handleProductMatching(
        'tenant1',
        'c1',
        classification,
        0.6,
        10,
        'ai1',
        'টি শার্ট নিব'
      );

      // Verify no outbound photo messages were saved
      expect(inboxService.saveOutboundMessage).not.toHaveBeenCalled();
    });

    it('should deduplicate and skip already sent photos in conversation unless user explicitly demands resend', async () => {
      prismaService.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Black T-Shirt', price: 500, imageUrl: 'https://example.com/black.jpg', isActive: true },
        { id: 'p2', name: 'White T-Shirt', price: 600, imageUrl: 'https://example.com/white.jpg', isActive: true }
      ]);

      // p1 was already sent previously
      prismaService.message.findMany.mockResolvedValue([
        {
          id: 'm_prev_1',
          type: 'image',
          content: JSON.stringify({ productId: 'p1', mediaUrl: 'https://example.com/black.jpg' })
        }
      ]);

      const classification: any = {
        intent: 'product_lookup',
        replyText: 'এখানে টি শার্টের ছবি দেওয়া হলো',
        sendProductPhotoIds: ['p1', 'p2']
      };

      await (service as any).handleProductMatching(
        'tenant1',
        'c1',
        classification,
        0.6,
        10,
        'ai1',
        'টি শার্টের ছবি দেখান'
      );

      // Only p2 should be dispatched (p1 was skipped because it was already sent)
      expect(inboxService.saveOutboundMessage).toHaveBeenCalledTimes(1);
      expect(inboxService.saveOutboundMessage).toHaveBeenCalledWith(
        'tenant1',
        'c1',
        expect.stringContaining('White T-Shirt'),
        'image',
        undefined,
        'ai1'
      );
    });

    it('should skip photo matching when customer sends an inbound image without explicit photo request', async () => {
      inboxService.saveOutboundMessage.mockClear();

      prismaService.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Black Polo Shirt', price: 800, imageUrl: 'https://example.com/polo.jpg', isActive: true },
        { id: 'p2', name: 'Blue Polo Shirt', price: 850, imageUrl: 'https://example.com/blue-polo.jpg', isActive: true }
      ]);

      const classification: any = {
        intent: 'general',
        replyText: 'আপনার ছবিটি দেখলাম। এটি একটি সুন্দর ব্ল্যাক পোলো শার্ট!',
        imageProductDescription: 'Black Polo Shirt',
        sendProductPhotoIds: ['p1']
      };

      // Customer sent image with caption "দাম কত?"
      await (service as any).handleProductMatching(
        'tenant1',
        'c1',
        classification,
        0.6,
        10,
        'ai1',
        '[Image Sent] Caption: দাম কত?'
      );

      // Verify ZERO outbound photo messages were saved (no blast of 5 photos)
      expect(inboxService.saveOutboundMessage).not.toHaveBeenCalled();
    });

    it('should skip photo matching when customer sends an image with no caption at all', async () => {
      inboxService.saveOutboundMessage.mockClear();

      prismaService.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Sneakers Shoes', price: 2500, imageUrl: 'https://example.com/sneakers.jpg', isActive: true }
      ]);

      const classification: any = {
        intent: 'general',
        replyText: 'আপনার পাঠানো ছবিটি পেয়েছি! এটি একটি স্নিকার্স জুতো...',
        imageProductDescription: 'Sneakers Shoes',
        sendProductPhotoIds: ['p1']
      };

      // Customer sent image alone with no text
      await (service as any).handleProductMatching(
        'tenant1',
        'c1',
        classification,
        0.6,
        10,
        'ai1',
        '[Image Sent by Customer]'
      );

      // Verify ZERO outbound photo messages were saved
      expect(inboxService.saveOutboundMessage).not.toHaveBeenCalled();
    });

    it('should allow photo matching when customer image caption explicitly requests more photos', async () => {
      inboxService.saveOutboundMessage.mockClear();

      prismaService.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Red Panjabi', price: 1500, imageUrl: 'https://example.com/red.jpg', isActive: true },
        { id: 'p2', name: 'Blue Panjabi', price: 1600, imageUrl: 'https://example.com/blue.jpg', isActive: true }
      ]);

      prismaService.message.findMany.mockResolvedValue([]);

      const classification: any = {
        intent: 'product_lookup',
        replyText: 'এখানে অন্যান্য কালারের ছবি দেওয়া হলো',
        imageProductDescription: 'Panjabi',
        sendProductPhotoIds: ['p1', 'p2']
      };

      // Customer sent image and explicitly asked for other colors
      await (service as any).handleProductMatching(
        'tenant1',
        'c1',
        classification,
        0.6,
        10,
        'ai1',
        '[Image Sent] Caption: এইটার অন্য কালারের ছবি দেখান'
      );

      // Verify photos were dispatched because explicit photo request was present in caption
      expect(inboxService.saveOutboundMessage).toHaveBeenCalled();
    });

    it('T-FS1: should trigger Flow 1.8 failsafe and create order when LLM replies that order is confirmed while pendingOrderProposal exists', async () => {
      const proposal = {
        status: 'AWAITING_PAYMENT_PROOF',
        paymentPolicy: 'delivery_advance',
        deliveryArea: 'inside_dhaka',
        deliveryCharge: 60,
        items: [{ productId: 'prod_1', quantity: 1, price: 1200 }],
        advanceAmountRequired: 60,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      };

      const mockConversation = {
        id: 'c_failsafe_1',
        tenantId: 'tenant1',
        contactId: 'contact_1',
        pendingOrderProposal: proposal,
        contact: { id: 'contact_1', name: 'Rakib', phone: '01885637678' }
      };

      prismaService.product.findFirst.mockResolvedValue({
        id: 'prod_1',
        name: 'Black Panjabi',
        price: 1200,
        tenantId: 'tenant1',
        isActive: true
      });

      ordersService.createOrder.mockResolvedValue({
        id: 'ord_12345678abcdef',
        tenantId: 'tenant1',
        totalAmount: 1260
      });

      const classification: any = {
        intent: 'general',
        replyText: 'ধন্যবাদ পেমেন্টের স্ক্রিনশট পাঠানোর জন্য! ✅ আপনার পেমেন্ট সফলভাবে যাচাই করা হয়েছে এবং অর্ডারটি কনফার্ম করা হয়েছে।'
      };

      const result = await (service as any).handleOrderPlacement(
        'tenant1',
        mockConversation,
        classification,
        'c_failsafe_1',
        '[Image Sent by Customer]',
        []
      );

      expect(ordersService.createOrder).toHaveBeenCalledWith('tenant1', expect.objectContaining({
        contactId: 'contact_1',
        conversationId: 'c_failsafe_1',
        items: expect.arrayContaining([expect.objectContaining({ productId: 'prod_1' })])
      }));
      expect(prismaService.order.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'ord_12345678abcdef' },
        data: { createdBy: 'ai', status: 'confirmed' }
      }));
      expect(result?.overrideReplyText).toContain('ord_1234');
      expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        type: 'ORDER_CREATED',
        metadataJson: expect.objectContaining({ source: 'ai_confirmation_failsafe' })
      }));
    });

    it('T-FS2: ensureLocalImage should resolve local existing paths and return absolute path', async () => {
      const dummyPath = path.join(process.cwd(), 'package.json');
      const resolved = await service.ensureLocalImage(dummyPath, 'tenant1');
      expect(resolved).toBe(dummyPath);
    });

    it('T-FS3: multi-turn detail resumption should transition AWAITING_CUSTOMER_DETAILS to AWAITING_PAYMENT_PROOF', async () => {
      const mockConversation: any = {
        id: 'c_multiturn',
        tenantId: 'tenant1',
        contactId: 'contact_1',
        pendingOrderProposal: {
          status: 'AWAITING_CUSTOMER_DETAILS',
          paymentPolicy: 'delivery_advance',
          items: [{ productId: 'prod_1', name: 'টি সাঁট', price: 499, quantity: 1 }],
          subtotal: 499,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        }
      };

      prismaService.contact.findUnique.mockResolvedValue({
        id: 'contact_1',
        name: 'Sig Ma Rakib',
        phone: null,
        address: null
      });

      const classification: any = {
        intent: 'general',
        customerDetails: {
          address: 'নোয়াখালী সোনাপুর বড় বাজার'
        },
        replyText: 'ধন্যবাদ!'
      };

      const result = await (service as any).handleOrderPlacement(
        'tenant1',
        mockConversation,
        classification,
        'c_multiturn',
        'লোকেশন নোয়াখালী সোনাপুর বড় বাজার 01856750599',
        []
      );

      expect(prismaService.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'c_multiturn' },
        data: expect.objectContaining({
          pendingOrderProposal: expect.objectContaining({
            status: 'AWAITING_PAYMENT_PROOF',
            totalAmount: 499 + 120, // 499 + 120 delivery charge outside dhaka
            advanceAmountRequired: 120
          })
        })
      }));
      expect(result?.overrideReplyText).toContain('৳120');
      expect(result?.overrideReplyText).toContain('অর্ডার সামারি');
    });

    it('T-FS4: Flow 1 vision payment receipt should recover product from history and create order even when proposal is null', async () => {
      const mockConversation: any = {
        id: 'c_null_proposal',
        tenantId: 'tenant1',
        contactId: 'contact_1',
        pendingOrderProposal: null
      };

      // Mock recent messages with quoted product
      prismaService.message.findMany.mockResolvedValue([
        {
          content: {
            text: 'নিতে চাই',
            quotedMsg: { productId: 'prod_1', productName: 'টি সাঁট', productPrice: 499 }
          },
          senderType: 'customer'
        }
      ]);

      prismaService.product.findMany.mockResolvedValue([
        { id: 'prod_1', name: 'টি সাঁট', price: 499, isActive: true }
      ]);
      prismaService.product.findFirst.mockResolvedValue({
        id: 'prod_1',
        name: 'টি সাঁট',
        price: 499,
        isActive: true
      });

      aiService.verifyPaymentReceiptScreenshot.mockResolvedValue({
        isPaymentReceipt: true,
        status: 'verified',
        paidAmount: 150,
        provider: 'bKash',
        trxId: 'CK283NL18L'
      });

      ordersService.createOrder.mockResolvedValue({
        id: 'ord_recov_12345678',
        tenantId: 'tenant1',
        totalAmount: 649
      });

      const dummyImagePath = path.join(process.cwd(), 'package.json');
      const result = await (service as any).handleOrderPlacement(
        'tenant1',
        mockConversation,
        { intent: 'general', replyText: '' } as any,
        'c_null_proposal',
        '',
        [dummyImagePath]
      );

      expect(ordersService.createOrder).toHaveBeenCalledWith('tenant1', expect.objectContaining({
        conversationId: 'c_null_proposal',
        items: expect.arrayContaining([expect.objectContaining({ productId: 'prod_1' })])
      }));
      expect(result?.overrideReplyText).toContain('ord_reco');
      expect(result?.overrideReplyText).toContain('150');
    });

    it('T-FS5: enforceOrderConfirmationIntegrity should create order if reply asserts confirmation but DB has 0 orders', async () => {
      prismaService.order.findFirst.mockResolvedValue(null); // No order in DB
      prismaService.message.findMany.mockResolvedValue([
        {
          content: 'আপনার পছন্দের প্রোডাক্ট: 📦 1x টি সাঁট (৳499)',
          senderType: 'ai'
        }
      ]);
      prismaService.product.findMany.mockResolvedValue([
        { id: 'prod_1', name: 'টি সাঁট', price: 499, isActive: true }
      ]);
      prismaService.product.findFirst.mockResolvedValue({
        id: 'prod_1',
        name: 'টি সাঁট',
        price: 499,
        isActive: true
      });
      prismaService.contact.findUnique.mockResolvedValue({
        id: 'cnt_rakib',
        name: 'Sig Ma Rakib',
        phone: '01856750599',
        address: 'নোয়াখালী সোনাপুর বড় বাজার'
      });
      ordersService.createOrder.mockResolvedValue({
        id: 'ord_emergency_99999',
        tenantId: 'tenant1',
        totalAmount: 619
      });

      const replyText = 'আপনার অর্ডারটি কনফার্ম হয়ে গেছে, রাকিব ফ্যাশনের সাথে থাকার জন্য ধন্যবাদ।';
      const output = await service.enforceOrderConfirmationIntegrity(
        'tenant1',
        { id: 'c_emergency', contactId: 'cnt_rakib', pendingOrderProposal: null },
        'c_emergency',
        replyText,
        'asst_1'
      );

      expect(ordersService.createOrder).toHaveBeenCalled();
      expect(output).toContain('ord_emer');
    });
  });
});



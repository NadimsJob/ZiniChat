import { Test, TestingModule } from '@nestjs/testing';
import { InboxService } from './inbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogService } from './activity-log.service';
import { QuotaService } from '../tenants/quota.service';
import { getQueueToken } from '@nestjs/bullmq';

/**
 * Webhook Security Tests
 * Verifies that handleIncomingMessage() enforces tenant subscription/trial guard:
 *  1. Drops messages silently for inactive tenants (no DB writes, no AI trigger)
 *  2. Processes and saves messages for active tenants
 */
import { InboxGateway } from './inbox.gateway';

describe('InboxService — Webhook Subscription Security Guard', () => {
  let service: InboxService;
  let mockPrisma: any;
  let mockQuotaService: { isTenantSubscriptionActive: jest.Mock; checkFeature: jest.Mock; checkAiQuota: jest.Mock };
  let mockOrchestratorService: { processMessage: jest.Mock };

  const incomingMessagePayload = {
    tenantId: 'tenant-abc',
    channel: 'whatsapp',
    channelConnectionId: 'conn-1',
    externalContactId: '8801700000001',
    contactName: 'Test User',
    messageType: 'text',
    content: { body: 'Hello!' },
    externalMessageId: 'wa_msg_001',
    timestamp: new Date('2026-08-10T10:00:00Z'),
    direction: 'inbound',
  };

  beforeEach(async () => {
    mockPrisma = {
      contact: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      conversation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      message: { create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      kanbanStage: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    };

    mockQuotaService = {
      isTenantSubscriptionActive: jest.fn(),
      checkFeature: jest.fn().mockResolvedValue(true),
      checkAiQuota: jest.fn().mockResolvedValue(undefined),
    };

    mockOrchestratorService = {
      processMessage: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ActivityLogService, useValue: { record: jest.fn().mockResolvedValue(true) } },
        { provide: getQueueToken('whatsapp-outbound'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('messenger-outbound'), useValue: { add: jest.fn() } },
        { provide: AiService, useValue: { transcribeAudio: jest.fn(), extractTextFromPdf: jest.fn(), generateCompletion: jest.fn(), generateConversationSummary: jest.fn() } },
        { provide: OrchestratorService, useValue: mockOrchestratorService },
        { provide: NotificationsService, useValue: { createNotification: jest.fn().mockResolvedValue(true), createNotificationForTenantAdmins: jest.fn().mockResolvedValue(true) } },
        { provide: QuotaService, useValue: mockQuotaService },
        { provide: InboxGateway, useValue: { server: { emit: jest.fn() } } },
      ],
    }).compile();

    service = module.get<InboxService>(InboxService);
    jest.clearAllMocks();

    // Re-attach mocks after clearAllMocks (module-level mocks are cleared)
    mockQuotaService.checkFeature.mockResolvedValue(true);
    mockQuotaService.checkAiQuota.mockResolvedValue(undefined);
    mockOrchestratorService.processMessage.mockResolvedValue(true);
    mockPrisma.kanbanStage.findFirst.mockResolvedValue(null);
    mockPrisma.message.count.mockResolvedValue(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Inactive Tenant — Message must be dropped without any DB write
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 1 — Inactive Tenant: should drop message, skip DB writes, and return { dropped: true }', async () => {
    // Arrange: tenant has expired subscription
    mockQuotaService.isTenantSubscriptionActive.mockResolvedValue({
      isActive: false,
      reason: 'SUBSCRIPTION_EXPIRED',
    });

    // Act
    const result = await service.handleIncomingMessage(incomingMessagePayload);

    // Assert — dropped immediately
    expect(result).toEqual({ dropped: true, reason: 'SUBSCRIPTION_INACTIVE' });

    // Assert — NO database operations were performed
    expect(mockPrisma.contact.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    expect(mockPrisma.conversation.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    expect(mockPrisma.message.create).not.toHaveBeenCalled();

    // Assert — NO AI orchestrator was triggered
    expect(mockOrchestratorService.processMessage).not.toHaveBeenCalled();

    // Verify the subscription check was called with the correct tenantId
    expect(mockQuotaService.isTenantSubscriptionActive).toHaveBeenCalledWith('tenant-abc');
  });

  it('Test 1b — Suspended Tenant: should also drop message when reason is TENANT_SUSPENDED', async () => {
    mockQuotaService.isTenantSubscriptionActive.mockResolvedValue({
      isActive: false,
      reason: 'TENANT_SUSPENDED',
    });

    const result = await service.handleIncomingMessage(incomingMessagePayload);

    expect(result).toEqual({ dropped: true, reason: 'SUBSCRIPTION_INACTIVE' });
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
    expect(mockOrchestratorService.processMessage).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: Active Tenant — Message must be persisted and orchestrator triggered
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 2 — Active Tenant: should save message to DB and trigger orchestrator', async () => {
    // Arrange: tenant has active subscription
    mockQuotaService.isTenantSubscriptionActive.mockResolvedValue({ isActive: true });

    const mockContact = { id: 'contact-1', name: 'Test User', phone: '8801700000001', isBlocked: false };
    const mockConversation = { id: 'conv-1', tenantId: 'tenant-abc', status: 'open', isBlocked: false, isAiEnabled: true };
    const mockMessage = { id: 'msg-1', conversationId: 'conv-1', direction: 'inbound' };

    mockPrisma.contact.findFirst.mockResolvedValue(mockContact);
    mockPrisma.contact.update.mockResolvedValue(mockContact);
    mockPrisma.conversation.findFirst.mockResolvedValue(mockConversation);
    mockPrisma.conversation.update.mockResolvedValue(mockConversation);
    mockPrisma.message.create.mockResolvedValue(mockMessage);

    // Act
    const result: any = await service.handleIncomingMessage(incomingMessagePayload);

    // Assert — subscription check was called first
    expect(mockQuotaService.isTenantSubscriptionActive).toHaveBeenCalledWith('tenant-abc');

    // Assert — message was saved to DB
    expect(mockPrisma.message.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'conv-1',
          direction: 'inbound',
          senderType: 'customer',
        }),
      })
    );

    // Assert — orchestrator was triggered for inbound message
    expect(mockOrchestratorService.processMessage).toHaveBeenCalledWith('msg-1');

    // Assert — result contains message and conversation
    expect(result.message).toEqual(mockMessage);
    expect(result.conversation).toEqual(mockConversation);
  });

  it('Test 2b — Active Trial: should also process message when tenant is within trial period', async () => {
    // Trial tenants (trialEndsAt > NOW) should be treated as active
    mockQuotaService.isTenantSubscriptionActive.mockResolvedValue({ isActive: true });

    const mockContact = { id: 'contact-2', name: 'Trial User', phone: '8801700000002', isBlocked: false };
    const mockConversation = { id: 'conv-2', tenantId: 'tenant-abc', status: 'open', isBlocked: false, isAiEnabled: false };
    const mockMessage = { id: 'msg-2', conversationId: 'conv-2', direction: 'inbound' };

    mockPrisma.contact.findFirst.mockResolvedValue(mockContact);
    mockPrisma.contact.update.mockResolvedValue(mockContact);
    mockPrisma.conversation.findFirst.mockResolvedValue(mockConversation);
    mockPrisma.conversation.update.mockResolvedValue(mockConversation);
    mockPrisma.message.create.mockResolvedValue(mockMessage);

    const result: any = await service.handleIncomingMessage(incomingMessagePayload);

    expect(result.message).toBeDefined();
    expect(mockPrisma.message.create).toHaveBeenCalledTimes(1);
    // AI is disabled on conversation so orchestrator is still called (orchestrator handles isAiEnabled check)
    expect(mockOrchestratorService.processMessage).toHaveBeenCalled();
  });
});

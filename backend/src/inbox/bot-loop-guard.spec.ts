import { Test, TestingModule } from '@nestjs/testing';
import { InboxService } from './inbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogService } from './activity-log.service';
import { QuotaService } from '../tenants/quota.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('BotLoopGuard (InboxService)', () => {
  let service: InboxService;
  let prismaService: any;
  let notificationsService: any;
  let activityLogService: any;

  beforeEach(async () => {
    prismaService = {
      conversation: {
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      message: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      channelConnection: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      contact: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      aiAssistant: {
        findFirst: jest.fn(),
      },
      aiUsageLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(callback => callback(prismaService)),
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue(true),
      createNotificationForTenantAdmins: jest.fn().mockResolvedValue([]),
    };

    activityLogService = {
      record: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ActivityLogService, useValue: activityLogService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: getQueueToken('whatsapp-outbound'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('messenger-outbound'), useValue: { add: jest.fn() } },
        { provide: StorageService, useValue: { uploadFile: jest.fn() } },
        { provide: AiService, useValue: { transcribeAudio: jest.fn(), extractTextFromPdf: jest.fn(), generateCompletion: jest.fn() } },
        { provide: OrchestratorService, useValue: { processMessage: jest.fn().mockResolvedValue(true) } },
        { provide: QuotaService, useValue: { checkFeature: jest.fn().mockResolvedValue(true), checkAiQuota: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<InboxService>(InboxService);
  });

  it('should detect 5 rapid AI responses within 10 seconds, toggle isAiEnabled to false, send notification, and log activity', async () => {
    const conversationId = 'conv_loop_test';
    const tenantId = 'tenant_123';
    const contactId = 'contact_123';

    const baseTime = new Date();
    const mock5RapidAiMessages = [
      { id: 'm5', conversationId, senderType: 'ai', aiAssistantId: 'ai_1', createdAt: new Date(baseTime.getTime() - 0) },
      { id: 'm4', conversationId, senderType: 'ai', aiAssistantId: 'ai_1', createdAt: new Date(baseTime.getTime() - 2000) },
      { id: 'm3', conversationId, senderType: 'ai', aiAssistantId: 'ai_1', createdAt: new Date(baseTime.getTime() - 4000) },
      { id: 'm2', conversationId, senderType: 'ai', aiAssistantId: 'ai_1', createdAt: new Date(baseTime.getTime() - 6000) },
      { id: 'm1', conversationId, senderType: 'ai', aiAssistantId: 'ai_1', createdAt: new Date(baseTime.getTime() - 8000) },
    ];

    prismaService.message.findMany.mockResolvedValue(mock5RapidAiMessages);
    prismaService.conversation.update.mockResolvedValue({
      id: conversationId,
      tenantId,
      contactId,
      isAiEnabled: false,
    });

    const isLoopDetected = await service.checkBotLoopSafeguard(conversationId);

    expect(isLoopDetected).toBe(true);

    expect(prismaService.conversation.update).toHaveBeenCalledWith({
      where: { id: conversationId },
      data: { isAiEnabled: false },
    });

    expect(notificationsService.createNotificationForTenantAdmins).toHaveBeenCalledWith(
      tenantId,
      'AI Auto-Reply Paused',
      'AI Auto-Reply paused due to rapid back-to-front messaging loop.',
      'warning'
    );

    expect(activityLogService.record).toHaveBeenCalledWith({
      tenantId,
      conversationId,
      contactId,
      type: 'AI_HANDOVER',
      actorUserId: undefined,
      metadataJson: { isAiEnabled: false, reason: 'bot_loop_detected' },
    });
  });

  it('should not disable AI if there are fewer than 5 messages', async () => {
    prismaService.message.findMany.mockResolvedValue([
      { id: 'm1', senderType: 'ai', createdAt: new Date() },
      { id: 'm2', senderType: 'ai', createdAt: new Date() },
    ]);

    const isLoopDetected = await service.checkBotLoopSafeguard('conv_short');
    expect(isLoopDetected).toBe(false);
    expect(prismaService.conversation.update).not.toHaveBeenCalled();
  });

  it('should not disable AI if messages are not all generated by AI', async () => {
    const baseTime = new Date();
    prismaService.message.findMany.mockResolvedValue([
      { id: 'm5', senderType: 'ai', createdAt: new Date(baseTime.getTime() - 0) },
      { id: 'm4', senderType: 'customer', createdAt: new Date(baseTime.getTime() - 2000) },
      { id: 'm3', senderType: 'ai', createdAt: new Date(baseTime.getTime() - 4000) },
      { id: 'm2', senderType: 'ai', createdAt: new Date(baseTime.getTime() - 6000) },
      { id: 'm1', senderType: 'ai', createdAt: new Date(baseTime.getTime() - 8000) },
    ]);

    const isLoopDetected = await service.checkBotLoopSafeguard('conv_mixed');
    expect(isLoopDetected).toBe(false);
    expect(prismaService.conversation.update).not.toHaveBeenCalled();
  });

  it('should not disable AI if 5 AI messages span over 30 seconds', async () => {
    const baseTime = new Date();
    prismaService.message.findMany.mockResolvedValue([
      { id: 'm5', senderType: 'ai', createdAt: new Date(baseTime.getTime() - 0) },
      { id: 'm4', senderType: 'ai', createdAt: new Date(baseTime.getTime() - 10000) },
      { id: 'm3', senderType: 'ai', createdAt: new Date(baseTime.getTime() - 20000) },
      { id: 'm2', senderType: 'ai', createdAt: new Date(baseTime.getTime() - 30000) },
      { id: 'm1', senderType: 'ai', createdAt: new Date(baseTime.getTime() - 45000) }, // 45 sec diff
    ]);

    const isLoopDetected = await service.checkBotLoopSafeguard('conv_slow');
    expect(isLoopDetected).toBe(false);
    expect(prismaService.conversation.update).not.toHaveBeenCalled();
  });
});

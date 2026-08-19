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
import { InboxGateway } from './inbox.gateway';

describe('InboxService', () => {
  let service: InboxService;
  let prismaService: any;
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
      channelConnection: {
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      contact: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      message: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      kanbanStage: {
        findFirst: jest.fn(),
      },
      agentChannelAssignment: {
        findMany: jest.fn(),
      },
      conversationCollaborator: {
        upsert: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      conversationActivity: {
        deleteMany: jest.fn(),
      },
      conversationLabel: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      order: {
        updateMany: jest.fn(),
      },
      aiAssistant: {
        findFirst: jest.fn(),
      },
      aiUsageLog: {
        create: jest.fn(),
      },
      contactNote: {
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      $transaction: jest.fn(callback => callback(prismaService)),
    };

    activityLogService = {
      record: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ActivityLogService, useValue: activityLogService },
        { provide: getQueueToken('whatsapp-outbound'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('messenger-outbound'), useValue: { add: jest.fn() } },
        { provide: StorageService, useValue: { uploadFile: jest.fn() } },
        { provide: AiService, useValue: { transcribeAudio: jest.fn(), transcribeFromUrl: jest.fn(), extractTextFromPdf: jest.fn(), generateCompletion: jest.fn().mockResolvedValue('AI Summary') } },
        { provide: OrchestratorService, useValue: { processMessage: jest.fn().mockResolvedValue(true) } },
        { provide: NotificationsService, useValue: { createNotification: jest.fn().mockResolvedValue(true) } },
        { provide: QuotaService, useValue: { checkFeature: jest.fn().mockResolvedValue(true), checkAiQuota: jest.fn().mockResolvedValue(undefined), isTenantSubscriptionActive: jest.fn().mockResolvedValue({ isActive: true }) } },
        { provide: InboxGateway, useValue: { broadcastToTenant: jest.fn(), broadcastNewMessage: jest.fn() } },
      ],
    }).compile();

    service = module.get<InboxService>(InboxService);
  });

  describe('Unread Message Tracking', () => {
    it('should increment unreadCount when an incoming message is received for an existing conversation', async () => {
      const mockContact = { id: 'contact1', name: 'John Doe' };
      const mockConversation = { id: 'conv1', tenantId: 'tenant1', status: 'open' };

      prismaService.contact.findFirst.mockResolvedValue(mockContact);
      prismaService.contact.update.mockResolvedValue(mockContact);
      prismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      prismaService.conversation.update.mockResolvedValue({ ...mockConversation, unreadCount: 1 });
      prismaService.message.create.mockResolvedValue({ id: 'msg1', direction: 'inbound' });

      await service.handleIncomingMessage({
        tenantId: 'tenant1',
        channel: 'whatsapp',
        externalContactId: '123456',
        messageType: 'text',
        content: { text: 'Hello' },
        externalMessageId: 'ext_msg_1',
        timestamp: new Date()
      });

      expect(prismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv1' },
        data: expect.objectContaining({
          unreadCount: { increment: 1 },
          status: 'open'
        })
      });
    });
  });

  describe('CRM Actions', () => {
    it('should toggle star status of a conversation', async () => {
      const mockConv = { id: 'conv1', tenantId: 'tenant1', contactId: 'c1', isStarred: false };
      prismaService.conversation.findFirst.mockResolvedValue(mockConv);
      prismaService.conversation.update.mockResolvedValue({ ...mockConv, isStarred: true });

      const result: any = await service.toggleStar('tenant1', 'conv1', { id: 'user1' });

      expect(prismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv1' },
        data: { isStarred: true }
      });
      expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        type: 'STARRED',
        conversationId: 'conv1'
      }));
      expect(result.isStarred).toBe(true);
    });

    it('should archive a conversation', async () => {
      const mockConv = { id: 'conv1', tenantId: 'tenant1', contactId: 'c1', isArchived: false };
      prismaService.conversation.findFirst.mockResolvedValue(mockConv);
      prismaService.conversation.update.mockResolvedValue({ ...mockConv, isArchived: true });

      const result: any = await service.archiveConversation('tenant1', 'conv1', { id: 'user1' });
      expect(result.isArchived).toBe(true);
      expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ type: 'ARCHIVED' }));
    });

    it('should resolve a conversation', async () => {
      const mockConv = { id: 'conv1', tenantId: 'tenant1', contactId: 'c1', status: 'open' };
      prismaService.conversation.findFirst.mockResolvedValue(mockConv);
      prismaService.conversation.update.mockResolvedValue({ ...mockConv, status: 'resolved', resolvedAt: new Date() });

      const result = await service.resolveConversation('tenant1', 'conv1', { id: 'user1' });
      expect(result.status).toBe('resolved');
      expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ type: 'RESOLVED' }));
    });

    it('should add a collaborator', async () => {
      const mockConv = { id: 'conv1', tenantId: 'tenant1', contactId: 'c1', contact: { name: 'Customer' } };
      prismaService.conversation.findFirst.mockResolvedValue(mockConv);
      prismaService.conversationCollaborator.upsert.mockResolvedValue({ conversationId: 'conv1', userId: 'user2' });

      const result = await service.addCollaborator('tenant1', 'conv1', 'user2', { id: 'user1' });
      expect(prismaService.conversationCollaborator.upsert).toHaveBeenCalled();
      expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ type: 'COLLABORATOR_ADDED' }));
      expect(result).toBeDefined();
    });

    it('should generate an AI summary for a conversation and deduct 1 AI Response credit', async () => {
      const mockConv = { id: 'conv1', tenantId: 'tenant1', contact: { name: 'Customer' }, summary: null };
      prismaService.conversation.findFirst.mockResolvedValue(mockConv);
      prismaService.message.findMany.mockResolvedValue([
        { direction: 'inbound', content: { body: 'Hello' } },
        { direction: 'outbound', content: 'Hi there!' }
      ]);
      prismaService.aiAssistant.findFirst.mockResolvedValue({ id: 'ai1', tenantId: 'tenant1', isActive: true });
      prismaService.conversation.update.mockResolvedValue({
        ...mockConv,
        summary: 'AI Summary',
        summaryGeneratedAt: new Date()
      });

      const result = await service.generateSummary('tenant1', 'conv1', true);
      expect(result.summary).toBe('AI Summary');
      expect(result.cached).toBe(false);
      expect(prismaService.aiUsageLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant1', assistantId: 'ai1' })
      }));
    });

    it('should return inbox counts for all tabs', async () => {
      prismaService.conversation.count
        .mockResolvedValueOnce(10) // all
        .mockResolvedValueOnce(2)  // order_requests
        .mockResolvedValueOnce(3)  // unreplied
        .mockResolvedValueOnce(1)  // tickets
        .mockResolvedValueOnce(4)  // resolved
        .mockResolvedValueOnce(5); // archived

      const counts = await service.getInboxCounts('tenant1', { role: 'admin' });
      expect(counts.all).toBe(10);
      expect(counts.order_requests).toBe(2);
      expect(counts.unreplied).toBe(3);
      expect(counts.tickets).toBe(1);
      expect(counts.resolved).toBe(4);
      expect(counts.archived).toBe(5);
    });

    it('should toggle ignoreGroupMessages for a channel connection', async () => {
      prismaService.channelConnection.update.mockResolvedValue({ id: 'conn1', ignoreGroupMessages: false });
      const result = await service.toggleIgnoreGroupMessages('tenant1', 'conn1', false);
      expect(prismaService.channelConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn1' },
        data: { ignoreGroupMessages: false }
      });
      expect(result.ignoreGroupMessages).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // T-07 to T-12: Audio Message Processing
  // ─────────────────────────────────────────────────────────────────────────
  describe('Audio Message Processing', () => {
    const baseAudioMsg = {
      tenantId: 'tenant1',
      channel: 'whatsapp' as const,
      externalContactId: '01700000001',
      messageType: 'audio' as const,
      externalMessageId: 'msg_audio_1',
      timestamp: new Date(),
    };

    beforeEach(() => {
      prismaService.contact.findFirst.mockResolvedValue({ id: 'c1', name: 'Customer' });
      prismaService.contact.update.mockResolvedValue({ id: 'c1' });
      prismaService.conversation.findFirst.mockResolvedValue({ id: 'conv1', tenantId: 'tenant1', status: 'open' });
      prismaService.conversation.update.mockResolvedValue({ id: 'conv1', unreadCount: 1 });
      prismaService.message.create.mockResolvedValue({ id: 'msg1', direction: 'inbound', type: 'audio' });
    });

    // T-07: WhatsApp Cloud API — localUrl present, file exists on disk
    it('T-07: WhatsApp Cloud API audio — transcribes via localUrl and saves transcript', async () => {
      const aiService = service['aiService'] as any;
      aiService.transcribeAudio.mockResolvedValue('আমার পণ্যের দাম কত?');

      // Mock fs.existsSync to return true
      const fsMod = require('fs');
      jest.spyOn(fsMod, 'existsSync').mockReturnValue(true);

      await service.handleIncomingMessage({
        ...baseAudioMsg,
        content: { body: '🎤 [Voice Message]', localUrl: '/uploads/tenants/tenant1/wa_audio.ogg' },
      });

      expect(aiService.transcribeAudio).toHaveBeenCalled();
      expect(prismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: expect.objectContaining({ transcript: 'আমার পণ্যের দাম কত?' }),
          }),
        })
      );
      jest.restoreAllMocks();
    });

    // T-08: WhatsApp Web — mediaUrl present (no localUrl), fallback handled
    it('T-08: WhatsApp Web audio — transcribes via mediaUrl fallback', async () => {
      const aiService = service['aiService'] as any;
      aiService.transcribeAudio.mockResolvedValue('ডেলিভারি কখন আসবে?');

      const fsMod = require('fs');
      jest.spyOn(fsMod, 'existsSync').mockReturnValue(true);

      await service.handleIncomingMessage({
        ...baseAudioMsg,
        content: { body: '🎤 [Voice Message]', mediaUrl: '/uploads/tenants/tenant1/wa_web_audio.ogg' },
      });

      expect(aiService.transcribeAudio).toHaveBeenCalled();
      expect(prismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: expect.objectContaining({ transcript: 'ডেলিভারি কখন আসবে?' }),
          }),
        })
      );
      jest.restoreAllMocks();
    });

    // T-09: Messenger/Instagram — only CDN url, transcribeFromUrl called
    it('T-09: Messenger audio — transcribes via CDN url', async () => {
      const aiService = service['aiService'] as any;
      aiService.transcribeFromUrl.mockResolvedValue('আমি একটা অর্ডার দিতে চাই');

      await service.handleIncomingMessage({
        ...baseAudioMsg,
        channel: 'messenger' as any,
        content: { url: 'https://cdn.fbsbx.com/v/audio.mp4' },
      });

      expect(aiService.transcribeFromUrl).toHaveBeenCalledWith(
        'https://cdn.fbsbx.com/v/audio.mp4',
        'tenant1'
      );
      expect(prismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: expect.objectContaining({ transcript: 'আমি একটা অর্ডার দিতে চাই' }),
          }),
        })
      );
    });

    // T-10: Audio file not found on disk — message still saved without transcript
    it('T-10: Audio file missing on disk — skips transcription, message saved', async () => {
      const aiService = service['aiService'] as any;
      const fsMod = require('fs');
      jest.spyOn(fsMod, 'existsSync').mockReturnValue(false);

      await service.handleIncomingMessage({
        ...baseAudioMsg,
        content: { body: '🎤 [Voice Message]', localUrl: '/uploads/tenants/tenant1/missing.ogg' },
      });

      expect(aiService.transcribeAudio).not.toHaveBeenCalled();
      expect(prismaService.message.create).toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    // T-11: Whisper API throws — message still saved, exception does not propagate
    it('T-11: Whisper failure — message saved without transcript, no crash', async () => {
      const aiService = service['aiService'] as any;
      aiService.transcribeAudio.mockRejectedValue(new Error('OpenAI quota exceeded'));

      const fsMod = require('fs');
      jest.spyOn(fsMod, 'existsSync').mockReturnValue(true);

      await expect(
        service.handleIncomingMessage({
          ...baseAudioMsg,
          content: { body: '🎤 [Voice Message]', localUrl: '/uploads/tenants/tenant1/wa_audio.ogg' },
        })
      ).resolves.not.toThrow();

      expect(prismaService.message.create).toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    // T-12: Text message — transcribeAudio NOT called (regression guard)
    it('T-12: Text message — transcribeAudio is never called (no regression)', async () => {
      const aiService = service['aiService'] as any;

      await service.handleIncomingMessage({
        tenantId: 'tenant1',
        channel: 'whatsapp' as const,
        externalContactId: '01700000001',
        messageType: 'text' as const,
        content: { text: 'Hello!' },
        externalMessageId: 'msg_text_1',
        timestamp: new Date(),
      });

      expect(aiService.transcribeAudio).not.toHaveBeenCalled();
      expect(aiService.transcribeFromUrl).not.toHaveBeenCalled();
    });

    // T-12B: AI Auto-Reply disabled on channel connection — skips transcription
    it('T-12B: AI disabled on channel connection — skips transcription to save cost', async () => {
      const aiService = service['aiService'] as any;
      prismaService.channelConnection = {
        findUnique: jest.fn().mockResolvedValue({ isAiAutoReplyEnabled: false })
      };

      await service.handleIncomingMessage({
        ...baseAudioMsg,
        channelConnectionId: 'conn_disabled',
        content: { body: '🎤 [Voice Message]', localUrl: '/uploads/tenants/tenant1/wa_audio.ogg' },
      });

      expect(aiService.transcribeAudio).not.toHaveBeenCalled();
      expect(aiService.transcribeFromUrl).not.toHaveBeenCalled();
      expect(prismaService.message.create).toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { InboxService } from './inbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('InboxService', () => {
  let service: InboxService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      conversation: {
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
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
      },
      kanbanStage: {
        findFirst: jest.fn(),
      },
      agentChannelAssignment: {
        findMany: jest.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: PrismaService, useValue: prismaService },
        { provide: getQueueToken('whatsapp-outbound'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('messenger-outbound'), useValue: { add: jest.fn() } },
        { provide: StorageService, useValue: { uploadFile: jest.fn() } },
        { provide: AiService, useValue: { transcribeAudio: jest.fn(), extractTextFromPdf: jest.fn() } },
        { provide: OrchestratorService, useValue: { processMessage: jest.fn().mockResolvedValue(true) } },
        { provide: NotificationsService, useValue: { createNotification: jest.fn() } },
      ],
    }).compile();

    service = module.get<InboxService>(InboxService);
  });

  describe('Unread Message Tracking', () => {
    it('should increment unreadCount when an incoming message is received for an existing conversation', async () => {
      const mockContact = { id: 'contact1', name: 'John Doe' };
      const mockConversation = { id: 'conv1', tenantId: 'tenant1' };

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

    it('should set unreadCount to 1 when a new conversation is created from an incoming message', async () => {
      const mockContact = { id: 'contact1', name: 'John Doe' };

      prismaService.contact.findFirst.mockResolvedValue(mockContact);
      prismaService.contact.update.mockResolvedValue(mockContact);
      prismaService.conversation.findFirst.mockResolvedValue(null); // No existing conversation
      prismaService.conversation.create.mockResolvedValue({ id: 'conv1', tenantId: 'tenant1', unreadCount: 1 });
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

      expect(prismaService.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          unreadCount: 1
        })
      });
    });

    it('should reset unreadCount to 0 when getMessages is called (user opens chat)', async () => {
      prismaService.conversation.updateMany.mockResolvedValue({ count: 1 });
      prismaService.message.findMany.mockResolvedValue([]);

      await service.getMessages('tenant1', 'conv1');

      expect(prismaService.conversation.updateMany).toHaveBeenCalledWith({
        where: { id: 'conv1', tenantId: 'tenant1' },
        data: { unreadCount: 0 }
      });
    });

    it('should correctly sum unreadCount for agents based on assignments', async () => {
      prismaService.agentChannelAssignment.findMany.mockResolvedValue([
        { channelConnectionId: 'conn1' }
      ]);
      prismaService.conversation.aggregate.mockResolvedValue({ _sum: { unreadCount: 5 } });

      const result = await service.getUnreadCount('tenant1', { id: 'agent1', role: 'agent', agentAccessMode: 'ASSIGNED_CHANNELS' });

      expect(prismaService.conversation.aggregate).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant1',
          unreadCount: { gt: 0 },
          OR: [
            { assignedAgentId: 'agent1' },
            { channelConnectionId: { in: ['conn1'] } }
          ]
        },
        _sum: { unreadCount: true }
      });
      expect(result).toEqual({ unreadCount: 5 });
    });

    it('should query only unassigned conversations for admins unread badge', async () => {
      prismaService.conversation.aggregate.mockResolvedValue({ _sum: { unreadCount: 2 } });

      const result = await service.getUnreadCount('tenant1', { id: 'admin1', role: 'admin' });

      expect(prismaService.conversation.aggregate).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant1',
          unreadCount: { gt: 0 },
          assignedAgentId: null
        },
        _sum: { unreadCount: true }
      });
      expect(result).toEqual({ unreadCount: 2 });
    });
  });
});

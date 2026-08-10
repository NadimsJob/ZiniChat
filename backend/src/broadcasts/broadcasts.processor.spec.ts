import { Test, TestingModule } from '@nestjs/testing';
import { BroadcastsProcessor } from './broadcasts.processor';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Job } from 'bullmq';

import { getQueueToken } from '@nestjs/bullmq';

describe('BroadcastsProcessor', () => {
  let processor: BroadcastsProcessor;

  const mockPrismaService = {
    broadcast: { 
      update: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ template: { body: 'hello {{name}}' } })
    },
    tenant: { 
      findUnique: jest.fn().mockResolvedValue({ 
        id: 'tenant-1',
        businessName: 'My Biz',
        users: [{ email: 'owner@biz.com', name: 'Owner' }]
      }) 
    },
    contact: { findMany: jest.fn().mockResolvedValue([{ id: 'contact-1', phone: '1234567890' }]) },
    broadcastRecipient: { create: jest.fn().mockResolvedValue({}) },
    channelConnection: { findFirst: jest.fn().mockResolvedValue({ accessToken: 'fake-token', externalAccountId: 'phone-1' }) }
  };

  const mockSmtpService = {
    triggerBroadcastCompletedEmail: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: '123' })
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(true)
  };

  let mockWhatsappQueue: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastsProcessor,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SmtpService, useValue: mockSmtpService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: getQueueToken('whatsapp-outbound'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    processor = module.get<BroadcastsProcessor>(BroadcastsProcessor);
    mockWhatsappQueue = module.get(getQueueToken('whatsapp-outbound'));
    jest.clearAllMocks();
    
    // Mock the global fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ message_id: '123' })
    }) as jest.Mock;
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should process a job and send message via Meta API', async () => {
      const mockJob = {
        name: 'send-message',
        data: {
          broadcastId: 'bc-1',
          tenantId: 'tenant-1',
          targetPhone: '1234567890',
          templateName: 'promo_template',
          language: 'en_US',
          components: [],
          accessToken: 'fake-token',
          phoneNumberId: 'phone-1',
          delayMs: 100,
          isLast: false
        }
      } as unknown as Job;

      await processor.process(mockJob);

      // Verify that it enqueued the message to whatsappQueue
      expect(mockWhatsappQueue.add).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          to: '1234567890',
          content: 'hello {{name}}'
        }),
        expect.any(Object)
      );
      
      // Should send email and update broadcast status
      expect(mockPrismaService.broadcast.update).toHaveBeenCalledWith({
        where: { id: 'bc-1' },
        data: { status: 'completed' }
      });
      expect(mockSmtpService.triggerBroadcastCompletedEmail).toHaveBeenCalledWith(
        'owner@biz.com',
        'My Biz',
        'Unnamed Broadcast',
        1
      );
    });

    it('should throw an error if Meta API fails', async () => {
      const mockJob = {
        name: 'send-message',
        data: {
          broadcastId: 'bc-1',
          tenantId: 'tenant-1',
          targetPhone: '1234567890',
          templateName: 'promo_template',
          language: 'en_US',
          components: [],
          accessToken: 'fake-token',
          phoneNumberId: 'phone-1',
          delayMs: 10,
          isLast: false
        }
      } as unknown as Job;

      mockWhatsappQueue.add.mockRejectedValue(new Error('Queue Error'));

      await expect(processor.process(mockJob)).rejects.toThrow('Queue Error');
    });

    it('Test 1: should filter contacts by tags when segmentFilter contains tags', async () => {
      mockPrismaService.broadcast.findUnique.mockResolvedValue({
        id: 'bc-tags',
        segmentFilter: { tags: ['VIP Customer'] },
        template: { name: 'vip_offer', language: 'bn', bodyText: 'VIP offer' }
      });
      mockPrismaService.contact.findMany.mockResolvedValue([
        { id: 'c-vip', phone: '12345' }
      ]);

      const mockJob = {
        data: { broadcastId: 'bc-tags', tenantId: 'tenant-1' }
      } as Job;

      await processor.process(mockJob);

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          isBlocked: false,
          phone: { not: null },
          tags: { hasSome: ['VIP Customer'] }
        }
      });
    });

    it('Test 2: should filter contacts by stageId when segmentFilter contains stageId', async () => {
      mockPrismaService.broadcast.findUnique.mockResolvedValue({
        id: 'bc-stage',
        segmentFilter: { stageId: 'stage_lead_123' },
        template: { name: 'lead_followup', language: 'bn', bodyText: 'Lead message' }
      });
      mockPrismaService.contact.findMany.mockResolvedValue([
        { id: 'c-lead', phone: '67890' }
      ]);

      const mockJob = {
        data: { broadcastId: 'bc-stage', tenantId: 'tenant-1' }
      } as Job;

      await processor.process(mockJob);

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          isBlocked: false,
          phone: { not: null },
          stageId: 'stage_lead_123'
        }
      });
    });

    it('Test 3: should fall back to fetching all non-blocked contacts with valid phone when segmentFilter is empty', async () => {
      mockPrismaService.broadcast.findUnique.mockResolvedValue({
        id: 'bc-empty',
        segmentFilter: {},
        template: { name: 'all_contacts', language: 'bn', bodyText: 'General message' }
      });
      mockPrismaService.contact.findMany.mockResolvedValue([
        { id: 'c-1', phone: '11111' },
        { id: 'c-2', phone: '22222' }
      ]);

      const mockJob = {
        data: { broadcastId: 'bc-empty', tenantId: 'tenant-1' }
      } as Job;

      await processor.process(mockJob);

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          isBlocked: false,
          phone: { not: null }
        }
      });
    });
  });
});

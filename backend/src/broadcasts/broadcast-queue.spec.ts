jest.mock('@whiskeysockets/baileys', () => ({
  __esModule: true,
  default: jest.fn(),
  useMultiFileAuthState: jest.fn().mockResolvedValue({ state: {}, saveCreds: jest.fn() }),
  DisconnectReason: {},
  fetchLatestBaileysVersion: jest.fn().mockResolvedValue({ version: [2, 3000, 0] }),
  downloadMediaMessage: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BroadcastsProcessor } from './broadcasts.processor';
import { WhatsappProcessor } from '../channels/whatsapp/whatsapp.processor';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappWebService } from '../channels/whatsapp-web/whatsapp-web.service';
import { InboxGateway } from '../inbox/inbox.gateway';
import { getQueueToken } from '@nestjs/bullmq';
import { Job } from 'bullmq';

describe('Broadcast Queue Rate Limiting & DLQ Failure Handling', () => {
  let broadcastsProcessor: BroadcastsProcessor;
  let whatsappProcessor: WhatsappProcessor;
  let prismaService: PrismaService;

  const mockPrisma = {
    broadcast: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    broadcastRecipient: {
      create: jest.fn(),
      update: jest.fn(),
    },
    contact: {
      findMany: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    channelConnection: {
      findFirst: jest.fn(),
    },
    message: {
      update: jest.fn(),
    },
  };

  const mockWhatsappQueue = {
    add: jest.fn(),
  };

  const mockSmtpService = {
    triggerBroadcastCompletedEmail: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue(true),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(true),
  };

  const mockWhatsappWebService = {
    sendMessage: jest.fn(),
  };

  const mockInboxGateway = {
    broadcastToTenant: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastsProcessor,
        WhatsappProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('whatsapp-outbound'), useValue: mockWhatsappQueue },
        { provide: SmtpService, useValue: mockSmtpService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: WhatsappWebService, useValue: mockWhatsappWebService },
        { provide: InboxGateway, useValue: mockInboxGateway },
      ],
    }).compile();

    broadcastsProcessor = module.get<BroadcastsProcessor>(BroadcastsProcessor);
    whatsappProcessor = module.get<WhatsappProcessor>(WhatsappProcessor);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should process bulk contacts and queue messages with rate control', async () => {
    const mockContacts = Array.from({ length: 50 }, (_, i) => ({
      id: `c-${i}`,
      name: `Customer ${i}`,
      phone: `88017000000${i}`,
      tenantId: 'tenant-123',
    }));

    mockPrisma.broadcast.findUnique.mockResolvedValue({
      id: 'bc-123',
      template: { name: 'eid_sale', language: 'bn', bodyText: 'Special offer!' },
    });
    mockPrisma.contact.findMany.mockResolvedValue(mockContacts);
    mockPrisma.broadcastRecipient.create.mockImplementation((args: any) => ({
      id: `rcp-${args.data.contactId}`,
      ...args.data,
    }));
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-123', users: [] });

    const job = {
      id: 'job-bc-1',
      data: { broadcastId: 'bc-123', tenantId: 'tenant-123' },
    } as Job;

    await broadcastsProcessor.process(job);

    expect(mockPrisma.broadcastRecipient.create).toHaveBeenCalledTimes(50);
    expect(mockWhatsappQueue.add).toHaveBeenCalledTimes(50);
    expect(mockPrisma.broadcast.update).toHaveBeenCalledWith({
      where: { id: 'bc-123' },
      data: { status: 'completed' },
    });
  });

  it('should update broadcastRecipient status to failed when a message job fails', async () => {
    mockPrisma.channelConnection.findFirst.mockResolvedValue({
      id: 'conn-1',
      provider: 'CLOUD_API',
      accessTokenEncrypted: 'invalid_token',
      phoneNumberId: '12345',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: { message: '#131026 - Rate limit hit', code: 131026 },
      }),
    } as any);

    mockPrisma.message.update.mockResolvedValue({});
    mockPrisma.broadcastRecipient.update.mockResolvedValue({});

    const job = {
      id: 'job-outbound-1',
      name: 'send-message',
      attemptsMade: 3,
      data: {
        tenantId: 'tenant-123',
        messageId: 'broadcast_rcp-456',
        to: '8801700000000',
        type: 'text',
        content: 'Hello',
        conversationId: 'conv-123',
        channelConnectionId: 'conn-1',
      },
    } as Job;

    await expect(whatsappProcessor.process(job)).rejects.toThrow('Meta API Error');

    expect(mockPrisma.broadcastRecipient.update).toHaveBeenCalledWith({
      where: { id: 'rcp-456' },
      data: { status: 'failed' },
    });
  });

  it('should handle onFailed worker event and update DLQ failed recipient status without crashing', async () => {
    mockPrisma.broadcastRecipient.update.mockResolvedValue({});

    const job = {
      id: 'job-failed-dlq',
      attemptsMade: 3,
      data: {
        messageId: 'broadcast_rcp-789',
      },
    } as Job;

    await whatsappProcessor.onFailed(job, new Error('Meta API Rate limit hit'));

    expect(mockPrisma.broadcastRecipient.update).toHaveBeenCalledWith({
      where: { id: 'rcp-789' },
      data: { status: 'failed' },
    });
  });
});

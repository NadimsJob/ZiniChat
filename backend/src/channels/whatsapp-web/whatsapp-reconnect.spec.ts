jest.mock('@whiskeysockets/baileys', () => ({
  __esModule: true,
  default: jest.fn(),
  useMultiFileAuthState: jest.fn().mockResolvedValue({ state: {}, saveCreds: jest.fn() }),
  DisconnectReason: {
    loggedOut: 401,
    connectionReplaced: 440,
  },
  fetchLatestBaileysVersion: jest.fn().mockResolvedValue({ version: [2, 3000, 0] }),
  downloadMediaMessage: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappWebService } from './whatsapp-web.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InboxGateway } from '../../inbox/inbox.gateway';
import { InboxService } from '../../inbox/inbox.service';
import { BillingService } from '../../billing/billing.service';
import { NotificationsService } from '../../notifications/notifications.service';
import makeWASocket from '@whiskeysockets/baileys';

describe('WhatsappWebService - Baileys Auto-Reconnect & Disconnect Notification System', () => {
  let service: WhatsappWebService;

  const mockPrisma = {
    channelConnection: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: 'conn-1' }),
    },
  };

  const mockInboxGateway = {
    broadcastToTenant: jest.fn(),
  };

  const mockInboxService = {
    handleIncomingMessage: jest.fn(),
  };

  const mockBillingService = {
    getTenantQuotas: jest.fn().mockResolvedValue({ currentWhatsapp: 0, whatsappLimit: 5 }),
  };

  const mockNotificationsService = {
    createNotificationForTenantAdmins: jest.fn().mockResolvedValue([]),
  };

  const mockSocketEv = {
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  const mockSocket = {
    ev: mockSocketEv,
    ws: { readyState: 1, close: jest.fn() },
    user: { id: '8801700000000:1@s.whatsapp.net' },
    end: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (makeWASocket as jest.Mock).mockReturnValue(mockSocket);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappWebService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InboxGateway, useValue: mockInboxGateway },
        { provide: InboxService, useValue: mockInboxService },
        { provide: BillingService, useValue: mockBillingService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<WhatsappWebService>(WhatsappWebService);
  });

  it('should trigger disconnect alerts and update status when connection is loggedOut', async () => {
    await service.initSocket('tenant-1');

    const updateCallback = mockSocketEv.on.mock.calls.find(call => call[0] === 'connection.update')?.[1];
    expect(updateCallback).toBeDefined();

    updateCallback({
      connection: 'close',
      lastDisconnect: {
        error: {
          output: { statusCode: 401 },
        },
      },
    });

    expect(mockPrisma.channelConnection.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', provider: 'WEB_QR' },
      data: { status: 'disconnected', qrStatus: 'DISCONNECTED' },
    });

    expect(mockInboxGateway.broadcastToTenant).toHaveBeenCalledWith(
      'tenant-1',
      'whatsapp:disconnected',
      expect.objectContaining({ status: 'disconnected' })
    );

    expect(mockNotificationsService.createNotificationForTenantAdmins).toHaveBeenCalledWith(
      'tenant-1',
      '🚨 WhatsApp Web Disconnected',
      expect.stringContaining('Please rescan the QR code'),
      'info'
    );
  });

  it('should schedule auto-reconnect with exponential backoff on temporary network drop', async () => {
    jest.useFakeTimers();

    await service.initSocket('tenant-1');

    const updateCallback = mockSocketEv.on.mock.calls.find(call => call[0] === 'connection.update')?.[1];

    mockSocket.ws.readyState = 3; // Closed socket

    updateCallback({
      connection: 'close',
      lastDisconnect: {
        error: {
          output: { statusCode: 503 },
        },
      },
    });

    expect(makeWASocket).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(3000);
    expect(makeWASocket).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('should stop reconnecting after 5 attempts and trigger disconnect alerts', async () => {
    jest.useFakeTimers();

    await service.initSocket('tenant-1');
    const updateCallback = mockSocketEv.on.mock.calls.find(call => call[0] === 'connection.update')?.[1];

    for (let i = 1; i <= 5; i++) {
      updateCallback({
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 500 } } },
      });
    }

    updateCallback({
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 500 } } },
    });

    expect(mockNotificationsService.createNotificationForTenantAdmins).toHaveBeenCalledWith(
      'tenant-1',
      '🚨 WhatsApp Web Disconnected',
      expect.stringContaining('Please rescan the QR code'),
      'info'
    );

    jest.useRealTimers();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappWebService } from './whatsapp-web.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InboxGateway } from '../../inbox/inbox.gateway';
import { InboxService } from '../../inbox/inbox.service';
import { BillingService } from '../../billing/billing.service';
import { ForbiddenException } from '@nestjs/common';

// Mock Baileys entirely — we don't want real WebSocket connections in tests
jest.mock('@whiskeysockets/baileys', () => {
  const mockSocket = {
    ev: { on: jest.fn() },
    authState: { creds: { me: { id: '8801700000000:1@s.whatsapp.net' } } },
    ws: { close: jest.fn() },
    logout: jest.fn().mockResolvedValue(undefined),
    requestPairingCode: jest.fn().mockResolvedValue('123-456'),
    updateMediaMessage: jest.fn(),
  };
  const makeWASocket = jest.fn().mockReturnValue(mockSocket);
  return {
    __esModule: true,
    default: makeWASocket,
    makeWASocket,
    useMultiFileAuthState: jest.fn().mockResolvedValue({ state: {}, saveCreds: jest.fn() }),
    fetchLatestBaileysVersion: jest.fn().mockResolvedValue({ version: [2, 3000, 0] }),
    DisconnectReason: { loggedOut: 401 },
    downloadMediaMessage: jest.fn().mockResolvedValue(Buffer.from('test')),
    Browsers: { ubuntu: jest.fn().mockReturnValue(['Ubuntu', 'Chrome', '20.0']) },
  };
});


const mockPrisma = {
  channelConnection: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(0),
  },
};


const mockInboxGateway = {
  broadcastToTenant: jest.fn(),
};

const mockInboxService = {
  handleIncomingMessage: jest.fn(),
};

const mockBillingService = {
  getTenantQuotas: jest.fn(),
};

describe('WhatsappWebService', () => {
  let service: WhatsappWebService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappWebService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InboxGateway, useValue: mockInboxGateway },
        { provide: InboxService, useValue: mockInboxService },
        { provide: BillingService, useValue: mockBillingService },
      ],
    }).compile();

    service = module.get<WhatsappWebService>(WhatsappWebService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startQr — quota guard', () => {
    it('should throw ForbiddenException when WhatsApp limit is reached', async () => {
      mockBillingService.getTenantQuotas.mockResolvedValue({
        whatsappLimit: 1,
        currentWhatsapp: 1, // already at limit
      });

      await expect(service.startQr('tenant-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when a WEB_QR session already exists', async () => {
      mockBillingService.getTenantQuotas.mockResolvedValue({
        whatsappLimit: 3,
        currentWhatsapp: 1, // under limit but...
      });
      mockPrisma.channelConnection.findFirst.mockResolvedValue({
        id: 'existing-conn',
        provider: 'WEB_QR',
        status: 'active',
      });

      await expect(service.startQr('tenant-1')).rejects.toThrow(
        /WhatsApp Web \(QR\) session already exists/
      );
    });

    it('should NOT throw when quota has space and no existing WEB_QR session', async () => {
      mockBillingService.getTenantQuotas.mockResolvedValue({
        whatsappLimit: 2,
        currentWhatsapp: 0,
      });
      mockPrisma.channelConnection.findFirst.mockResolvedValue(null); // no existing WEB_QR
      // initSocket calls Baileys which is mocked — should not throw
      await expect(service.startQr('tenant-free')).resolves.not.toThrow();
    });
  });

  describe('startPairing — quota guard', () => {
    it('should throw ForbiddenException when at WhatsApp limit', async () => {
      mockBillingService.getTenantQuotas.mockResolvedValue({
        whatsappLimit: 1,
        currentWhatsapp: 1,
      });

      await expect(
        service.startPairing('tenant-1', '8801700000000')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when WEB_QR session already exists', async () => {
      mockBillingService.getTenantQuotas.mockResolvedValue({
        whatsappLimit: 5,
        currentWhatsapp: 1,
      });
      mockPrisma.channelConnection.findFirst.mockResolvedValue({ id: 'conn-1', provider: 'WEB_QR' });

      await expect(
        service.startPairing('tenant-1', '8801700000000')
      ).rejects.toThrow(/WhatsApp Web \(QR\) session already exists/);
    });
  });

  describe('connectionId caching', () => {
    it('should expose the connectionIds map (private state) via the service', () => {
      // The map is private but we can verify the service instance is created and ready
      expect(service).toBeInstanceOf(WhatsappWebService);
      // In a real integration test, we'd verify that after 'connection.update open',
      // the connectionIds map has the tenantId → connectionId entry.
      // Here we verify the map exists on the service prototype level via reflection.
      expect((service as any).connectionIds).toBeInstanceOf(Map);
    });

    it('should initialize connectionIds as empty map on startup', () => {
      expect((service as any).connectionIds.size).toBe(0);
    });
  });

  describe('logout', () => {
    it('should remove connectionId from cache on logout', async () => {
      // Pre-populate cache
      (service as any).connectionIds.set('tenant-logout', 'conn-123');
      expect((service as any).connectionIds.has('tenant-logout')).toBe(true);

      await service.logout('tenant-logout');

      expect((service as any).connectionIds.has('tenant-logout')).toBe(false);
    });
  });
});

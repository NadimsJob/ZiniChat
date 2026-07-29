// Mock Baileys before any imports that transitively require it
jest.mock('@whiskeysockets/baileys', () => {
  const mockSocket = {
    ev: { on: jest.fn() },
    authState: { creds: { me: { id: '8801700000000:1@s.whatsapp.net' } } },
    ws: { close: jest.fn() },
    logout: jest.fn().mockResolvedValue(undefined),
    requestPairingCode: jest.fn().mockResolvedValue('123-456'),
  };
  const makeWASocket = jest.fn().mockReturnValue(mockSocket);
  return {
    __esModule: true,
    default: makeWASocket,
    makeWASocket,
    useMultiFileAuthState: jest.fn().mockResolvedValue({ state: {}, saveCreds: jest.fn() }),
    fetchLatestBaileysVersion: jest.fn().mockResolvedValue({ version: [2, 3000, 0] }),
    DisconnectReason: { loggedOut: 401 },
    downloadMediaMessage: jest.fn().mockResolvedValue(Buffer.from('fake')),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappAuthService } from './whatsapp-auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { BillingService } from '../../billing/billing.service';
import { WhatsappWebService } from '../whatsapp-web/whatsapp-web.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('WhatsappAuthService', () => {
  let service: WhatsappAuthService;
  let prisma: any;
  let billingService: any;

  const mockPrisma = {
    channelConnection: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    facebookAuthConfig: {
      findFirst: jest.fn(),
    },
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(true),
  };

  const mockBillingService = {
    getTenantQuotas: jest.fn().mockResolvedValue({ whatsappLimit: 2 }),
  };

  const mockWhatsappWebService = {
    cleanupSession: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: BillingService, useValue: mockBillingService },
        { provide: WhatsappWebService, useValue: mockWhatsappWebService },
      ],
    }).compile();

    service = module.get<WhatsappAuthService>(WhatsappAuthService);
    prisma = module.get<PrismaService>(PrismaService);
    billingService = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConnections', () => {
    it('should return channel connections for tenant', async () => {
      const mockConnections = [{ id: 'conn-1', displayName: 'WA Official' }];
      mockPrisma.channelConnection.findMany.mockResolvedValue(mockConnections);

      const result = await service.getConnections('tenant-1');
      expect(mockPrisma.channelConnection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', channelType: 'whatsapp' },
        })
      );
      expect(result).toEqual(mockConnections);
    });
  });

  describe('toggleAiReply', () => {
    it('should toggle AI auto-reply for valid connection', async () => {
      mockPrisma.channelConnection.findUnique.mockResolvedValue({ id: 'conn-1', tenantId: 'tenant-1' });
      mockPrisma.channelConnection.update.mockResolvedValue({ id: 'conn-1', isAiAutoReplyEnabled: true });

      const result = await service.toggleAiReply('tenant-1', 'conn-1', true);
      expect(mockPrisma.channelConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
        data: { isAiAutoReplyEnabled: true },
      });
      expect(result.isAiAutoReplyEnabled).toBe(true);
    });

    it('should throw NotFoundException if connection does not belong to tenant', async () => {
      mockPrisma.channelConnection.findUnique.mockResolvedValue(null);
      await expect(service.toggleAiReply('tenant-1', 'invalid-conn', true)).rejects.toThrow(NotFoundException);
    });
  });

  describe('connectManual', () => {
    it('should throw ForbiddenException if channel quota is reached', async () => {
      mockBillingService.getTenantQuotas.mockResolvedValue({ whatsappLimit: 1 });
      mockPrisma.channelConnection.count.mockResolvedValue(1);

      await expect(
        service.connectManual('tenant-1', {
          phoneNumberId: 'phone-123',
          wabaId: 'waba-123',
          accessToken: 'token-123',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if required credentials are missing', async () => {
      mockBillingService.getTenantQuotas.mockResolvedValue({ whatsappLimit: 2 });
      mockPrisma.channelConnection.count.mockResolvedValue(0);

      await expect(service.connectManual('tenant-1', {})).rejects.toThrow(BadRequestException);
    });
  });
});

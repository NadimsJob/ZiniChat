import { Test, TestingModule } from '@nestjs/testing';
import { BroadcastsService } from './broadcasts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('BroadcastsService', () => {
  let service: BroadcastsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    channelConnection: {
      findFirst: jest.fn(),
    },
    facebookAuthConfig: {
      findFirst: jest.fn(),
    },
    template: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    broadcast: {
      findMany: jest.fn(),
      create: jest.fn(),
    }
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: 'BullQueue_broadcasts',
          useValue: mockQueue,
        }
      ],
    }).compile();

    service = module.get<BroadcastsService>(BroadcastsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAccessControl', () => {
    it('should throw NotFoundException if tenant is not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);
      await expect(service.checkAccessControl('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if broadcast feature is not in plan', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        subscriptions: [{ plan: { features: ['whatsapp', 'messenger'] } }]
      });
      await expect(service.checkAccessControl('tenant-1')).rejects.toThrow(ForbiddenException);
    });

    it('should return true if broadcast feature is in customFeatures', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customFeatures: ['whatsapp', 'broadcast'],
        subscriptions: [{ plan: { features: ['whatsapp'] } }]
      });
      const result = await service.checkAccessControl('tenant-1');
      expect(result).toBe(true);
    });
  });

  describe('createTemplate', () => {
    it('should throw BadRequestException if template name is invalid format', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customFeatures: ['broadcast']
      });

      await expect(service.createTemplate('tenant-1', {
        name: 'Invalid Name With Spaces',
        category: 'MARKETING',
        bodyText: 'Hello'
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no active WABA connection found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customFeatures: ['broadcast']
      });
      mockPrismaService.channelConnection.findFirst.mockResolvedValue(null);

      await expect(service.createTemplate('tenant-1', {
        name: 'valid_name_2026',
        category: 'MARKETING',
        bodyText: 'Hello'
      })).rejects.toThrow(BadRequestException);
    });

    it('should successfully create template with mock credentials', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customFeatures: ['broadcast']
      });
      mockPrismaService.channelConnection.findFirst.mockResolvedValue({
        wabaId: 'mock_waba_123',
        accessTokenEncrypted: 'mock_token_123'
      });
      mockPrismaService.template.create.mockImplementation(({ data }) => Promise.resolve({ id: 'tpl-1', ...data }));

      const res = await service.createTemplate('tenant-1', {
        name: 'eid_offer_2026',
        category: 'MARKETING',
        bodyText: 'Hello {{1}}, get {{2}}% off!',
        bodySamples: ['Rahim', '20']
      });

      expect(res).toBeDefined();
      expect(res.name).toBe('eid_offer_2026');
      expect(res.status).toBe('PENDING');
      expect(mockPrismaService.template.create).toHaveBeenCalled();
    });
  });

  describe('handleMetaWebhookTemplateEvent', () => {
    it('should update template status to APPROVED and create notification', async () => {
      mockPrismaService.template.findFirst.mockResolvedValue({
        id: 'tpl-1',
        name: 'eid_offer_2026',
        tenantId: 'tenant-1'
      });
      mockPrismaService.template.update.mockResolvedValue({
        id: 'tpl-1',
        name: 'eid_offer_2026',
        status: 'APPROVED'
      });
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });

      const res = await service.handleMetaWebhookTemplateEvent({
        event: 'APPROVED',
        message_template_name: 'eid_offer_2026',
        message_template_id: 'meta-123'
      });

      expect(res).toBeDefined();
      expect(mockPrismaService.template.update).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
        data: { status: 'APPROVED', rejectionReason: null }
      });
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });
  });
});

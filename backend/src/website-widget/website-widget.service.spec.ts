import { Test, TestingModule } from '@nestjs/testing';
import { WebsiteWidgetService, CreateWidgetDto } from './website-widget.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

// ─── Mock Factories ──────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid-001';
const WIDGET_ID = 'widget-uuid-001';
const WIDGET_TOKEN = 'token-uuid-abc';
const INBOX_ID = 'inbox-uuid-001';

const mockTenant = {
  id: TENANT_ID,
  businessName: 'Test Business',
  customWebsiteWidgetLimit: null,
};

const mockPlan = {
  id: 'plan-uuid-001',
  name: 'Pro',
  websiteWidgetLimit: 2,
};

const mockActiveSub = {
  plan: mockPlan,
  status: 'active',
  currentPeriodEnd: new Date(Date.now() + 86400000 * 30),
};

const mockWidget = {
  id: WIDGET_ID,
  tenantId: TENANT_ID,
  widgetToken: WIDGET_TOKEN,
  type: 'LIVE_CHAT',
  name: 'Test Widget',
  domain: 'example.com',
  primaryColor: '#1F824A',
  heading: 'Chat with us',
  tagline: 'We are here to help.',
  greetingEnabled: false,
  whatsappInboxId: null,
  isActive: true,
  createdAt: new Date(),
};

const mockWhatsappInbox = {
  id: INBOX_ID,
  tenantId: TENANT_ID,
  channelType: 'whatsapp',
  status: 'active',
};

// ─── PrismaService Mock ──────────────────────────────────────────────────────

const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
  },
  websiteWidget: {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  channelConnection: {
    findFirst: jest.fn(),
  },
};

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('WebsiteWidgetService', () => {
  let service: WebsiteWidgetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsiteWidgetService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WebsiteWidgetService>(WebsiteWidgetService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // ─── getWidgets ─────────────────────────────────────────────────────────────

  describe('getWidgets()', () => {
    it('should return active widgets scoped to the tenant', async () => {
      mockPrisma.websiteWidget.findMany.mockResolvedValue([mockWidget]);

      const result = await service.getWidgets(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe(TENANT_ID);
      expect(mockPrisma.websiteWidget.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no widgets exist', async () => {
      mockPrisma.websiteWidget.findMany.mockResolvedValue([]);

      const result = await service.getWidgets(TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  // ─── createWidget — success ──────────────────────────────────────────────────

  describe('createWidget() — success cases', () => {
    beforeEach(() => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.subscription.findFirst.mockResolvedValue(mockActiveSub);
      mockPrisma.websiteWidget.count.mockResolvedValue(0); // 0 existing widgets
    });

    it('should create a LIVE_CHAT widget when quota is available', async () => {
      mockPrisma.websiteWidget.create.mockResolvedValue(mockWidget);

      const dto: CreateWidgetDto = {
        type: 'LIVE_CHAT',
        name: 'Test Widget',
        domain: 'example.com',
        primaryColor: '#1F824A',
        heading: 'Chat with us',
        tagline: 'We are here to help.',
        greetingEnabled: false,
      };

      const result = await service.createWidget(TENANT_ID, dto);

      expect(result).toEqual(mockWidget);
      expect(mockPrisma.websiteWidget.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          type: 'LIVE_CHAT',
          name: 'Test Widget',
          domain: 'example.com',
        }),
      });
    });

    it('should create a WHATSAPP widget when inbox is verified', async () => {
      const whatsappWidget = { ...mockWidget, type: 'WHATSAPP', whatsappInboxId: INBOX_ID };
      mockPrisma.channelConnection.findFirst.mockResolvedValue(mockWhatsappInbox);
      mockPrisma.websiteWidget.create.mockResolvedValue(whatsappWidget);

      const dto: CreateWidgetDto = {
        type: 'WHATSAPP',
        name: 'WA Widget',
        whatsappInboxId: INBOX_ID,
      };

      const result = await service.createWidget(TENANT_ID, dto);

      expect(result.type).toBe('WHATSAPP');
      expect(mockPrisma.channelConnection.findFirst).toHaveBeenCalledWith({
        where: {
          id: INBOX_ID,
          tenantId: TENANT_ID,
          channelType: 'whatsapp',
          status: { in: ['active', 'connected'] },
        },
      });
    });

    it('should respect customWebsiteWidgetLimit over plan limit', async () => {
      const tenantWithCustomLimit = { ...mockTenant, customWebsiteWidgetLimit: 5 };
      mockPrisma.tenant.findUnique.mockResolvedValue(tenantWithCustomLimit);
      mockPrisma.websiteWidget.count.mockResolvedValue(4); // 4 existing, custom limit 5
      mockPrisma.websiteWidget.create.mockResolvedValue(mockWidget);

      const dto: CreateWidgetDto = { type: 'LIVE_CHAT', name: 'Widget' };
      const result = await service.createWidget(TENANT_ID, dto);

      expect(result).toBeDefined();
      expect(mockPrisma.websiteWidget.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── createWidget — quota enforcement ───────────────────────────────────────

  describe('createWidget() — quota enforcement', () => {
    it('should throw ForbiddenException when plan limit is 0 (feature disabled)', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.subscription.findFirst.mockResolvedValue({
        ...mockActiveSub,
        plan: { ...mockPlan, websiteWidgetLimit: 0 },
      });
      mockPrisma.websiteWidget.count.mockResolvedValue(0);

      const dto: CreateWidgetDto = { type: 'LIVE_CHAT', name: 'Widget' };

      await expect(service.createWidget(TENANT_ID, dto)).rejects.toThrow(ForbiddenException);
      await expect(service.createWidget(TENANT_ID, dto)).rejects.toThrow(
        'does not include website widgets',
      );
    });

    it('should throw ForbiddenException when current count meets plan limit', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.subscription.findFirst.mockResolvedValue(mockActiveSub); // limit = 2
      mockPrisma.websiteWidget.count.mockResolvedValue(2); // already at limit

      const dto: CreateWidgetDto = { type: 'LIVE_CHAT', name: 'Widget' };

      await expect(service.createWidget(TENANT_ID, dto)).rejects.toThrow(ForbiddenException);
      await expect(service.createWidget(TENANT_ID, dto)).rejects.toThrow(
        'allows 2 website widgets',
      );
    });

    it('should throw ForbiddenException when no active subscription and default limit is 0', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.subscription.findFirst.mockResolvedValue(null); // no subscription
      mockPrisma.websiteWidget.count.mockResolvedValue(0);

      const dto: CreateWidgetDto = { type: 'LIVE_CHAT', name: 'Widget' };

      await expect(service.createWidget(TENANT_ID, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── createWidget — WHATSAPP validation ─────────────────────────────────────

  describe('createWidget() — WHATSAPP type validation', () => {
    beforeEach(() => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.subscription.findFirst.mockResolvedValue(mockActiveSub);
      mockPrisma.websiteWidget.count.mockResolvedValue(0);
    });

    it('should throw BadRequestException when WHATSAPP type missing whatsappInboxId', async () => {
      const dto: CreateWidgetDto = { type: 'WHATSAPP', name: 'WA Widget' }; // no inboxId

      await expect(service.createWidget(TENANT_ID, dto)).rejects.toThrow(BadRequestException);
      await expect(service.createWidget(TENANT_ID, dto)).rejects.toThrow(
        'WhatsApp inbox ID is required',
      );
    });

    it('should throw NotFoundException when whatsappInboxId does not exist for tenant', async () => {
      mockPrisma.channelConnection.findFirst.mockResolvedValue(null); // inbox not found

      const dto: CreateWidgetDto = {
        type: 'WHATSAPP',
        name: 'WA Widget',
        whatsappInboxId: 'non-existent-inbox-id',
      };

      await expect(service.createWidget(TENANT_ID, dto)).rejects.toThrow(NotFoundException);
      await expect(service.createWidget(TENANT_ID, dto)).rejects.toThrow(
        'No active WhatsApp inbox found',
      );
    });
  });

  // ─── getWidgetByToken (public endpoint) ─────────────────────────────────────

  describe('getWidgetByToken()', () => {
    it('should return widget config by public token', async () => {
      const publicWidget = { ...mockWidget, tenant: { id: TENANT_ID, businessName: 'Test', brandName: null } };
      mockPrisma.websiteWidget.findUnique.mockResolvedValue(publicWidget);

      const result = await service.getWidgetByToken(WIDGET_TOKEN);
      expect(result.widgetToken).toBe(WIDGET_TOKEN);
      expect(mockPrisma.websiteWidget.findUnique).toHaveBeenCalledWith({
        where: { widgetToken: WIDGET_TOKEN },
        select: expect.objectContaining({ widgetToken: true, type: true }),
      });
    });

    it('should throw NotFoundException when token is invalid', async () => {
      mockPrisma.websiteWidget.findUnique.mockResolvedValue(null);

      await expect(service.getWidgetByToken('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when widget is inactive', async () => {
      mockPrisma.websiteWidget.findUnique.mockResolvedValue({
        ...mockWidget,
        isActive: false,
        tenant: { id: TENANT_ID, businessName: 'Test', brandName: null },
      });

      await expect(service.getWidgetByToken(WIDGET_TOKEN)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteWidget ────────────────────────────────────────────────────────────

  describe('deleteWidget()', () => {
    it('should soft-delete (set isActive=false) a widget belonging to tenant', async () => {
      mockPrisma.websiteWidget.findFirst.mockResolvedValue(mockWidget);
      mockPrisma.websiteWidget.update.mockResolvedValue({ ...mockWidget, isActive: false });

      const result = await service.deleteWidget(TENANT_ID, WIDGET_ID);

      expect(result.isActive).toBe(false);
      expect(mockPrisma.websiteWidget.update).toHaveBeenCalledWith({
        where: { id: WIDGET_ID },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when widget does not belong to tenant', async () => {
      mockPrisma.websiteWidget.findFirst.mockResolvedValue(null); // not found

      await expect(service.deleteWidget(TENANT_ID, 'foreign-widget-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── tenant not found ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should throw NotFoundException when tenant does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.createWidget('non-existent-tenant', { type: 'LIVE_CHAT', name: 'W' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

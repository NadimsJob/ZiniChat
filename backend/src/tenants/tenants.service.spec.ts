import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmtpService } from '../smtp/smtp.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const TENANT_ID = 'tenant-uuid-111';
const ACTOR_ID = 'superadmin-uuid-999';
const PERIOD_START = new Date('2026-07-01T00:00:00.000Z');

describe('TenantsService - Plan Customization', () => {
  let service: TenantsService;
  let prisma: any;
  let billingService: any;
  let notificationsService: any;
  let smtpService: any;

  beforeEach(async () => {
    prisma = {
      tenant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      plan: {
        findFirst: jest.fn(),
      },
      aiConfig: {
        findFirst: jest.fn(),
      },
      message: {
        count: jest.fn(),
      },
      broadcastRecipient: {
        count: jest.fn(),
      },
      aiUsageLog: {
        count: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
      contact: {
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    billingService = {
      getActivePeriod: jest.fn().mockResolvedValue({ periodStart: PERIOD_START }),
      getTenantQuotas: jest.fn().mockResolvedValue({
        whatsappLimit: 1,
        messengerLimit: 1,
        instagramLimit: 1,
        websiteWidgetLimit: 0,
        productCatalogLimit: 50,
        contactsLimit: null,
        messageQuota: 100,
        aiQuota: 50,
        seatLimit: 1,
        storageLimitMb: 500,
        allowByok: false,
        features: ['ai_assistant'],
        currentWhatsapp: 0,
        currentMessenger: 0,
        currentInstagram: 0,
        currentWebsiteWidget: 0,
        basePlan: { name: 'Starter' },
      }),
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };

    smtpService = {
      triggerPlanCustomizedEmail: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BillingService, useValue: billingService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: SmtpService, useValue: smtpService },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  describe('customizePlan', () => {
    it('throws NotFoundException if tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.customizePlan(TENANT_ID, {}, ACTOR_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if customMessageQuota is less than current period message usage', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        businessName: 'Test Business',
        users: [{ id: 'user-1', email: 'owner@test.com', name: 'Owner' }],
      });
      prisma.message.count.mockResolvedValue(150);
      prisma.broadcastRecipient.count.mockResolvedValue(50); // total 200 used

      await expect(
        service.customizePlan(TENANT_ID, { customMessageQuota: 100 }, ACTOR_ID)
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if customSeatLimit is less than 1', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        businessName: 'Test Business',
        users: [],
      });

      await expect(
        service.customizePlan(TENANT_ID, { customSeatLimit: 0 }, ACTOR_ID)
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully updates custom limits, creates audit log, and notifies owner', async () => {
      const mockTenant = {
        id: TENANT_ID,
        businessName: 'Test Business',
        users: [{ id: 'user-1', email: 'owner@test.com', name: 'Owner' }],
      };
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.message.count.mockResolvedValue(10);
      prisma.broadcastRecipient.count.mockResolvedValue(0);
      prisma.tenant.update.mockResolvedValue({ ...mockTenant, customSeatLimit: 10, customMessageQuota: 5000 });

      const res = await service.customizePlan(
        TENANT_ID,
        { customSeatLimit: 10, customMessageQuota: 5000 },
        ACTOR_ID
      );

      expect(prisma.tenant.update).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUserId: ACTOR_ID,
          targetTenantId: TENANT_ID,
          action: 'CUSTOMIZED_TENANT_PLAN',
        })
      });
      expect(notificationsService.createNotification).toHaveBeenCalled();
      expect(smtpService.triggerPlanCustomizedEmail).toHaveBeenCalledWith(
        'owner@test.com',
        'Test Business',
        expect.stringContaining('Team Members: 10')
      );
      expect(res.customSeatLimit).toBe(10);
    });
  });

  describe('resetCustomizations', () => {
    it('resets all custom fields to null and creates audit log', async () => {
      const mockTenant = {
        id: TENANT_ID,
        businessName: 'Test Business',
        users: [{ id: 'user-1', email: 'owner@test.com' }],
      };
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.tenant.update.mockResolvedValue({ ...mockTenant, customSeatLimit: null });

      const res = await service.resetCustomizations(TENANT_ID, ACTOR_ID);

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TENANT_ID },
          data: expect.objectContaining({
            customSeatLimit: null,
            customMessageQuota: null,
            customPlanUpdatedBy: ACTOR_ID,
          }),
        })
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'RESET_TENANT_CUSTOM_PLAN',
        })
      });
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });
  });

  describe('getForCustomizeModal', () => {
    it('returns tenant, basePlan, and current usage stats', async () => {
      const mockTenant = {
        id: TENANT_ID,
        businessName: 'Test Business',
        storageUsedBytes: BigInt(10485760), // 10MB
        users: [{ id: 'u1' }, { id: 'u2' }],
        subscriptions: [{ status: 'active', plan: { name: 'Starter' } }],
      };
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.message.count.mockResolvedValue(15);
      prisma.broadcastRecipient.count.mockResolvedValue(5);
      prisma.aiUsageLog.count.mockResolvedValue(8);
      prisma.product.count.mockResolvedValue(4);
      prisma.contact.count.mockResolvedValue(12);

      const res = await service.getForCustomizeModal(TENANT_ID);

      expect(res.currentUsage.seatsUsed).toBe(2);
      expect(res.currentUsage.messagesUsed).toBe(20);
      expect(res.currentUsage.aiUsed).toBe(8);
      expect(res.currentUsage.storageUsedMb).toBe(10);
      expect(res.currentUsage.productsCount).toBe(4);
      expect(res.currentUsage.contactsCount).toBe(12);
    });
  });

  describe('getEffectivePlan', () => {
    it('returns effective plan structure with isCustomized boolean', async () => {
      const mockTenant = {
        id: TENANT_ID,
        customSeatLimit: 5,
        customPlanUpdatedBy: 'superadmin-1',
        customPlanUpdatedAt: new Date(),
        users: [{ name: 'Owner', email: 'owner@test.com' }],
      };
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.findUnique.mockResolvedValue({ email: 'admin@zinichat.com', name: 'Super Admin' });

      const res = await service.getEffectivePlan(TENANT_ID);

      expect(res.isCustomized).toBe(true);
      expect(res.customPlanUpdatedByEmail).toBe('admin@zinichat.com');
    });
  });
});

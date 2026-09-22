import { Test, TestingModule } from '@nestjs/testing';
import { CapiHubService } from './capi-hub.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { FeatureRolloutService } from '../feature-rollout/feature-rollout.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const TENANT_ID = 'tenant-uuid-1';

describe('CapiHubService', () => {
  let service: CapiHubService;
  let prisma: any;
  let crypto: any;
  let featureRollout: any;
  let capiQueue: any;

  beforeEach(async () => {
    prisma = {
      tenantCapiIntegration: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      tenantCapiEventConfig: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      capiEventLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    crypto = {
      encrypt: jest.fn().mockReturnValue('encrypted-token'),
      decrypt: jest.fn().mockReturnValue('decrypted-token'),
    };

    featureRollout = {
      isFeatureEnabled: jest.fn().mockResolvedValue(true),
    };

    capiQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapiHubService,
        { provide: PrismaService, useValue: prisma },
        { provide: CryptoService, useValue: crypto },
        { provide: FeatureRolloutService, useValue: featureRollout },
        { provide: getQueueToken('capi-events'), useValue: capiQueue },
      ],
    }).compile();

    service = module.get<CapiHubService>(CapiHubService);
  });

  describe('createOrUpdateIntegration', () => {
    it('throws ForbiddenException if capi_hub feature is disabled', async () => {
      featureRollout.isFeatureEnabled.mockResolvedValue(false);
      await expect(
        service.createOrUpdateIntegration(TENANT_ID, { pixelId: '123', accessToken: 'abc' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates new integration if none exists', async () => {
      prisma.tenantCapiIntegration.findUnique.mockResolvedValue(null);
      prisma.tenantCapiIntegration.create.mockResolvedValue({ id: 'int-1' });

      const result = await service.createOrUpdateIntegration(TENANT_ID, { pixelId: '123', accessToken: 'abc' });
      
      expect(prisma.tenantCapiIntegration.create).toHaveBeenCalled();
      expect((result as any).unhashedWebhookSecret).toBeDefined();
    });

    it('updates existing integration', async () => {
      prisma.tenantCapiIntegration.findUnique.mockResolvedValue({ id: 'int-1' });
      prisma.tenantCapiIntegration.update.mockResolvedValue({ id: 'int-1' });

      await service.createOrUpdateIntegration(TENANT_ID, { pixelId: '123', accessToken: 'abc' });
      
      expect(prisma.tenantCapiIntegration.update).toHaveBeenCalled();
    });
  });

  describe('fireEvent', () => {
    it('does nothing if feature flag is disabled', async () => {
      featureRollout.isFeatureEnabled.mockResolvedValue(false);
      await service.fireEvent(TENANT_ID, 'Purchase', {}, 'order');
      expect(prisma.capiEventLog.create).not.toHaveBeenCalled();
    });

    it('does nothing if integration is missing or inactive', async () => {
      prisma.tenantCapiIntegration.findUnique.mockResolvedValue({ isActive: false });
      await service.fireEvent(TENANT_ID, 'Purchase', {}, 'order');
      expect(prisma.capiEventLog.create).not.toHaveBeenCalled();
    });

    it('does nothing if event config is disabled', async () => {
      prisma.tenantCapiIntegration.findUnique.mockResolvedValue({ isActive: true, id: 'int-1' });
      prisma.tenantCapiEventConfig.findUnique.mockResolvedValue({ isEnabled: false });
      await service.fireEvent(TENANT_ID, 'Purchase', {}, 'order');
      expect(prisma.capiEventLog.create).not.toHaveBeenCalled();
    });

    it('fires event and adds to BullMQ queue', async () => {
      prisma.tenantCapiIntegration.findUnique.mockResolvedValue({ isActive: true, id: 'int-1', pixelId: 'px1' });
      prisma.tenantCapiEventConfig.findUnique.mockResolvedValue({
        isEnabled: true,
        sourceOrderCompleted: true,
        includeUserData: true,
        includeValue: true,
      });
      prisma.capiEventLog.create.mockResolvedValue({ id: 'log-1' });

      const payload = {
        user_data: { em: 'test@example.com' },
        custom_data: { value: 100 },
      };

      await service.fireEvent(TENANT_ID, 'Purchase', payload, 'order');
      
      expect(prisma.capiEventLog.create).toHaveBeenCalled();
      expect(capiQueue.add).toHaveBeenCalledWith('send-capi-event', expect.objectContaining({
        logId: 'log-1',
        tenantId: TENANT_ID,
        pixelId: 'px1',
      }), expect.any(Object));
    });
  });
});

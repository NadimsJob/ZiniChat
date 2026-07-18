import { Test, TestingModule } from '@nestjs/testing';
import { QuotaService } from './quota.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('QuotaService', () => {
  let service: QuotaService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            aiUsageLog: {
              aggregate: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkMessageQuota', () => {
    it('should throw ForbiddenException if tenant not found', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.checkMessageQuota('t1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if tenant is suspended', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({ status: 'suspended' });
      await expect(service.checkMessageQuota('t1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if quota is exceeded (using plan limit)', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 't1',
        status: 'active',
        messageCount: 100,
        customMessageQuota: null,
        subscriptions: [{ plan: { messageQuota: 100 } }],
      });
      await expect(service.checkMessageQuota('t1')).rejects.toThrow(/Message quota exceeded/);
    });

    it('should not throw if quota is not exceeded', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 't1',
        status: 'active',
        messageCount: 99,
        customMessageQuota: null,
        subscriptions: [{ plan: { messageQuota: 100 } }],
      });
      await expect(service.checkMessageQuota('t1')).resolves.toBeUndefined();
    });
  });

  describe('checkFeature', () => {
    it('should return false if tenant not found', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.checkFeature('t1', 'whatsapp_qr');
      expect(result).toBe(false);
    });

    it('should return true if feature is in customFeatures', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        customFeatures: ['whatsapp_qr'],
        subscriptions: [],
      });
      const result = await service.checkFeature('t1', 'whatsapp_qr');
      expect(result).toBe(true);
    });

    it('should return true if feature is in plan features', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        customFeatures: null,
        subscriptions: [{ plan: { features: ['commerce'] } }],
      });
      const result = await service.checkFeature('t1', 'commerce');
      expect(result).toBe(true);
    });

    it('should return false if feature is neither in plan nor custom', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
        customFeatures: null,
        subscriptions: [{ plan: { features: [] } }],
      });
      const result = await service.checkFeature('t1', 'missing_feature');
      expect(result).toBe(false);
    });
  });
});

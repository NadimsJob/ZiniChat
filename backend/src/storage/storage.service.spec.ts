import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { QuotaService } from '../tenants/quota.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StorageService', () => {
  let service: StorageService;
  let quotaService: any;
  let prismaService: any;

  const mockQuotaService = {
    checkStorageQuota: jest.fn().mockResolvedValue(true),
    incrementStorage: jest.fn().mockResolvedValue(true),
    decrementStorage: jest.fn().mockResolvedValue(true),
    resetStorage: jest.fn().mockResolvedValue(true),
  };

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'tenant-1',
        customStorageLimitMb: 500,
        subscriptions: [{ plan: { storageLimitMb: 500 } }]
      }),
    },
    knowledgeDocument: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    ticketMessage: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    message: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: QuotaService, useValue: mockQuotaService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    quotaService = module.get<QuotaService>(QuotaService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStorageStats', () => {
    it('should return categorized storage breakdown and limit', async () => {
      const stats = await service.getStorageStats('tenant-1');
      expect(stats.storageLimitMb).toBe(500);
      expect(stats.categories).toHaveProperty('chatMedia');
      expect(stats.categories).toHaveProperty('aiDocuments');
      expect(stats.categories).toHaveProperty('products');
      expect(stats.categories).toHaveProperty('tickets');
    });
  });

  describe('getStorageFiles', () => {
    it('should return empty list when no files on disk', async () => {
      const files = await service.getStorageFiles('tenant-1', 'chatMedia');
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('deleteMedia', () => {
    it('should return false if url does not match tenant path', async () => {
      const result = await service.deleteMedia('/uploads/tenants/other-tenant/file.png', 'tenant-1');
      expect(result).toBe(false);
      expect(mockQuotaService.decrementStorage).not.toHaveBeenCalled();
    });

    it('should execute unlinking and DB reference cleanup gracefully when file missing', async () => {
      const result = await service.deleteMedia('/uploads/tenants/tenant-1/missing.png', 'tenant-1');
      expect(result).toBe(true);
      expect(prismaService.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { tenantId: 'tenant-1', imageUrl: '/uploads/tenants/tenant-1/missing.png' }
      }));
    });
  });

  describe('clearAllMedia', () => {
    it('should reset storage and return true', async () => {
      const result = await service.clearAllMedia('tenant-1');
      expect(mockQuotaService.resetStorage).toHaveBeenCalledWith('tenant-1');
      expect(result).toBe(true);
    });
  });
});

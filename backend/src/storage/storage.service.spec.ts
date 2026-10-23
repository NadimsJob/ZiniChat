import { Test, TestingModule } from '@nestjs/testing';
import { StorageService, resolveLocalMediaPath } from './storage.service';
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
        storageUsedBytes: BigInt(0),
        customStorageLimitMb: 500,
        subscriptions: [{ plan: { storageLimitMb: 500 } }]
      }),
      update: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
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

  describe('uploadChatMedia', () => {
    it('should throw error if file is missing', async () => {
      await expect(service.uploadChatMedia(null as any, 'tenant-1')).rejects.toThrow('No media file provided');
    });

    it('should upload non-image raw media, check quota, and increment storage', async () => {
      const mockDoc: any = {
        originalname: 'invoice.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF-1.4 test document'),
      };

      const result = await service.uploadChatMedia(mockDoc, 'tenant-1');
      expect(mockQuotaService.checkStorageQuota).toHaveBeenCalledWith('tenant-1', 1024);
      expect(mockQuotaService.incrementStorage).toHaveBeenCalledWith('tenant-1', expect.any(Number));
      expect(result.publicUrl).toMatch(/^\/uploads\/tenants\/tenant-1\/chat_.*\.pdf$/);
      expect(result.mimeType).toBe('application/pdf');
    });
  });

  describe('resolveLocalMediaPath', () => {
    it('should return null for empty or non-string input', () => {
      expect(resolveLocalMediaPath(null)).toBeNull();
      expect(resolveLocalMediaPath(undefined)).toBeNull();
      expect(resolveLocalMediaPath('' as any)).toBeNull();
    });

    it('should not throw on non-existent path and return null', () => {
      const resolved = resolveLocalMediaPath('/uploads/tenants/non-existent/file.jpg', 'tenant-1');
      expect(resolved).toBeNull();
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

import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { QuotaService } from '../tenants/quota.service';

describe('StorageService', () => {
  let service: StorageService;
  let quotaService: any;

  const mockQuotaService = {
    checkStorageQuota: jest.fn().mockResolvedValue(true),
    incrementStorage: jest.fn().mockResolvedValue(true),
    decrementStorage: jest.fn().mockResolvedValue(true),
    resetStorage: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: QuotaService, useValue: mockQuotaService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    quotaService = module.get<QuotaService>(QuotaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deleteMedia', () => {
    it('should return false if url does not match tenant path', async () => {
      const result = await service.deleteMedia('/uploads/tenants/other-tenant/file.png', 'tenant-1');
      expect(result).toBe(false);
      expect(mockQuotaService.decrementStorage).not.toHaveBeenCalled();
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

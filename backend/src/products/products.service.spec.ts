import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let quotaService: any;

  const mockPrisma = {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockQuotaService = {
    checkProductCatalogQuota: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QuotaService, useValue: mockQuotaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
    quotaService = module.get<QuotaService>(QuotaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProducts', () => {
    it('should return products for tenant', async () => {
      const mockProducts = [{ id: 'prod-1', name: 'T-Shirt' }];
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getProducts('tenant-1');
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockProducts);
    });
  });

  describe('createProduct', () => {
    it('should check product catalog quota and create product', async () => {
      const mockProduct = { id: 'prod-1', name: 'T-Shirt', price: 500 };
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.createProduct('tenant-1', { name: 'T-Shirt', price: 500 });
      expect(mockQuotaService.checkProductCatalogQuota).toHaveBeenCalledWith('tenant-1');
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'T-Shirt',
          price: 500,
        }),
      });
      expect(result).toEqual(mockProduct);
    });
  });

  describe('updateProduct', () => {
    it('should update product if it exists for tenant', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', tenantId: 'tenant-1' });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', name: 'Updated T-Shirt' });

      const result = await service.updateProduct('tenant-1', 'prod-1', { name: 'Updated T-Shirt' });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: expect.objectContaining({ name: 'Updated T-Shirt' }),
      });
      expect(result.name).toBe('Updated T-Shirt');
    });

    it('should throw NotFoundException if product is not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(service.updateProduct('tenant-1', 'invalid-id', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product if found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', tenantId: 'tenant-1' });
      mockPrisma.product.delete.mockResolvedValue({ id: 'prod-1' });

      const result = await service.deleteProduct('tenant-1', 'prod-1');
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
      expect(result).toEqual({ success: true });
    });
  });
});

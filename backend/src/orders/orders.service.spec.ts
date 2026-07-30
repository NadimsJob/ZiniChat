import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../inbox/activity-log.service';
import { NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;

  const mockPrisma: any = {
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      update: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ActivityLogService, useValue: { record: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrders', () => {
    it('should return tenant orders with contacts and items', async () => {
      const mockOrders = [{ id: 'order-1', totalAmount: 1000 }];
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getOrders('tenant-1');
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockOrders);
    });
  });

  describe('createOrder', () => {
    it('should create order using server DB price and decrement product stock for tracked items', async () => {
      const mockOrder = { id: 'order-1', totalAmount: 1000, status: 'pending' };
      mockPrisma.order.create.mockResolvedValue(mockOrder);
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Shirt', price: 500, trackInventory: true, stockCount: 10, isActive: true });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', stockCount: 8 });

      const result = await service.createOrder('tenant-1', {
        contactId: 'contact-1',
        // Client sends forged priceAtTime: 1 BDT, server must ignore it and use DB price: 500
        items: [{ productId: 'prod-1', quantity: 2, priceAtTime: 1 }],
        notes: 'Express delivery',
      });

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'prod-1', tenantId: 'tenant-1', isActive: true },
      });
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalAmount: 1000,
          items: {
            create: [{ productId: 'prod-1', quantity: 2, priceAtTime: 500 }],
          },
        }),
      });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stockCount: { decrement: 2 } },
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if product is not found or inactive for tenant', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.createOrder('tenant-1', {
          contactId: 'contact-1',
          items: [{ productId: 'invalid-prod', quantity: 1 }],
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrderStatus', () => {
    it('should restock items when status is changed to cancelled', async () => {
      const mockOrder = {
        id: 'order-1',
        tenantId: 'tenant-1',
        status: 'pending',
        items: [{ productId: 'prod-1', quantity: 2 }],
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'cancelled' });
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', trackInventory: true });

      const result = await service.updateOrderStatus('tenant-1', 'order-1', 'cancelled');
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stockCount: { increment: 2 } },
      });
      expect(result.status).toBe('cancelled');
    });

    it('should throw NotFoundException if order does not exist for tenant', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(service.updateOrderStatus('tenant-1', 'invalid-id', 'delivered')).rejects.toThrow(NotFoundException);
    });
  });
});


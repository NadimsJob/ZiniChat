import { Test, TestingModule } from '@nestjs/testing';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: any;

  const mockPrisma: any = {
    coupon: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a coupon with uppercase code', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);
      mockPrisma.coupon.create.mockResolvedValue({ id: 'c-1', code: 'SAVE50' });

      const result = await service.create({ code: 'save50', discountType: 'percentage', discountAmount: 50 });
      expect(mockPrisma.coupon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ code: 'SAVE50', discountAmount: 50 }),
      });
      expect(result.code).toBe('SAVE50');
    });

    it('should throw BadRequestException if code already exists', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'c-1', code: 'SAVE50' });
      await expect(service.create({ code: 'save50', discountType: 'percentage', discountAmount: 50 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('validate', () => {
    it('should return coupon if valid and active', async () => {
      const mockCoupon = { id: 'c-1', code: 'SAVE50', isActive: true, usedCount: 1, maxUses: 10 };
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.validate('save50');
      expect(result).toEqual(mockCoupon);
    });

    it('should throw BadRequestException if coupon is inactive', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'c-1', code: 'SAVE50', isActive: false });
      await expect(service.validate('save50')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if max usage limit reached', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'c-1', code: 'SAVE50', isActive: true, usedCount: 10, maxUses: 10 });
      await expect(service.validate('save50')).rejects.toThrow(BadRequestException);
    });
  });
});

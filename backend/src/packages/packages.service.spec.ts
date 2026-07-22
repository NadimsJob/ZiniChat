import { Test, TestingModule } from '@nestjs/testing';
import { PackagesService } from './packages.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PackagesService', () => {
  let service: PackagesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    plan: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn()
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PackagesService>(PackagesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setDefaultPlan', () => {
    it('should throw NotFoundException if plan does not exist', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue(null);
      await expect(service.setDefaultPlan('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should update all plans to false and set target plan to true in a transaction', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue({ id: 'plan-123' });
      
      // We don't need to mock transaction callback here since the service uses an array transaction
      // e.g. await this.prisma.$transaction([ ... ])
      mockPrismaService.$transaction.mockResolvedValue([{ count: 5 }, { id: 'plan-123', isDefault: true }]);

      const result = await service.setDefaultPlan('plan-123');

      expect(mockPrismaService.plan.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false }
      });
      expect(mockPrismaService.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
        data: { isDefault: true }
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'Default plan updated' });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BroadcastsService } from './broadcasts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('BroadcastsService', () => {
  let service: BroadcastsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
    template: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    broadcast: {
      findMany: jest.fn(),
      create: jest.fn(),
    }
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: 'BullQueue_broadcasts',
          useValue: mockQueue,
        }
      ],
    }).compile();

    service = module.get<BroadcastsService>(BroadcastsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAccessControl', () => {
    it('should throw NotFoundException if tenant is not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);
      await expect(service.checkAccessControl('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if broadcast feature is not in plan', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        subscriptions: [{ plan: { features: ['whatsapp', 'messenger'] } }]
      });
      await expect(service.checkAccessControl('tenant-1')).rejects.toThrow(ForbiddenException);
    });

    it('should return true if broadcast feature is in customFeatures', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customFeatures: ['whatsapp', 'broadcast'],
        subscriptions: [{ plan: { features: ['whatsapp'] } }]
      });
      const result = await service.checkAccessControl('tenant-1');
      expect(result).toBe(true);
    });

    it('should return true if broadcast feature is in plan features', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        subscriptions: [{ plan: { features: ['whatsapp', 'broadcast'] } }]
      });
      const result = await service.checkAccessControl('tenant-1');
      expect(result).toBe(true);
    });
  });
});

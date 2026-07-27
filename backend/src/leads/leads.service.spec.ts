import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    kanbanStage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    contact: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    contactNote: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStages', () => {
    it('should return existing stages', async () => {
      const mockStages = [{ id: '1', name: 'Intake' }];
      mockPrismaService.kanbanStage.findMany.mockResolvedValue(mockStages);

      const result = await service.getStages('tenant1');
      expect(result).toEqual(mockStages);
      expect(mockPrismaService.kanbanStage.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant1' },
        orderBy: { order: 'asc' },
      });
    });

    it('should create defaults if no stages exist', async () => {
      mockPrismaService.kanbanStage.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: '1', name: 'Intake' }]);
      mockPrismaService.kanbanStage.createMany.mockResolvedValue({ count: 4 });

      const result = await service.getStages('tenant1');
      expect(result.length).toBe(1);
      expect(mockPrismaService.kanbanStage.createMany).toHaveBeenCalled();
    });
  });

  describe('getLeads', () => {
    it('should return contacts with stage and user', async () => {
      const mockContacts = [{ id: '1', name: 'John Doe' }];
      mockPrismaService.contact.findMany.mockResolvedValue(mockContacts);

      const result = await service.getLeads('tenant1');
      expect(result).toEqual(mockContacts);
      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { tenantId: 'tenant1' },
        include: expect.any(Object),
      }));
    });
  });

  describe('exportLeadsToExcel', () => {
    it('should return a buffer', async () => {
      const mockLeads = [
        {
          id: '1',
          name: 'Jane',
          stage: { name: 'Qualified' },
          conversations: [],
        }
      ];
      mockPrismaService.contact.findMany.mockResolvedValue(mockLeads);

      const result = await service.exportLeadsToExcel('tenant1');
      expect(Buffer.isBuffer(result)).toBeTruthy();
      expect(mockPrismaService.contact.findMany).toHaveBeenCalled();
    }, 15000); // Increased timeout for exceljs
  });
});

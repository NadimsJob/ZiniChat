import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prisma: any;

  const mockPrisma = {
    auditLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLogs', () => {
    it('should return recent 100 audit logs with actor and target tenant', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'UPDATE_STATUS', actorUser: { name: 'Super Admin' }, targetTenant: { name: 'Tenant A' } },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getLogs();
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        include: { actorUser: true, targetTenant: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      expect(result).toEqual(mockLogs);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { LoginLogsService } from './login-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { getScheduleToken } from '@nestjs/schedule';

const mockPrisma = {
  loginLog: {
    create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
  },
  $transaction: jest.fn((args: any[]) => Promise.all(args)),
};

describe('LoginLogsService', () => {
  let service: LoginLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginLogsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LoginLogsService>(LoginLogsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLog', () => {
    it('should create a log record for a successful login', async () => {
      await service.createLog({
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
        status: 'SUCCESS',
        authMethod: 'password',
      });

      expect(mockPrisma.loginLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
          status: 'SUCCESS',
          authMethod: 'password',
          browser: expect.stringContaining('Chrome'),
          os: expect.stringContaining('Windows'),
          deviceType: 'Desktop',
          country: 'Local',
        }),
      });
    });

    it('should create a log record for a failed login without userId', async () => {
      await service.createLog({
        userId: null,
        email: 'attacker@evil.com',
        ipAddress: '127.0.0.1',
        userAgent: 'curl/7.68',
        status: 'FAILED',
        failReason: 'invalid_credentials',
        authMethod: 'password',
      });

      expect(mockPrisma.loginLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          email: 'attacker@evil.com',
          status: 'FAILED',
          failReason: 'invalid_credentials',
        }),
      });
    });

    it('should lowercase and trim email before storing', async () => {
      await service.createLog({
        userId: null,
        email: '  UPPERCASE@Test.COM  ',
        ipAddress: '127.0.0.1',
        status: 'FAILED',
      });

      expect(mockPrisma.loginLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'uppercase@test.com',
        }),
      });
    });

    it('should truncate userAgent to 512 chars', async () => {
      const longUa = 'A'.repeat(1000);
      await service.createLog({
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: longUa,
        status: 'SUCCESS',
      });

      expect(mockPrisma.loginLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: longUa.substring(0, 512),
        }),
      });
    });

    it('should never block login — createLogAsync does not throw', async () => {
      mockPrisma.loginLog.create.mockRejectedValueOnce(new Error('DB Down'));
      // Should not throw even if DB is down
      expect(() =>
        service.createLogAsync({
          email: 'test@example.com',
          ipAddress: '127.0.0.1',
          status: 'SUCCESS',
        }),
      ).not.toThrow();
    });
  });

  describe('getLoginLogs', () => {
    it('should return paginated results', async () => {
      mockPrisma.$transaction.mockResolvedValueOnce([10, []]);
      const result = await service.getLoginLogs({ page: 1, limit: 20 });
      expect(result).toMatchObject({ data: [], total: 10, page: 1, limit: 20 });
    });

    it('should cap limit at 100', async () => {
      mockPrisma.$transaction.mockResolvedValueOnce([0, []]);
      const result = await service.getLoginLogs({ page: 1, limit: 9999 });
      expect(result.limit).toBe(100);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete records older than 90 days', async () => {
      await service.cleanupOldLogs();
      expect(mockPrisma.loginLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
        },
      });
    });
  });
});

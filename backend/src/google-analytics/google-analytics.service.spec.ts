import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAnalyticsService } from './google-analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GoogleAnalyticsService', () => {
  let service: GoogleAnalyticsService;
  let prisma: PrismaService;

  const mockConfig = {
    id: 'ga-config-id-1',
    measurementId: 'G-1234567890',
    apiSecret: 'encrypted-secret-123',
    isActive: true,
    trackPageView: true,
    trackSignup: true,
    trackCompleteReg: true,
    trackLogin: true,
    setupCompletedAt: new Date(),
    lastTestedAt: new Date(),
    testResult: 'success',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    googleAnalyticsConfig: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    googleAnalyticsEvent: {
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GoogleAnalyticsService>(GoogleAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Encryption & Decryption', () => {
    it('should encrypt and decrypt string accurately', () => {
      const originalText = 'my-secret-ga-api-token';
      const encrypted = service.encrypt(originalText);
      expect(encrypted).not.toEqual(originalText);
      expect(encrypted).toContain(':');

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toEqual(originalText);
    });

    it('should handle empty or null string gracefully in encrypt/decrypt', () => {
      expect(service.encrypt(null)).toEqual('');
      expect(service.encrypt('')).toEqual('');
      expect(service.decrypt(null)).toEqual('');
      expect(service.decrypt('raw-unencrypted-string')).toEqual('raw-unencrypted-string');
    });
  });

  describe('getConfig', () => {
    it('should return existing config if present', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue(mockConfig);
      const result = await service.getConfig();
      expect(result).toEqual(mockConfig);
      expect(mockPrismaService.googleAnalyticsConfig.findFirst).toHaveBeenCalled();
    });

    it('should create default config if not found', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue(null);
      mockPrismaService.googleAnalyticsConfig.create.mockResolvedValue(mockConfig);

      const result = await service.getConfig();
      expect(result).toEqual(mockConfig);
      expect(mockPrismaService.googleAnalyticsConfig.create).toHaveBeenCalled();
    });
  });

  describe('saveConfig', () => {
    it('should encrypt apiSecret and update existing config', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.googleAnalyticsConfig.update.mockResolvedValue({
        ...mockConfig,
        measurementId: 'G-NEWID999',
      });

      const result = await service.saveConfig({
        measurementId: 'G-NEWID999',
        apiSecret: 'new-secret',
        isActive: true,
      });

      expect(result.measurementId).toEqual('G-NEWID999');
      expect(mockPrismaService.googleAnalyticsConfig.update).toHaveBeenCalled();
    });

    it('should create new config if none exists during saveConfig', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue(null);
      mockPrismaService.googleAnalyticsConfig.create.mockResolvedValue(mockConfig);

      await service.saveConfig({
        measurementId: 'G-FIRST123',
        apiSecret: 'secret1',
      });

      expect(mockPrismaService.googleAnalyticsConfig.create).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should return error if measurementId is missing', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue({
        ...mockConfig,
        measurementId: null,
      });

      const res = await service.testConnection();
      expect(res.success).toBe(false);
      expect(res.message).toContain('Measurement ID');
    });

    it('should return error if apiSecret is missing', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue({
        ...mockConfig,
        apiSecret: null,
      });

      const res = await service.testConnection();
      expect(res.success).toBe(false);
      expect(res.message).toContain('API Secret');
    });

    it('should send debug payload and return success when validation passes', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue(mockConfig);
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({ validationMessages: [] }),
      });
      mockPrismaService.googleAnalyticsConfig.update.mockResolvedValue(mockConfig);

      const res = await service.testConnection();
      expect(res.success).toBe(true);
      expect(res.message).toContain('successful');
      expect(mockPrismaService.googleAnalyticsConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ testResult: 'success' }),
        }),
      );
    });

    it('should handle validation warnings from GA debug endpoint', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue(mockConfig);
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({ validationMessages: [{ description: 'Invalid event parameter name' }] }),
      });

      const res = await service.testConnection();
      expect(res.success).toBe(false);
      expect(res.message).toContain('Validation Warning');
    });

    it('should handle network failure during testConnection', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue(mockConfig);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection timed out'));

      const res = await service.testConnection();
      expect(res.success).toBe(false);
      expect(res.message).toContain('Connection timed out');
    });
  });

  describe('sendEventToGA', () => {
    it('should skip event sending if GA is inactive', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue({
        ...mockConfig,
        isActive: false,
      });

      const result = await service.sendEventToGA({ eventName: 'page_view' });
      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should successfully post event to Measurement Protocol and update event log status to sent', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.googleAnalyticsEvent.create.mockResolvedValue({ id: 'log-1' });
      (global.fetch as jest.Mock).mockResolvedValue({ status: 204 });

      const result = await service.sendEventToGA({
        eventName: 'sign_up',
        eventParams: { method: 'email' },
        tenantId: 'tenant-123',
      });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
      expect(mockPrismaService.googleAnalyticsEvent.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { status: 'sent', sentToGA: true, responseStatus: 204 },
      });
    });

    it('should log failure status if GA endpoint fails', async () => {
      mockPrismaService.googleAnalyticsConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.googleAnalyticsEvent.create.mockResolvedValue({ id: 'log-2' });
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Invalid Measurement ID'));

      const result = await service.sendEventToGA({ eventName: 'purchase' });
      expect(result).toBe(false);
      expect(mockPrismaService.googleAnalyticsEvent.update).toHaveBeenCalledWith({
        where: { id: 'log-2' },
        data: expect.objectContaining({ status: 'failed', sentToGA: false }),
      });
    });
  });

  describe('getStatsLast24h', () => {
    it('should aggregate 24h event statistics breakdown', async () => {
      mockPrismaService.googleAnalyticsEvent.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(45) // sent
        .mockResolvedValueOnce(5)  // failed
        .mockResolvedValueOnce(20) // pageViews
        .mockResolvedValueOnce(15) // signups
        .mockResolvedValueOnce(10) // completeRegs
        .mockResolvedValueOnce(5);  // purchases

      const stats = await service.getStatsLast24h();

      expect(stats.total).toBe(50);
      expect(stats.sent).toBe(45);
      expect(stats.failed).toBe(5);
      expect(stats.breakdown.pageViews).toBe(20);
      expect(stats.breakdown.signups).toBe(15);
    });
  });

  describe('getEventLogs', () => {
    it('should return paginated list of GA events', async () => {
      const mockEvents = [{ id: 'evt-1', eventName: 'page_view' }];
      mockPrismaService.googleAnalyticsEvent.findMany.mockResolvedValue(mockEvents);
      mockPrismaService.googleAnalyticsEvent.count.mockResolvedValue(1);

      const logs = await service.getEventLogs(1, 20);

      expect(logs.events).toEqual(mockEvents);
      expect(logs.total).toBe(1);
      expect(logs.totalPages).toBe(1);
    });
  });

  describe('resetConfig', () => {
    it('should purge existing config and recreate default empty config', async () => {
      mockPrismaService.googleAnalyticsConfig.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.googleAnalyticsConfig.create.mockResolvedValue(mockConfig);

      await service.resetConfig();

      expect(mockPrismaService.googleAnalyticsConfig.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.googleAnalyticsConfig.create).toHaveBeenCalled();
    });
  });
});

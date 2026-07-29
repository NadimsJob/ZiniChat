import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAnalyticsController } from './google-analytics.controller';
import { GoogleAnalyticsService } from './google-analytics.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('GoogleAnalyticsController', () => {
  let controller: GoogleAnalyticsController;
  let service: GoogleAnalyticsService;
  let queue: any;

  const mockGaService = {
    getConfig: jest.fn(),
    saveConfig: jest.fn(),
    testConnection: jest.fn(),
    getStatsLast24h: jest.fn(),
    getEventLogs: jest.fn(),
    resetConfig: jest.fn(),
    decrypt: jest.fn((val) => val),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleAnalyticsController],
      providers: [
        { provide: GoogleAnalyticsService, useValue: mockGaService },
        { provide: getQueueToken('google-analytics'), useValue: mockQueue },
      ],
    }).compile();

    controller = module.get<GoogleAnalyticsController>(GoogleAnalyticsController);
    service = module.get<GoogleAnalyticsService>(GoogleAnalyticsService);
    queue = module.get(getQueueToken('google-analytics'));
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /google-analytics/config', () => {
    it('should return masked apiSecret when apiSecret is present', async () => {
      mockGaService.getConfig.mockResolvedValue({
        id: 'config-1',
        measurementId: 'G-1234567890',
        apiSecret: 'encrypted-secret-string-12345',
        isActive: true,
        trackPageView: true,
        trackSignup: true,
        trackCompleteReg: true,
        trackLogin: true,
        setupCompletedAt: new Date(),
        lastTestedAt: new Date(),
        testResult: 'success',
      });
      mockGaService.decrypt.mockReturnValue('my-secret-key-12345');

      const result = await controller.getConfig();

      expect(result.measurementId).toBe('G-1234567890');
      expect(result.hasApiSecret).toBe(true);
      expect(result.maskedApiSecret).toBe('***************2345');
    });

    it('should return null maskedApiSecret when apiSecret is absent', async () => {
      mockGaService.getConfig.mockResolvedValue({
        id: 'config-1',
        measurementId: null,
        apiSecret: null,
        isActive: false,
      });

      const result = await controller.getConfig();

      expect(result.hasApiSecret).toBe(false);
      expect(result.maskedApiSecret).toBeNull();
    });
  });

  describe('POST /google-analytics/config', () => {
    it('should save config and return success message', async () => {
      mockGaService.saveConfig.mockResolvedValue({
        measurementId: 'G-SAVED999',
        isActive: true,
        setupCompletedAt: new Date(),
      });

      const payload = { measurementId: 'G-SAVED999', isActive: true };
      const res = await controller.saveConfig(payload);

      expect(res.success).toBe(true);
      expect(res.config.measurementId).toBe('G-SAVED999');
      expect(mockGaService.saveConfig).toHaveBeenCalledWith(payload);
    });
  });

  describe('POST /google-analytics/test-connection', () => {
    it('should invoke testConnection on service', async () => {
      mockGaService.testConnection.mockResolvedValue({
        success: true,
        message: 'Google Analytics Measurement Protocol connection successful!',
      });

      const res = await controller.testConnection();

      expect(res.success).toBe(true);
      expect(mockGaService.testConnection).toHaveBeenCalled();
    });
  });

  describe('GET /google-analytics/stats', () => {
    it('should return 24h event statistics', async () => {
      const mockStats = { total: 100, sent: 90, failed: 10 };
      mockGaService.getStatsLast24h.mockResolvedValue(mockStats);

      const res = await controller.getStats();

      expect(res).toEqual(mockStats);
      expect(mockGaService.getStatsLast24h).toHaveBeenCalled();
    });
  });

  describe('GET /google-analytics/events', () => {
    it('should return paginated event logs', async () => {
      const mockLogs = { events: [{ id: 'evt-1' }], total: 1, page: 1, totalPages: 1 };
      mockGaService.getEventLogs.mockResolvedValue(mockLogs);

      const res = await controller.getEvents(1, 20);

      expect(res).toEqual(mockLogs);
      expect(mockGaService.getEventLogs).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('DELETE /google-analytics/config', () => {
    it('should reset config and return confirmation', async () => {
      mockGaService.resetConfig.mockResolvedValue(undefined);

      const res = await controller.resetConfig();

      expect(res.success).toBe(true);
      expect(mockGaService.resetConfig).toHaveBeenCalled();
    });
  });

  describe('POST /google-analytics/acquisition/track', () => {
    it('should return error if eventName is missing', async () => {
      const res = await controller.trackAcquisitionEvent({});

      expect(res.success).toBe(false);
      expect(res.message).toContain('eventName is required');
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should add sendGAEvent job to BullMQ queue when valid', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      const res = await controller.trackAcquisitionEvent({
        eventName: 'page_view',
        eventParams: { page_title: 'Landing' },
        clientId: 'client-1',
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('queued successfully');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'sendGAEvent',
        expect.objectContaining({ eventName: 'page_view' }),
        expect.any(Object),
      );
    });

    it('should handle queue addition failure gracefully', async () => {
      mockQueue.add.mockRejectedValue(new Error('Redis connection lost'));

      const res = await controller.trackAcquisitionEvent({ eventName: 'sign_up' });

      expect(res.success).toBe(false);
      expect(res.message).toContain('Redis connection lost');
    });
  });
});

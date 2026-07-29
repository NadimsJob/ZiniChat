import { Test, TestingModule } from '@nestjs/testing';
import { MetaPixelController } from './meta-pixel.controller';
import { MetaPixelService } from './meta-pixel.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('MetaPixelController', () => {
  let controller: MetaPixelController;
  let service: any;
  let queue: any;

  const mockConfig = {
    id: 'cfg-1',
    pixelId: '123456',
    isActive: true,
    isCapiEnabled: true,
    datasetId: 'ds-1',
    trackPageView: true,
    trackSignup: true,
    trackCompleteReg: true,
    trackLogin: true,
    setupCompletedAt: new Date(),
    lastTestedAt: new Date(),
    pixelAccessToken: 'encrypted_token',
    capiAccessToken: 'encrypted_token',
  };

  beforeEach(async () => {
    service = {
      getPixelConfig: jest.fn(),
      savePixelConfig: jest.fn(),
      testPixelConnection: jest.fn(),
      testCapiConnection: jest.fn(),
      getStatsLast24h: jest.fn(),
      getEventLogs: jest.fn(),
      resetPixelConfig: jest.fn(),
    };

    queue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetaPixelController],
      providers: [
        { provide: MetaPixelService, useValue: service },
        { provide: getQueueToken('meta-pixel'), useValue: queue },
      ],
    }).compile();

    controller = module.get<MetaPixelController>(MetaPixelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConfig', () => {
    it('1. should return scrubbed config with token presence indicators', async () => {
      service.getPixelConfig.mockResolvedValue(mockConfig);
      const result = await controller.getConfig();
      expect(result.pixelId).toEqual('123456');
      expect(result.hasPixelToken).toBe(true);
      expect(result.hasCapiToken).toBe(true);
      expect((result as any).pixelAccessToken).toBeUndefined();
    });
  });

  describe('saveConfig', () => {
    it('2. should save config and return success payload', async () => {
      service.savePixelConfig.mockResolvedValue(mockConfig);
      const res = await controller.saveConfig({ pixelId: '123456', isActive: true });
      expect(res.success).toBe(true);
      expect(res.message).toContain('saved successfully');
      expect(service.savePixelConfig).toHaveBeenCalledWith({ pixelId: '123456', isActive: true });
    });
  });

  describe('testConnection & testCapi', () => {
    it('3. should return testPixelConnection response', async () => {
      service.testPixelConnection.mockResolvedValue({ success: true, pixelId: '123456', message: 'OK' });
      const res = await controller.testConnection();
      expect(res.success).toBe(true);
    });

    it('4. should return testCapiConnection response', async () => {
      service.testCapiConnection.mockResolvedValue({ success: true, datasetId: 'ds-1', message: 'CAPI OK' });
      const res = await controller.testCapi();
      expect(res.success).toBe(true);
    });
  });

  describe('getStats & getEvents', () => {
    it('5. should return last 24h stats', async () => {
      const statsObj = { pageViews: 10, signups: 2, registrations: 2, logins: 1, conversionRate: 10 };
      service.getStatsLast24h.mockResolvedValue(statsObj);
      const res = await controller.getStats();
      expect(res).toEqual(statsObj);
    });

    it('6. should return paginated event logs', async () => {
      service.getEventLogs.mockResolvedValue({ events: [], total: 0, page: 1, limit: 50 });
      const res = await controller.getEvents(50, 0, 'SignUp');
      expect(service.getEventLogs).toHaveBeenCalledWith(50, 0, 'SignUp', undefined);
      expect(res.events).toEqual([]);
    });

    it('7. should handle default query params in getEvents', async () => {
      service.getEventLogs.mockResolvedValue({ events: [], total: 0, page: 1, limit: 50 });
      await controller.getEvents();
      expect(service.getEventLogs).toHaveBeenCalledWith(50, 0, undefined, undefined);
    });
  });

  describe('resetConfig', () => {
    it('8. should call resetPixelConfig and return success', async () => {
      service.resetPixelConfig.mockResolvedValue(undefined);
      const res = await controller.resetConfig();
      expect(res.success).toBe(true);
      expect(service.resetPixelConfig).toHaveBeenCalled();
    });
  });

  describe('trackAcquisition (Public internal endpoint)', () => {
    it('9. should queue acquisition event and return success 200 OK', async () => {
      queue.add.mockResolvedValue({ id: 'job-1' });

      const res = await controller.trackAcquisition({
        eventName: 'PageView',
        tenantEmail: 'user@example.com',
        fbClickId: 'fb.1.123',
      });

      expect(res.success).toBe(true);
      expect(queue.add).toHaveBeenCalledWith(
        'trackAcquisitionEvent',
        expect.objectContaining({
          eventName: 'PageView',
          tenantEmail: 'user@example.com',
        }),
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('10. should return success false if eventName missing', async () => {
      const res = await controller.trackAcquisition({ eventName: '' } as any);
      expect(res.success).toBe(false);
      expect(res.message).toEqual('Missing eventName');
    });

    it('11. should handle queue error gracefully and return failure object without throwing', async () => {
      queue.add.mockRejectedValue(new Error('Redis connection down'));
      const res = await controller.trackAcquisition({ eventName: 'SignUp' });
      expect(res.success).toBe(false);
      expect(res.message).toContain('Failed to queue event silently');
    });

    it('12. should pass customData to queue payload', async () => {
      queue.add.mockResolvedValue({ id: 'job-2' });
      await controller.trackAcquisition({
        eventName: 'Lead',
        customData: { value: 50, currency: 'BDT' },
      });
      expect(queue.add).toHaveBeenCalledWith(
        'trackAcquisitionEvent',
        expect.objectContaining({
          customData: { value: 50, currency: 'BDT' },
        }),
        expect.any(Object),
      );
    });

    it('13. should handle undefined body gracefully', async () => {
      const res = await controller.trackAcquisition(undefined as any);
      expect(res.success).toBe(false);
    });

    it('14. should format limit and offset as numbers in getEvents', async () => {
      service.getEventLogs.mockResolvedValue({ events: [], total: 0, page: 2, limit: 25 });
      await controller.getEvents('25' as any, '25' as any, 'Login', 'test');
      expect(service.getEventLogs).toHaveBeenCalledWith(25, 25, 'Login', 'test');
    });

    it('15. should handle resetConfig service error propagation', async () => {
      service.resetPixelConfig.mockRejectedValue(new Error('DB error'));
      await expect(controller.resetConfig()).rejects.toThrow('DB error');
    });
  });
});

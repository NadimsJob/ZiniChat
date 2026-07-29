import { Test, TestingModule } from '@nestjs/testing';
import { MetaPixelService } from './meta-pixel.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MetaPixelService', () => {
  let service: MetaPixelService;
  let prisma: any;

  const mockConfig = {
    id: 'config-uuid-1',
    pixelId: '1234567890',
    pixelAccessToken: '',
    isActive: true,
    isCapiEnabled: true,
    capiAccessToken: '',
    datasetId: 'dataset-1',
    trackPageView: true,
    trackSignup: true,
    trackCompleteReg: true,
    trackLogin: true,
    setupCompletedAt: new Date(),
    lastTestedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      metaPixelConfig: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tenantAcquisitionEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaPixelService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MetaPixelService>(MetaPixelService);
    // Setup encrypted tokens for mock config
    mockConfig.pixelAccessToken = service.encrypt('pixel_token_secret');
    mockConfig.capiAccessToken = service.encrypt('capi_token_secret');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encryption & decryption', () => {
    it('1. should encrypt and decrypt text correctly', () => {
      const original = 'my-secret-access-token';
      const encrypted = service.encrypt(original);
      expect(encrypted).not.toEqual(original);
      expect(encrypted.includes(':')).toBe(true);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toEqual(original);
    });

    it('2. should handle null or empty values gracefully in encrypt', () => {
      expect(service.encrypt(null)).toBe('');
      expect(service.encrypt('')).toBe('');
      expect(service.encrypt(undefined)).toBe('');
    });

    it('3. should handle non-encrypted format gracefully in decrypt', () => {
      expect(service.decrypt(null)).toBe('');
      expect(service.decrypt('raw-unencrypted')).toBe('raw-unencrypted');
    });

    it('4. should hash PII with SHA256 correctly', () => {
      const email = 'user@example.com';
      const hash1 = service.hashPii(email);
      const hash2 = service.hashPii(' USER@EXAMPLE.COM ');
      expect(hash1).toHaveLength(64);
      expect(hash1).toEqual(hash2);
    });

    it('5. should return empty string when hashing null PII', () => {
      expect(service.hashPii(null)).toBe('');
    });
  });

  describe('getPixelConfig', () => {
    it('6. should return existing config if found', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);
      const result = await service.getPixelConfig();
      expect(result).toEqual(mockConfig);
    });

    it('7. should create default config if none exists', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(null);
      prisma.metaPixelConfig.create.mockResolvedValue(mockConfig);

      const result = await service.getPixelConfig();
      expect(prisma.metaPixelConfig.create).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });
  });

  describe('savePixelConfig', () => {
    it('8. should update config and encrypt tokens if config exists', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);
      prisma.metaPixelConfig.update.mockResolvedValue({ ...mockConfig, pixelId: '99999' });

      const result = await service.savePixelConfig({
        pixelId: '99999',
        pixelAccessToken: 'new_pixel_token',
        isActive: true,
      });

      expect(prisma.metaPixelConfig.update).toHaveBeenCalled();
      expect(result.pixelId).toEqual('99999');
    });

    it('9. should create new config if none exists', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(null);
      prisma.metaPixelConfig.create.mockResolvedValue(mockConfig);

      await service.savePixelConfig({
        pixelId: '1234567890',
        pixelAccessToken: 'pixel_token_secret',
      });

      expect(prisma.metaPixelConfig.create).toHaveBeenCalled();
    });

    it('10. should preserve existing tokens if new tokens not supplied', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);
      prisma.metaPixelConfig.update.mockResolvedValue(mockConfig);

      await service.savePixelConfig({
        pixelId: '1234567890',
        isActive: true,
      });

      expect(prisma.metaPixelConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pixelAccessToken: mockConfig.pixelAccessToken,
          }),
        }),
      );
    });
  });

  describe('testPixelConnection', () => {
    it('11. should return failure if pixelId or accessToken missing', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue({ ...mockConfig, pixelId: null });
      const res = await service.testPixelConnection();
      expect(res.success).toBe(false);
      expect(res.message).toContain('missing');
    });

    it('12. should return success when Meta Graph API returns 200 OK', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);
      prisma.metaPixelConfig.update.mockResolvedValue(mockConfig);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'ZiniChat Growth Pixel' }),
      } as any);

      const res = await service.testPixelConnection();
      expect(res.success).toBe(true);
      expect(res.message).toContain('ZiniChat Growth Pixel');
    });

    it('13. should return failure when Meta Graph API returns error', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: { message: 'Invalid OAuth access token' } }),
      } as any);

      const res = await service.testPixelConnection();
      expect(res.success).toBe(false);
      expect(res.message).toEqual('Invalid OAuth access token');
    });

    it('14. should handle network throw in testPixelConnection', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection timeout'));

      const res = await service.testPixelConnection();
      expect(res.success).toBe(false);
      expect(res.message).toContain('Connection timeout');
    });
  });

  describe('testCapiConnection', () => {
    it('15. should return failure if dataset/pixel ID or token missing', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue({ ...mockConfig, datasetId: null, pixelId: null });
      const res = await service.testCapiConnection();
      expect(res.success).toBe(false);
    });

    it('16. should send CAPI test event and return success on 200 OK', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);
      prisma.metaPixelConfig.update.mockResolvedValue(mockConfig);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ events_received: 1 }),
      } as any);

      const res = await service.testCapiConnection();
      expect(res.success).toBe(true);
      expect(res.message).toContain('CAPI Test event sent successfully');
    });

    it('17. should handle CAPI API failure response', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: { message: 'Invalid dataset ID' } }),
      } as any);

      const res = await service.testCapiConnection();
      expect(res.success).toBe(false);
      expect(res.message).toEqual('Invalid dataset ID');
    });
  });

  describe('sendEventToMeta', () => {
    it('18. should return false if config isActive is false', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue({ ...mockConfig, isActive: false });
      const res = await service.sendEventToMeta('SignUp', { tenantEmail: 'test@example.com' });
      expect(res).toBe(false);
    });

    it('19. should return false if pixel ID or token missing', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue({ ...mockConfig, pixelId: null, datasetId: null });
      const res = await service.sendEventToMeta('SignUp', { tenantEmail: 'test@example.com' });
      expect(res).toBe(false);
    });

    it('20. should send event with hashed email to CAPI endpoint', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ events_received: 1 }),
      } as any);

      const res = await service.sendEventToMeta('SignUp', {
        tenantEmail: 'user@zinichat.com',
        fbClickId: 'fb.1.12345',
        fbPageId: 'fbp.1.67890',
        metaEventId: 'evt_123',
      });

      expect(res).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://graph.facebook.com/v18.0/dataset-1/events'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(service.hashPii('user@zinichat.com')),
        }),
      );
    });

    it('21. should handle Meta API error response gracefully', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: { message: 'Token expired' } }),
      } as any);

      const res = await service.sendEventToMeta('PageView', {});
      expect(res).toBe(false);
    });

    it('22. should handle fetch exception during sendEventToMeta', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const res = await service.sendEventToMeta('PageView', {});
      expect(res).toBe(false);
    });
  });

  describe('logAcquisitionEvent', () => {
    it('23. should create tenant acquisition event in DB', async () => {
      const mockEvent = { id: 'evt-1', eventName: 'SignUp', status: 'sent' };
      prisma.tenantAcquisitionEvent.create.mockResolvedValue(mockEvent);

      const result = await service.logAcquisitionEvent({
        tenantEmail: 'test@example.com',
        eventName: 'SignUp',
        eventData: { test: true },
        status: 'sent',
        sentToMeta: true,
      });

      expect(prisma.tenantAcquisitionEvent.create).toHaveBeenCalled();
      expect(result).toEqual(mockEvent);
    });

    it('24. should handle null optional fields gracefully in logAcquisitionEvent', async () => {
      prisma.tenantAcquisitionEvent.create.mockResolvedValue({ id: 'evt-2' });
      await service.logAcquisitionEvent({
        eventName: 'PageView',
        eventData: {},
      });
      expect(prisma.tenantAcquisitionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: null,
            tenantEmail: null,
            status: 'pending',
          }),
        }),
      );
    });
  });

  describe('getStatsLast24h', () => {
    it('25. should calculate 24h event counts and conversion rate', async () => {
      prisma.tenantAcquisitionEvent.findMany.mockResolvedValue([
        { eventName: 'PageView' },
        { eventName: 'PageView' },
        { eventName: 'PageView' },
        { eventName: 'PageView' },
        { eventName: 'SignUp' },
        { eventName: 'CompleteRegistration' },
        { eventName: 'Login' },
      ]);

      const stats = await service.getStatsLast24h();
      expect(stats.pageViews).toBe(4);
      expect(stats.signups).toBe(1);
      expect(stats.registrations).toBe(1);
      expect(stats.logins).toBe(1);
      expect(stats.conversionRate).toBe(25); // (1 login / 4 pageViews) * 100
    });

    it('26. should return 0 conversion rate when pageViews is 0', async () => {
      prisma.tenantAcquisitionEvent.findMany.mockResolvedValue([]);
      const stats = await service.getStatsLast24h();
      expect(stats.pageViews).toBe(0);
      expect(stats.conversionRate).toBe(0);
    });
  });

  describe('getEventLogs & resetPixelConfig', () => {
    it('27. should return paginated event logs', async () => {
      prisma.tenantAcquisitionEvent.findMany.mockResolvedValue([{ id: 'ev1' }]);
      prisma.tenantAcquisitionEvent.count.mockResolvedValue(1);

      const res = await service.getEventLogs(10, 0);
      expect(res.events).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
    });

    it('28. should apply search filter in getEventLogs', async () => {
      prisma.tenantAcquisitionEvent.findMany.mockResolvedValue([]);
      prisma.tenantAcquisitionEvent.count.mockResolvedValue(0);

      await service.getEventLogs(10, 0, 'SignUp', 'user@example.com');
      expect(prisma.tenantAcquisitionEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventName: 'SignUp',
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('29. should delete config when resetPixelConfig is called', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(mockConfig);
      prisma.metaPixelConfig.delete.mockResolvedValue(mockConfig);

      await service.resetPixelConfig();
      expect(prisma.metaPixelConfig.delete).toHaveBeenCalledWith({
        where: { id: mockConfig.id },
      });
    });

    it('30. should do nothing in resetPixelConfig if no config exists', async () => {
      prisma.metaPixelConfig.findFirst.mockResolvedValue(null);
      await service.resetPixelConfig();
      expect(prisma.metaPixelConfig.delete).not.toHaveBeenCalled();
    });
  });
});

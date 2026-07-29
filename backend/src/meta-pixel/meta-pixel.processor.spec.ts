import { Test, TestingModule } from '@nestjs/testing';
import { MetaPixelProcessor } from './meta-pixel.processor';
import { MetaPixelService } from './meta-pixel.service';

describe('MetaPixelProcessor', () => {
  let processor: MetaPixelProcessor;
  let service: any;

  const mockConfig = {
    id: 'cfg-1',
    pixelId: '123456',
    isActive: true,
    isCapiEnabled: true,
    trackPageView: true,
    trackSignup: true,
    trackCompleteReg: true,
    trackLogin: true,
  };

  beforeEach(async () => {
    service = {
      getPixelConfig: jest.fn(),
      sendEventToMeta: jest.fn(),
      logAcquisitionEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaPixelProcessor,
        { provide: MetaPixelService, useValue: service },
      ],
    }).compile();

    processor = module.get<MetaPixelProcessor>(MetaPixelProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('1. should ignore jobs with non-matching job names', async () => {
    const job: any = { name: 'otherJob', data: {} };
    const res = await processor.process(job);
    expect(res).toBeUndefined();
    expect(service.getPixelConfig).not.toHaveBeenCalled();
  });

  it('2. should skip processing if pixel config is inactive', async () => {
    service.getPixelConfig.mockResolvedValue({ ...mockConfig, isActive: false });
    const job: any = {
      name: 'trackAcquisitionEvent',
      data: { eventName: 'PageView' },
      attemptsMade: 0,
    };

    const res = await processor.process(job);
    expect(res).toEqual({ skipped: true, reason: 'pixel_inactive' });
    expect(service.sendEventToMeta).not.toHaveBeenCalled();
  });

  it('3. should skip processing if event type tracking is disabled', async () => {
    service.getPixelConfig.mockResolvedValue({ ...mockConfig, trackPageView: false });
    const job: any = {
      name: 'trackAcquisitionEvent',
      data: { eventName: 'PageView' },
      attemptsMade: 0,
    };

    const res = await processor.process(job);
    expect(res).toEqual({ skipped: true, reason: 'event_type_disabled' });
    expect(service.sendEventToMeta).not.toHaveBeenCalled();
  });

  it('4. should process event successfully and log DB audit entry', async () => {
    service.getPixelConfig.mockResolvedValue(mockConfig);
    service.sendEventToMeta.mockResolvedValue(true);
    service.logAcquisitionEvent.mockResolvedValue({ id: 'evt-1' });

    const job: any = {
      name: 'trackAcquisitionEvent',
      data: {
        eventName: 'SignUp',
        tenantEmail: 'owner@tenant.com',
        tenantId: 'tenant-uuid-1',
        fbClickId: 'fb.1.123',
      },
      attemptsMade: 0,
    };

    const res = await processor.process(job);
    expect(res.success).toBe(true);
    expect(service.sendEventToMeta).toHaveBeenCalledWith('SignUp', expect.objectContaining({
      tenantEmail: 'owner@tenant.com',
      tenantId: 'tenant-uuid-1',
      fbClickId: 'fb.1.123',
    }));
    expect(service.logAcquisitionEvent).toHaveBeenCalledWith(expect.objectContaining({
      status: 'sent',
      sentToMeta: true,
    }));
  });

  it('5. should throw error to trigger BullMQ retry when Meta API call fails on initial attempts', async () => {
    service.getPixelConfig.mockResolvedValue(mockConfig);
    service.sendEventToMeta.mockResolvedValue(false);
    service.logAcquisitionEvent.mockResolvedValue({ id: 'evt-2' });

    const job: any = {
      name: 'trackAcquisitionEvent',
      data: { eventName: 'CompleteRegistration' },
      attemptsMade: 0,
    };

    await expect(processor.process(job)).rejects.toThrow('Failed to send event CompleteRegistration to Meta');
    expect(service.logAcquisitionEvent).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      sentToMeta: false,
    }));
  });

  it('6. should not throw on last retry attempt (attemptsMade >= 2)', async () => {
    service.getPixelConfig.mockResolvedValue(mockConfig);
    service.sendEventToMeta.mockResolvedValue(false);
    service.logAcquisitionEvent.mockResolvedValue({ id: 'evt-3' });

    const job: any = {
      name: 'trackAcquisitionEvent',
      data: { eventName: 'Login' },
      attemptsMade: 2,
    };

    const res = await processor.process(job);
    expect(res.success).toBe(false);
    expect(service.logAcquisitionEvent).toHaveBeenCalled();
  });

  it('7. should check trackSignup for SignUp and Lead events', async () => {
    service.getPixelConfig.mockResolvedValue({ ...mockConfig, trackSignup: false });
    const job: any = {
      name: 'trackAcquisitionEvent',
      data: { eventName: 'Lead' },
      attemptsMade: 0,
    };

    const res = await processor.process(job);
    expect(res).toEqual({ skipped: true, reason: 'event_type_disabled' });
  });

  it('8. should format eventValue into customData currency payload', async () => {
    service.getPixelConfig.mockResolvedValue(mockConfig);
    service.sendEventToMeta.mockResolvedValue(true);
    service.logAcquisitionEvent.mockResolvedValue({ id: 'evt-4' });

    const job: any = {
      name: 'trackAcquisitionEvent',
      data: { eventName: 'Purchase', eventValue: 500 },
      attemptsMade: 0,
    };

    await processor.process(job);
    expect(service.sendEventToMeta).toHaveBeenCalledWith('Purchase', expect.objectContaining({
      customData: expect.objectContaining({ value: 500, currency: 'BDT' }),
    }));
  });
});

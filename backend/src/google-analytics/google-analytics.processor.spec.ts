import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAnalyticsProcessor } from './google-analytics.processor';
import { GoogleAnalyticsService } from './google-analytics.service';
import { Job } from 'bullmq';

describe('GoogleAnalyticsProcessor', () => {
  let processor: GoogleAnalyticsProcessor;
  let service: GoogleAnalyticsService;

  const mockGaService = {
    getConfig: jest.fn(),
    sendEventToGA: jest.fn(),
  };

  const mockJob = (data: any, attempts = 0) =>
    ({
      name: 'sendGAEvent',
      data,
      attemptsMade: attempts,
    } as Job);

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAnalyticsProcessor,
        { provide: GoogleAnalyticsService, useValue: mockGaService },
      ],
    }).compile();

    processor = module.get<GoogleAnalyticsProcessor>(GoogleAnalyticsProcessor);
    service = module.get<GoogleAnalyticsService>(GoogleAnalyticsService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should skip job if job name is not sendGAEvent', async () => {
    const job = { name: 'otherJob', data: {} } as Job;
    const res = await processor.process(job);
    expect(res).toBeUndefined();
    expect(mockGaService.getConfig).not.toHaveBeenCalled();
  });

  it('should skip processing if GA config is inactive', async () => {
    mockGaService.getConfig.mockResolvedValue({ isActive: false });

    const res = await processor.process(mockJob({ eventName: 'page_view' }));

    expect(res).toEqual({ skipped: true, reason: 'ga_inactive' });
    expect(mockGaService.sendEventToGA).not.toHaveBeenCalled();
  });

  it('should skip processing if event tracking toggle is disabled', async () => {
    mockGaService.getConfig.mockResolvedValue({
      isActive: true,
      trackPageView: false,
    });

    const res = await processor.process(mockJob({ eventName: 'PageView' }));

    expect(res).toEqual({ skipped: true, reason: 'event_type_disabled' });
    expect(mockGaService.sendEventToGA).not.toHaveBeenCalled();
  });

  it('should send event to GA when config is active and toggle is enabled', async () => {
    mockGaService.getConfig.mockResolvedValue({
      isActive: true,
      trackSignup: true,
    });
    mockGaService.sendEventToGA.mockResolvedValue(true);

    const res = await processor.process(
      mockJob({
        eventName: 'SignUp',
        tenantId: 't-123',
        tenantEmail: 'test@example.com',
      }),
    );

    expect(res).toEqual({ success: true, gaEventName: 'sign_up' });
    expect(mockGaService.sendEventToGA).toHaveBeenCalledWith({
      eventName: 'sign_up',
      eventParams: {},
      tenantId: 't-123',
      tenantEmail: 'test@example.com',
      clientId: undefined,
    });
  });

  it('should throw Error to trigger BullMQ retry on first failure', async () => {
    mockGaService.getConfig.mockResolvedValue({
      isActive: true,
      trackLogin: true,
    });
    mockGaService.sendEventToGA.mockResolvedValue(false);

    await expect(
      processor.process(
        mockJob(
          {
            eventName: 'purchase',
            tenantId: 't-456',
          },
          0, // first attempt
        ),
      ),
    ).rejects.toThrow('Failed to send event purchase to GA.');
  });
});

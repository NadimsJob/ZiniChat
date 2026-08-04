import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { MetaPixelService } from './meta-pixel.service';

@Processor('meta-pixel')
@Injectable()
export class MetaPixelProcessor extends WorkerHost {
  private readonly logger = new Logger(MetaPixelProcessor.name);

  constructor(private metaPixelService: MetaPixelService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    if (job.name !== 'trackAcquisitionEvent') {
      return;
    }

    const { eventName, tenantEmail, tenantId, eventValue, fbClickId, fbPageId, metaEventId, customData } = job.data;
    this.logger.log(`Processing Meta acquisition tracking job: ${eventName} (attempt ${job.attemptsMade + 1})`);

    const config = await this.metaPixelService.getPixelConfig();

    if (!config.isActive || !config.isCapiEnabled) {
      this.logger.log('Meta Pixel or CAPI is inactive. Skipping acquisition event tracking.');
      return { skipped: true, reason: 'pixel_or_capi_inactive' };
    }

    // Check event specific tracking toggles
    let isTracked = true;
    if (eventName === 'PageView' && !config.trackPageView) isTracked = false;
    if ((eventName === 'SignUp' || eventName === 'Lead') && !config.trackSignup) isTracked = false;
    if (eventName === 'CompleteRegistration' && !config.trackCompleteReg) isTracked = false;
    if ((eventName === 'Login' || eventName === 'Purchase') && !config.trackLogin) isTracked = false;

    if (!isTracked) {
      this.logger.log(`Tracking disabled for event type '${eventName}'. Skipping.`);
      return { skipped: true, reason: 'event_type_disabled' };
    }

    const payload = {
      tenantEmail,
      tenantId,
      fbClickId,
      fbPageId,
      metaEventId: metaEventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      customData: {
        ...(customData || {}),
        ...(eventValue ? { value: eventValue, currency: 'BDT' } : {}),
      },
    };

    const success = await this.metaPixelService.sendEventToMeta(eventName, payload);

    await this.metaPixelService.logAcquisitionEvent({
      tenantId,
      tenantEmail,
      eventName,
      eventData: payload,
      status: success ? 'sent' : 'failed',
      sentToMeta: success,
      metaEventId: payload.metaEventId,
      fbClickId,
      fbPageId,
    });

    if (!success && job.attemptsMade < 2) {
      throw new Error(`Failed to send event ${eventName} to Meta. Triggering BullMQ retry.`);
    }

    return { success, eventName, metaEventId: payload.metaEventId };
  }
}

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { GoogleAnalyticsService } from './google-analytics.service';

@Processor('google-analytics')
@Injectable()
export class GoogleAnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(GoogleAnalyticsProcessor.name);

  constructor(private gaService: GoogleAnalyticsService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    if (job.name !== 'sendGAEvent') {
      return;
    }

    const { eventName, eventParams, tenantId, tenantEmail, clientId } = job.data;
    this.logger.log(`Processing GA tracking job: ${eventName} (attempt ${job.attemptsMade + 1})`);

    const config = await this.gaService.getConfig();

    if (!config.isActive) {
      this.logger.log('Google Analytics is inactive. Skipping event dispatch.');
      return { skipped: true, reason: 'ga_inactive' };
    }

    // Event mapping and preference check
    // Acquisition event names map:
    // PageView -> page_view
    // SignUp / Lead -> sign_up
    // CompleteRegistration -> view_item
    // Login / Purchase -> purchase
    const gaEventName = this.mapToGaEventName(eventName);

    let isTracked = true;
    if (gaEventName === 'page_view' && !config.trackPageView) isTracked = false;
    if (gaEventName === 'sign_up' && !config.trackSignup) isTracked = false;
    if (gaEventName === 'view_item' && !config.trackCompleteReg) isTracked = false;
    if (gaEventName === 'purchase' && !config.trackLogin) isTracked = false;

    if (!isTracked) {
      this.logger.log(`Tracking disabled for GA event type '${gaEventName}'. Skipping.`);
      return { skipped: true, reason: 'event_type_disabled' };
    }

    const success = await this.gaService.sendEventToGA({
      eventName: gaEventName,
      eventParams: eventParams || {},
      tenantId,
      tenantEmail,
      clientId,
    });

    if (!success && job.attemptsMade < 1) {
      this.logger.warn(`Failed to send event ${gaEventName} to GA. Triggering BullMQ retry.`);
      throw new Error(`Failed to send event ${gaEventName} to GA.`);
    }

    return { success, gaEventName };
  }

  private mapToGaEventName(name: string): string {
    switch (name) {
      case 'PageView':
      case 'page_view':
        return 'page_view';
      case 'SignUp':
      case 'Lead':
      case 'sign_up':
        return 'sign_up';
      case 'CompleteRegistration':
      case 'view_item':
        return 'view_item';
      case 'Login':
      case 'Purchase':
      case 'purchase':
        return 'purchase';
      default:
        return name;
    }
  }
}

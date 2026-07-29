import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { SmtpService } from './smtp.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private smtpService: SmtpService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing email job ${job.id} for ${job.data.to}`);
    const { to, subject, html, plainText } = job.data;

    // Use internalExecuteSendMail which throws an error if it fails
    await this.smtpService.internalExecuteSendMail({ to, subject, html, plainText });

    return { success: true };
  }
}

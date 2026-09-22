import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Processor('capi-events')
@Injectable()
export class CapiHubProcessor extends WorkerHost {
  private readonly logger = new Logger(CapiHubProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { logId, pixelId, accessToken, payload } = job.data;
    
    try {
      const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
      
      const response = await axios.post(url, payload);
      
      await this.prisma.capiEventLog.update({
        where: { id: logId },
        data: {
          status: 'sent',
          responseCode: response.status
        }
      });
      
      this.logger.log(`Successfully sent CAPI event to pixel ${pixelId}`);
      return response.data;
      
    } catch (error: any) {
      const responseCode = error.response?.status;
      const errorMessage = error.response?.data?.error?.message || error.message;
      
      this.logger.error(`Failed to send CAPI event: ${errorMessage}`, error.stack);
      
      // Update log but if it throws, BullMQ will retry based on attempts config
      await this.prisma.capiEventLog.update({
        where: { id: logId },
        data: {
          status: 'failed',
          responseCode: responseCode,
          errorMessage: errorMessage
        }
      });
      
      throw error; // Trigger retry
    }
  }
}

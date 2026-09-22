import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AdsAgentService } from './ads-agent.service';

@Injectable()
export class AdsAgentProcessor {
  private readonly logger = new Logger(AdsAgentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adsAgentService: AdsAgentService,
  ) {}

  // 1. Auto-Scaling Engine Cron: Runs every 6 hours
  @Cron('0 */6 * * *')
  async handleAutoScalingCron() {
    this.logger.log('Starting Auto-Scaling Cron cycle...');
    try {
      const activeAutoScalingDrafts = await this.prisma.adCampaignDraft.findMany({
        where: {
          status: 'ACTIVE',
          autoScalingEnabled: true,
        },
        select: { id: true, tenantId: true },
      });

      this.logger.log(`Found ${activeAutoScalingDrafts.length} active campaigns with auto-scaling enabled.`);

      for (const draft of activeAutoScalingDrafts) {
        await this.adsAgentService.executeCampaignAutoScaling(draft.id).catch((err) => {
          this.logger.error(`Error executing auto-scaling for draft ${draft.id}: ${err.message}`);
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to process auto-scaling cron: ${err.message}`);
    }
  }

  // 2. Midnight Daily Action Counter Reset: Runs at 00:00 AM
  @Cron('0 0 * * *')
  async handleDailyActionCounterReset() {
    this.logger.log('Resetting daily auto-scaling action counters...');
    try {
      const res = await this.prisma.adCampaignDraft.updateMany({
        where: { autoScalingActionsToday: { gt: 0 } },
        data: { autoScalingActionsToday: 0 },
      });
      this.logger.log(`Reset autoScalingActionsToday for ${res.count} campaign drafts.`);
    } catch (err: any) {
      this.logger.error(`Failed to reset daily action counters: ${err.message}`);
    }
  }

  // 3. Data Retention Purge Cron: Runs daily at 2:00 AM
  @Cron('0 2 * * *')
  async handleDataRetentionPurge() {
    this.logger.log('Starting Data Retention Purge Cron cycle...');
    try {
      await this.adsAgentService.purgeOldDataLogs();
    } catch (err: any) {
      this.logger.error(`Failed to execute data retention purge cron: ${err.message}`);
    }
  }
}

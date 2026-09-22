import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CapiHubService } from './capi-hub.service';
import { CapiHubController } from './capi-hub.controller';
import { CapiHubProcessor } from './capi-hub.processor';
import { FeatureRolloutModule } from '../feature-rollout/feature-rollout.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'capi-events',
    }),
    FeatureRolloutModule,
  ],
  providers: [CapiHubService, CapiHubProcessor],
  controllers: [CapiHubController],
  exports: [CapiHubService],
})
export class CapiHubModule {}

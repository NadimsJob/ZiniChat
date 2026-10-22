import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CapiHubService } from './capi-hub.service';
import { CapiHubController } from './capi-hub.controller';
import { CapiHubProcessor } from './capi-hub.processor';
import { FeatureRolloutModule } from '../feature-rollout/feature-rollout.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'capi-events',
    }),
    FeatureRolloutModule,
    TenantsModule,
  ],
  providers: [CapiHubService, CapiHubProcessor],
  controllers: [CapiHubController],
  exports: [CapiHubService],
})
export class CapiHubModule {}

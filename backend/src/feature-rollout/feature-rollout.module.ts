import { Module } from '@nestjs/common';
import { FeatureRolloutService } from './feature-rollout.service';
import { FeatureRolloutController } from './feature-rollout.controller';

@Module({
  providers: [FeatureRolloutService],
  controllers: [FeatureRolloutController],
  exports: [FeatureRolloutService],
})
export class FeatureRolloutModule {}

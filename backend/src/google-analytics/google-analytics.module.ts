import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { GoogleAnalyticsService } from './google-analytics.service';
import { GoogleAnalyticsProcessor } from './google-analytics.processor';
import { GoogleAnalyticsController } from './google-analytics.controller';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'google-analytics',
    }),
  ],
  controllers: [GoogleAnalyticsController],
  providers: [GoogleAnalyticsService, GoogleAnalyticsProcessor],
  exports: [GoogleAnalyticsService, BullModule],
})
export class GoogleAnalyticsModule {}

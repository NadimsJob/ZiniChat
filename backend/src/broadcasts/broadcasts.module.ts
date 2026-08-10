import { Module } from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastsController } from './broadcasts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { BullModule } from '@nestjs/bullmq';
import { BroadcastsProcessor } from './broadcasts.processor';
import { SmtpModule } from '../smtp/smtp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    PrismaModule, 
    BillingModule,
    TenantsModule,
    BullModule.registerQueue({
      name: 'broadcasts',
      limiter: {
        max: 20,
        duration: 1000,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'whatsapp-outbound',
      limiter: {
        max: 20,
        duration: 1000,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    SmtpModule,
    NotificationsModule
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastsProcessor],
  exports: [BroadcastsService],
})
export class BroadcastsModule {}

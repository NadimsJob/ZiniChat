import { Module } from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastsController } from './broadcasts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { BullModule } from '@nestjs/bullmq';
import { BroadcastsProcessor } from './broadcasts.processor';
import { SmtpModule } from '../smtp/smtp.module';

@Module({
  imports: [
    PrismaModule, 
    BillingModule,
    BullModule.registerQueue({ name: 'broadcasts' }),
    BullModule.registerQueue({ name: 'whatsapp-outbound' }),
    SmtpModule
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastsProcessor],
  exports: [BroadcastsService],
})
export class BroadcastsModule {}

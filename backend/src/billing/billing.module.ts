import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionReminderService } from './subscription-reminder.service';
import { SmtpModule } from '../smtp/smtp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  imports: [PrismaModule, SmtpModule, NotificationsModule],
  controllers: [BillingController, CouponsController],
  providers: [BillingService, SubscriptionReminderService, CouponsService],
  exports: [BillingService, CouponsService]
})
export class BillingModule {}

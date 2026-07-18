import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { SmtpModule } from '../smtp/smtp.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SmtpModule, NotificationsModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService]
})
export class PaymentsModule {}

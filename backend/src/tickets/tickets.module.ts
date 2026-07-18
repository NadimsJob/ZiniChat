import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { SmtpModule } from '../smtp/smtp.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SmtpModule, NotificationsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}

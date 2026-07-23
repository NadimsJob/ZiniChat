import { Module } from '@nestjs/common';
import { MfsPaymentsService } from './mfs-payments.service';
import { MfsPaymentsController } from './mfs-payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SmtpModule } from '../smtp/smtp.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, SmtpModule, NotificationsModule],
  controllers: [MfsPaymentsController],
  providers: [MfsPaymentsService],
  exports: [MfsPaymentsService],
})
export class MfsPaymentsModule {}

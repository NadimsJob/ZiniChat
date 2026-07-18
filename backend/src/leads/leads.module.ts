import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadsCronService } from './leads.cron';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsCronService],
  exports: [LeadsService],
})
export class LeadsModule {}

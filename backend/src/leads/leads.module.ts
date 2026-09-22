import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadsCronService } from './leads.cron';
import { NotificationsModule } from '../notifications/notifications.module';
import { CapiHubModule } from '../capi-hub/capi-hub.module';

@Module({
  imports: [PrismaModule, NotificationsModule, CapiHubModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsCronService],
  exports: [LeadsService],
})
export class LeadsModule {}

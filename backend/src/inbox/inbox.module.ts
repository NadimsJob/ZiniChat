import { Module, forwardRef } from '@nestjs/common';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { InboxGateway } from './inbox.gateway';
import { ActivityLogService } from './activity-log.service';
import { UserPresenceService } from './user-presence.service';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from '../ai/ai.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { TenantsModule } from '../tenants/tenants.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'whatsapp-outbound',
    }),
    BullModule.registerQueue({
      name: 'messenger-outbound',
    }),
    AiModule,
    forwardRef(() => OrchestratorModule),
    TenantsModule,
    NotificationsModule,
  ],
  controllers: [InboxController],
  providers: [InboxService, InboxGateway, ActivityLogService, UserPresenceService],
  exports: [InboxService, InboxGateway, ActivityLogService, UserPresenceService]
})
export class InboxModule {}

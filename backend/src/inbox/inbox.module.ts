import { Module, forwardRef } from '@nestjs/common';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { InboxGateway } from './inbox.gateway';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from '../ai/ai.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { TenantsModule } from '../tenants/tenants.module';

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
  ],
  controllers: [InboxController],
  providers: [InboxService, InboxGateway],
  exports: [InboxService, InboxGateway]
})
export class InboxModule {}

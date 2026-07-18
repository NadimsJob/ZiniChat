import { Module, forwardRef } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { InboxModule } from '../inbox/inbox.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    BillingModule,
    forwardRef(() => InboxModule),
  ],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}

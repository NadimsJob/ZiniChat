import { Module, forwardRef } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { InboxModule } from '../inbox/inbox.module';
import { BillingModule } from '../billing/billing.module';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TenantsModule } from '../tenants/tenants.module';
import { CapiHubModule } from '../capi-hub/capi-hub.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    BillingModule,
    OrdersModule,
    NotificationsModule,
    TenantsModule,
    CapiHubModule,
    forwardRef(() => InboxModule),
  ],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}

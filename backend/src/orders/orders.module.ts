import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { InboxModule } from '../inbox/inbox.module';
import { CapiHubModule } from '../capi-hub/capi-hub.module';

@Module({
  imports: [PrismaModule, AiModule, CapiHubModule, forwardRef(() => InboxModule)],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

import { Module } from '@nestjs/common';
import { MessengerController } from './messenger.controller';
import { MessengerAuthController } from './messenger-auth.controller';
import { MessengerAuthService } from './messenger-auth.service';
import { MessengerProcessor } from './messenger.processor';
import { FacebookCommentsService } from './facebook-comments.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { InboxModule } from '../../inbox/inbox.module';
import { BillingModule } from '../../billing/billing.module';
import { TenantsModule } from '../../tenants/tenants.module';
import { AiModule } from '../../ai/ai.module';
import { BullModule } from '@nestjs/bullmq';

import { MessengerService } from './messenger.service';

@Module({
  imports: [
    NotificationsModule, 
    PrismaModule, 
    InboxModule, 
    BillingModule,
    TenantsModule,
    AiModule,
    BullModule.registerQueue({
      name: 'messenger-outbound',
    })
  ],
  controllers: [MessengerController, MessengerAuthController],
  providers: [MessengerAuthService, MessengerProcessor, MessengerService, FacebookCommentsService],
  exports: [MessengerService, FacebookCommentsService],
})
export class MessengerModule {}

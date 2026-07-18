import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappAuthController } from './whatsapp-auth.controller';
import { WhatsappAuthService } from './whatsapp-auth.service';
import { WhatsappProcessor } from './whatsapp.processor';
import { WidgetController } from './widget.controller';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { InboxModule } from '../../inbox/inbox.module';
import { BillingModule } from '../../billing/billing.module';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappWebModule } from '../whatsapp-web/whatsapp-web.module';

@Module({
  imports: [
    NotificationsModule, 
    PrismaModule, 
    InboxModule, 
    BillingModule,
    WhatsappWebModule,
    BullModule.registerQueue({
      name: 'whatsapp-outbound',
    })
  ],
  controllers: [WhatsappController, WhatsappAuthController, WidgetController],
  providers: [WhatsappService, WhatsappAuthService, WhatsappProcessor],
  exports: [WhatsappService],
})
export class WhatsappModule {}

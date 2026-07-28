import { Module } from '@nestjs/common';
import { WhatsappWebService } from './whatsapp-web.service';
import { WhatsappWebController } from './whatsapp-web.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { InboxModule } from '../../inbox/inbox.module';
import { BillingModule } from '../../billing/billing.module';

@Module({
  imports: [PrismaModule, InboxModule, BillingModule],
  providers: [WhatsappWebService],
  controllers: [WhatsappWebController],
  exports: [WhatsappWebService],
})
export class WhatsappWebModule {}

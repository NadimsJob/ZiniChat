import { Module } from '@nestjs/common';
import { WhatsappWebService } from './whatsapp-web.service';
import { WhatsappWebController } from './whatsapp-web.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { InboxModule } from '../../inbox/inbox.module';

@Module({
  imports: [PrismaModule, InboxModule],
  providers: [WhatsappWebService],
  controllers: [WhatsappWebController],
  exports: [WhatsappWebService],
})
export class WhatsappWebModule {}

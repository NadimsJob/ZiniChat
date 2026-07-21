import { Module } from '@nestjs/common';
import { SupportChatService } from './support-chat.service';
import { SupportChatController } from './support-chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [SupportChatController],
  providers: [SupportChatService],
})
export class SupportChatModule {}

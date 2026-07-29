import { Module, Global } from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { SmtpController } from './smtp.controller';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './email.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [SmtpController],
  providers: [SmtpService, EmailProcessor],
  exports: [SmtpService, BullModule]
})
export class SmtpModule {}

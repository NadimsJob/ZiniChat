import { Module } from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { SmtpController } from './smtp.controller';

@Module({
  controllers: [SmtpController],
  providers: [SmtpService],
  exports: [SmtpService]
})
export class SmtpModule {}

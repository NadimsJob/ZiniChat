import { Module } from '@nestjs/common';
import { LoginLogsService } from './login-logs.service';
import { LoginLogsController } from './login-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LoginLogsService],
  controllers: [LoginLogsController],
  exports: [LoginLogsService],
})
export class LoginLogsModule {}

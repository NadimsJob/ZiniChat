import { Module } from '@nestjs/common';
import { BusinessNatureController } from './business-nature.controller';
import { BusinessNatureService } from './business-nature.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessNatureController],
  providers: [BusinessNatureService],
})
export class BusinessNatureModule {}

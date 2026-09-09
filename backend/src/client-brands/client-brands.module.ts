import { Module } from '@nestjs/common';
import { ClientBrandsService } from './client-brands.service';
import { ClientBrandsController } from './client-brands.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientBrandsController],
  providers: [ClientBrandsService],
  exports: [ClientBrandsService]
})
export class ClientBrandsModule {}

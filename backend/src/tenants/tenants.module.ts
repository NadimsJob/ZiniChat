import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { QuotaService } from './quota.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantsController],
  providers: [TenantsService, QuotaService],
  exports: [TenantsService, QuotaService]
})
export class TenantsModule {}

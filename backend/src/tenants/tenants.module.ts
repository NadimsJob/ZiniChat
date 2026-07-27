import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { QuotaService } from './quota.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [TenantsController],
  providers: [TenantsService, QuotaService],
  exports: [TenantsService, QuotaService]
})
export class TenantsModule {}


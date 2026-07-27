import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { TenantStatsController } from './tenant-stats.controller';
import { TenantStatsService } from './tenant-stats.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [PrismaModule, BillingModule, TenantsModule],
  controllers: [StatsController, TenantStatsController],
  providers: [StatsService, TenantStatsService],
})
export class StatsModule {}


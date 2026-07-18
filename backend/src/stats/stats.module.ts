import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { TenantStatsController } from './tenant-stats.controller';
import { TenantStatsService } from './tenant-stats.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StatsController, TenantStatsController],
  providers: [StatsService, TenantStatsService],
})
export class StatsModule {}

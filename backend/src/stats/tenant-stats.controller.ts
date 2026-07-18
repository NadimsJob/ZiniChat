import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { TenantStatsService } from './tenant-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('stats/tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantStatsController {
  constructor(private readonly tenantStatsService: TenantStatsService) {}

  @Get('dashboard')
  getDashboardOverview(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.tenantStatsService.getDashboardOverview(tenantId);
  }
}

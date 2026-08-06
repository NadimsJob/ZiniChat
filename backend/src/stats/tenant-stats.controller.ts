import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { TenantStatsService } from './tenant-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('stats/tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantStatsController {
  constructor(private readonly tenantStatsService: TenantStatsService) {}

  @Get('dashboard')
  getDashboardOverview(
    @Request() req: any,
    @Query('range') range?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.tenantStatsService.getDashboardOverview(tenantId, range, startDate, endDate);
  }

  @Get('vertical-conversion')
  getVerticalConversionStats(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.tenantStatsService.getVerticalConversionStats(tenantId);
  }

  @Get('charts')
  getChartData(
    @Request() req: any,
    @Query('range') range?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.tenantStatsService.getChartData(tenantId, range, startDate, endDate);
  }

  @Get('conversations/recent')
  getRecentConversations(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.tenantStatsService.getRecentConversations(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('leads/recent')
  getRecentLeads(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.tenantStatsService.getRecentLeads(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('orders/recent')
  getRecentOrders(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.tenantStatsService.getRecentOrders(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('activity')
  getActivityTimeline(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.tenantStatsService.getActivityTimeline(tenantId);
  }

  @Get('ai-summary')
  getAiSummary(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.tenantStatsService.getAiSummary(tenantId);
  }

  @Get('comments/recent')
  getRecentComments(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.tenantStatsService.getRecentFacebookComments(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 6,
    );
  }
}

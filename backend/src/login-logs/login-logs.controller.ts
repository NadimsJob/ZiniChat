import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { LoginLogsService } from './login-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('login-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class LoginLogsController {
  constructor(private readonly loginLogsService: LoginLogsService) {}

  /**
   * GET /login-logs
   * Paginated, filterable login audit log (Superadmin only)
   * Query params: page, limit, status, email, ipAddress, dateFrom, dateTo
   */
  @Get()
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('email') email?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.loginLogsService.getLoginLogs({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      email,
      ipAddress,
      dateFrom,
      dateTo,
    });
  }

  /**
   * GET /login-logs/stats
   * Summary statistics for Superadmin dashboard widget (Superadmin only)
   */
  @Get('stats')
  async getStats() {
    return this.loginLogsService.getStats();
  }
}

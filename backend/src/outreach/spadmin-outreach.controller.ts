import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { SpadminOutreachService, UpdateGlobalOutreachDto, AddSuppressionDto } from './spadmin-outreach.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller(['spadmin/ai-outreach', 'sp@dmin/ai-outreach'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class SpadminOutreachController {
  constructor(private readonly outreachService: SpadminOutreachService) {}

  @Get()
  async getConfig() {
    return this.outreachService.getConfig();
  }

  @Patch()
  async updateConfig(@Body() dto: UpdateGlobalOutreachDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.outreachService.updateConfig(dto, userId);
  }

  @Post('kill-switch')
  async toggleKillSwitch(@Body() body: { isPaused: boolean; reason?: string }, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.outreachService.toggleEmergencyKillSwitch(body.isPaused, body.reason, userId);
  }

  @Get('suppressions')
  async getSuppressions(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.outreachService.getSuppressions(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('suppressions')
  async addSuppression(@Body() dto: AddSuppressionDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.outreachService.addSuppression(dto, userId);
  }

  @Delete('suppressions/:id')
  async deleteSuppression(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.outreachService.deleteSuppression(id, userId);
  }

  @Post('test-serp')
  async testSerpConnection() {
    return this.outreachService.testSerpConnection();
  }
}

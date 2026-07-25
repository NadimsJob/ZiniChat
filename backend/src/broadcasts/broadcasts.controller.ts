import { Controller, Get, Post, Body, UseGuards, Request, Param, Patch } from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
@UseGuards(JwtAuthGuard)
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Get('templates')
  getTemplates(@Request() req: any) {
    return this.broadcastsService.getTemplates(req.user.tenantId);
  }

  @Post('templates')
  createTemplate(@Request() req: any, @Body() data: any) {
    return this.broadcastsService.createTemplate(req.user.tenantId, data);
  }

  @Get()
  getBroadcasts(@Request() req: any) {
    return this.broadcastsService.getBroadcasts(req.user.tenantId);
  }

  @Post()
  createBroadcast(@Request() req: any, @Body() data: any) {
    return this.broadcastsService.createBroadcast(req.user.tenantId, data);
  }

  // --- Superadmin Endpoints ---
  @Get('admin/templates')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  getAllTemplatesForAdmin() {
    return this.broadcastsService.getAllTemplatesForAdmin();
  }

  @Patch('admin/templates/:id/status')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  updateTemplateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.broadcastsService.updateTemplateStatus(id, status);
  }
}

import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('stages')
  @RequirePermissions('manage:contacts', 'read:contacts')
  getStages(@Req() req: any) {
    return this.leadsService.getStages(req.user.tenantId);
  }

  @Post('stages')
  @RequirePermissions('manage:contacts')
  createStage(@Req() req: any, @Body() body: any) {
    return this.leadsService.createStage(req.user.tenantId, body);
  }

  @Patch('stages/:id')
  @RequirePermissions('manage:contacts')
  updateStage(@Param('id') id: string, @Body() body: any) {
    return this.leadsService.updateStage(id, body);
  }

  @Delete('stages/:id')
  @RequirePermissions('manage:contacts')
  deleteStage(@Param('id') id: string) {
    return this.leadsService.deleteStage(id);
  }

  @Get()
  @RequirePermissions('manage:contacts', 'read:contacts')
  getLeads(@Req() req: any) {
    return this.leadsService.getLeads(req.user.tenantId);
  }

  @Get('team')
  @RequirePermissions('manage:contacts', 'read:contacts')
  getTeamMembers(@Req() req: any) {
    return this.leadsService.getTeamMembers(req.user.tenantId);
  }

  @Post()
  @RequirePermissions('manage:contacts')
  createLead(@Req() req: any, @Body() body: any) {
    return this.leadsService.createLead(req.user.tenantId, body);
  }

  @Patch(':id')
  @RequirePermissions('manage:contacts')
  updateLead(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.leadsService.updateLead(req.user.tenantId, id, body);
  }

  @Post(':id/notes')
  @RequirePermissions('manage:contacts')
  addNote(@Req() req: any, @Param('id') id: string, @Body('content') content: string) {
    return this.leadsService.addNote(req.user.tenantId, id, content, req.user.userId);
  }
}

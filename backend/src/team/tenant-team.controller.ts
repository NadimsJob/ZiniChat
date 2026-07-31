import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TenantTeamService } from './tenant-team.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tenant/team')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantTeamController {
  constructor(private readonly tenantTeamService: TenantTeamService) {}

  @Post()
  @Roles('owner', 'admin') // Only tenant owners and admins can create agents
  create(@Request() req: any, @Body() createData: any) {
    const tenantId = req.user.tenantId;
    return this.tenantTeamService.createAgent(tenantId, createData);
  }

  @Get()
  findAll(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.tenantTeamService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.tenantTeamService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('owner', 'admin') // Only tenant owners and admins can update agents
  update(@Request() req: any, @Param('id') id: string, @Body() updateData: any) {
    const tenantId = req.user.tenantId;
    return this.tenantTeamService.updateAgent(tenantId, id, updateData);
  }

  @Delete(':id')
  @Roles('owner', 'admin') // Only tenant owners and admins can remove agents
  remove(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.tenantTeamService.remove(tenantId, id);
  }
}

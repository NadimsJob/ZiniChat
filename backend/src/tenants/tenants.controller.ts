import { Controller, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('superadmin')
@RequirePermissions('manage:tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    const actorUserId = req.user.userId;
    return this.tenantsService.updateStatus(id, status, actorUserId);
  }

  @Patch(':id/customize')
  customizePlan(
    @Param('id') id: string,
    @Body() customizationData: any,
    @Req() req: any,
  ) {
    const actorUserId = req.user.userId;
    return this.tenantsService.customizePlan(id, customizationData, actorUserId);
  }

  @Patch(':id/ai-config')
  updateAiConfig(
    @Param('id') id: string,
    @Body('customAiConfigId') customAiConfigId: string | null,
    @Req() req: any,
  ) {
    const actorUserId = req.user.userId;
    return this.tenantsService.updateAiConfig(id, customAiConfigId, actorUserId);
  }
}

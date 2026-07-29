import { Controller, Get, Patch, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('public/client-logos')
  getPublicClientLogos() {
    return this.tenantsService.getPublicClientLogos();
  }

  @Get('me/effective-plan')
  @UseGuards(JwtAuthGuard)
  getEffectivePlan(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.tenantsService.getEffectivePlan(tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:tenants')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id/customization')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:tenants')
  getForCustomizeModal(@Param('id') id: string) {
    return this.tenantsService.getForCustomizeModal(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:tenants')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:tenants')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    const actorUserId = req.user.userId;
    return this.tenantsService.updateStatus(id, status, actorUserId);
  }

  @Patch(':id/customize')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:tenants')
  customizePlan(
    @Param('id') id: string,
    @Body() customizationData: any,
    @Req() req: any,
  ) {
    const actorUserId = req.user.userId;
    return this.tenantsService.customizePlan(id, customizationData, actorUserId);
  }

  @Post(':id/customize-plan')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:tenants')
  customizePlanPost(
    @Param('id') id: string,
    @Body() customizationData: any,
    @Req() req: any,
  ) {
    const actorUserId = req.user.userId;
    return this.tenantsService.customizePlan(id, customizationData, actorUserId);
  }

  @Post(':id/reset-customizations')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:tenants')
  resetCustomizations(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const actorUserId = req.user.userId;
    return this.tenantsService.resetCustomizations(id, actorUserId);
  }

  @Patch(':id/ai-config')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:tenants')
  updateAiConfig(
    @Param('id') id: string,
    @Body('customAiConfigId') customAiConfigId: string | null,
    @Req() req: any,
  ) {
    const actorUserId = req.user.userId;
    return this.tenantsService.updateAiConfig(id, customAiConfigId, actorUserId);
  }
}



import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  // Public Endpoints
  @Get('plans')
  getActivePlans() {
    return this.packagesService.getActivePlans();
  }

  @Get('addons')
  getActiveAddons() {
    return this.packagesService.getActiveAddons();
  }

  // Protected Endpoints (Superadmin)
  @Get('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  getAllPlans() {
    return this.packagesService.getAllPlans();
  }

  @Post('admin/plans')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  createPlan(@Body() body: any) {
    return this.packagesService.createPlan(body);
  }

  @Patch('admin/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  updatePlan(@Param('id') id: string, @Body() body: any) {
    return this.packagesService.updatePlan(id, body);
  }

  @Patch('admin/plans/:id/default')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  setDefaultPlan(@Param('id') id: string) {
    return this.packagesService.setDefaultPlan(id);
  }

  @Delete('admin/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  deletePlan(@Param('id') id: string) {
    return this.packagesService.deletePlan(id);
  }

  // Addons
  @Get('admin/addons')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  getAllAddons() {
    return this.packagesService.getAllAddons();
  }

  @Post('admin/addons')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  createAddon(@Body() body: any) {
    return this.packagesService.createAddon(body);
  }

  @Patch('admin/addons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  updateAddon(@Param('id') id: string, @Body() body: any) {
    return this.packagesService.updateAddon(id, body);
  }

  @Delete('admin/addons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  deleteAddon(@Param('id') id: string) {
    return this.packagesService.deleteAddon(id);
  }
}

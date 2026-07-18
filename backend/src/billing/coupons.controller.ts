import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  findAll() {
    return this.couponsService.findAll();
  }

  @Post()
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  create(@Body() data: any) {
    return this.couponsService.create(data);
  }

  @Patch(':id/toggle')
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  toggleStatus(@Param('id') id: string) {
    return this.couponsService.toggleStatus(id);
  }

  @Get('validate')
  // Available to any authenticated tenant user checking out
  validate(@Query('code') code: string) {
    if (!code) return null;
    return this.couponsService.validate(code);
  }
}

import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { BusinessNatureService } from './business-nature.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('business-natures')
export class BusinessNatureController {
  constructor(private readonly businessNatureService: BusinessNatureService) {}

  @Get()
  async findAll() {
    return this.businessNatureService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async create(@Body() data: { name: string; nameBn?: string; isActive?: boolean }) {
    return this.businessNatureService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async update(@Param('id') id: string, @Body() data: { name?: string; nameBn?: string; isActive?: boolean }) {
    return this.businessNatureService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async remove(@Param('id') id: string) {
    return this.businessNatureService.remove(id);
  }
}

import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('ai-config')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('superadmin')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get()
  @RequirePermissions('manage:site')
  getConfigs() {
    return this.aiService.getConfigs();
  }

  @Post()
  @RequirePermissions('manage:site')
  saveConfig(@Body() body: any) {
    return this.aiService.saveConfig(body);
  }

  @Delete(':id')
  @RequirePermissions('manage:site')
  deleteConfig(@Param('id') id: string) {
    return this.aiService.deleteConfig(id);
  }

  @Post(':id/test')
  @RequirePermissions('manage:site')
  testConfigConnection(@Param('id') id: string) {
    return this.aiService.testConfigConnection(id);
  }
}

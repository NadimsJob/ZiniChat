import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { LandingPageService } from './landing-page.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('landing-page')
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Get('config')
  getConfig() {
    return this.landingPageService.getConfig();
  }

  @Patch('config')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:site')
  updateConfig(@Body() body: any) {
    return this.landingPageService.updateConfig(body);
  }
}

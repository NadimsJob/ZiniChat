import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('smtp')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('superadmin')
export class SmtpController {
  constructor(private readonly smtpService: SmtpService) {}

  @Get()
  @RequirePermissions('manage:site')
  getConfig() {
    return this.smtpService.getConfig();
  }

  @Patch()
  @RequirePermissions('manage:site')
  updateConfig(@Body() body: any) {
    return this.smtpService.updateConfig(body);
  }

  @Post('test')
  @RequirePermissions('manage:site')
  sendTestMail(@Body('to') to: string) {
    return this.smtpService.sendTestMail(to);
  }
}

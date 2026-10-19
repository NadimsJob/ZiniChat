import { Controller, Get, Post, Put, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { TenantSmtpService, UpsertTenantSmtpDto, VerifyTenantSmtpDto } from './tenant-smtp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller(['tenant/smtp', 'outreach/smtp'])
@UseGuards(JwtAuthGuard)
export class TenantSmtpController {
  constructor(private readonly tenantSmtpService: TenantSmtpService) {}

  @Get()
  async getSetting(@Request() req: any) {
    return this.tenantSmtpService.getSmtpSetting(req.user.tenantId);
  }

  @Post()
  async createOrUpdateSetting(@Request() req: any, @Body() dto: UpsertTenantSmtpDto) {
    const actorUserId = req.user?.id || req.user?.userId;
    return this.tenantSmtpService.upsertSmtpSetting(req.user.tenantId, dto, actorUserId);
  }

  @Put()
  async putSetting(@Request() req: any, @Body() dto: UpsertTenantSmtpDto) {
    const actorUserId = req.user?.id || req.user?.userId;
    return this.tenantSmtpService.upsertSmtpSetting(req.user.tenantId, dto, actorUserId);
  }

  @Post('verify')
  async verifyConnection(@Request() req: any, @Body() dto: VerifyTenantSmtpDto) {
    return this.tenantSmtpService.verifySmtpConnection(req.user.tenantId, dto?.testRecipientEmail);
  }

  @Delete()
  async deleteSetting(@Request() req: any) {
    return this.tenantSmtpService.deleteSmtpSetting(req.user.tenantId);
  }
}

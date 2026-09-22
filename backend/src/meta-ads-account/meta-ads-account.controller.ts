import { Controller, Get, Post, Body, Query, Req, UseGuards, Delete, Param } from '@nestjs/common';
import { MetaAdsAccountService } from './meta-ads-account.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('meta-ads-account')
@UseGuards(JwtAuthGuard)
export class MetaAdsAccountController {
  constructor(private readonly metaAdsAccountService: MetaAdsAccountService) {}

  @Get('oauth/url')
  async initiateOAuth(@Req() req: any, @Query('redirectUri') redirectUri: string) {
    const tenantId = (req.user as any).tenantId;
    return this.metaAdsAccountService.initiateOAuth(tenantId, redirectUri);
  }

  @Post('oauth/callback')
  async handleCallback(@Req() req: any, @Body() body: { code: string, redirectUri: string }) {
    const tenantId = (req.user as any).tenantId;
    return this.metaAdsAccountService.handleCallback(body.code, tenantId, body.redirectUri);
  }

  @Get(['', 'accounts'])
  async getConnectedAccounts(@Req() req: any) {
    const tenantId = (req.user as any).tenantId;
    return this.metaAdsAccountService.getConnectedAccounts(tenantId);
  }

  @Delete('accounts/:id')
  async disconnectAccount(@Req() req: any, @Param('id') id: string) {
    const tenantId = (req.user as any).tenantId;
    // ensure the account belongs to the tenant
    const accounts = await this.metaAdsAccountService.getConnectedAccounts(tenantId);
    if (!accounts.find(a => a.id === id)) {
      return { success: false, message: 'Account not found' };
    }
    return this.metaAdsAccountService.disconnectAccount(tenantId, id);
  }
}

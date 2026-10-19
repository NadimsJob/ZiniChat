import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { OutreachDispatchService, StartCampaignOptions } from './outreach-dispatch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller(['tenant/outreach/dispatch', 'outreach/dispatch'])
@UseGuards(JwtAuthGuard)
export class OutreachDispatchController {
  constructor(private readonly dispatchService: OutreachDispatchService) {}

  @Post('campaigns/:id/start')
  async startCampaign(
    @Request() req: any,
    @Param('id') campaignId: string,
    @Body() options?: StartCampaignOptions,
  ) {
    const tenantId = req.user?.tenantId;
    return this.dispatchService.startCampaign(campaignId, tenantId, options);
  }

  @Post('campaigns/:id/pause')
  async pauseCampaign(
    @Request() req: any,
    @Param('id') campaignId: string,
  ) {
    const tenantId = req.user?.tenantId;
    return this.dispatchService.pauseCampaign(campaignId, tenantId);
  }

  @Post('campaigns/:id/resume')
  async resumeCampaign(
    @Request() req: any,
    @Param('id') campaignId: string,
    @Body() options?: StartCampaignOptions,
  ) {
    const tenantId = req.user?.tenantId;
    return this.dispatchService.resumeCampaign(campaignId, tenantId, options);
  }

  @Get('campaigns/:id/stats')
  async getCampaignStats(
    @Request() req: any,
    @Param('id') campaignId: string,
  ) {
    const tenantId = req.user?.tenantId;
    return this.dispatchService.getCampaignQueueStats(campaignId, tenantId);
  }
}

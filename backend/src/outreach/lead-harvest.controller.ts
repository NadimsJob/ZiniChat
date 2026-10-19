import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { LeadHarvestService, HarvestOptions } from './lead-harvest.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export class TriggerHarvestDto {
  maxHarvestLimit?: number;
  isTestMode?: boolean;
}

@Controller(['tenant/outreach', 'outreach'])
@UseGuards(JwtAuthGuard)
export class LeadHarvestController {
  constructor(private readonly leadHarvestService: LeadHarvestService) {}

  @Post('campaigns/:id/harvest')
  async triggerHarvest(
    @Request() req: any,
    @Param('id') campaignId: string,
    @Body() dto: TriggerHarvestDto,
  ) {
    return this.leadHarvestService.harvestLeadsForCampaign(campaignId, {
      maxHarvestLimit: dto?.maxHarvestLimit,
      isTestMode: dto?.isTestMode,
    });
  }
}

import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdsAgentService } from './ads-agent.service';

@Controller('ads-agent')
@UseGuards(JwtAuthGuard)
export class AdsAgentController {
  constructor(private readonly adsAgentService: AdsAgentService) {}

  @Post('init')
  async initDraft(@Req() req: any, @Body() body: { adAccountId: string }) {
    return this.adsAgentService.initDraft(req.user.tenantId, body.adAccountId);
  }

  @Post('turn')
  async processTurn(@Req() req: any, @Body() body: {
    draftId: string;
    turn: number;
    userMessage?: string;
    productIds?: string[];
    locations?: string[];
    budget?: number;
    durationDays?: number;
    placements?: string[];
    headline?: string;
    bodyText?: string;
    callToAction?: string;
    imageUrl?: string;
  }) {
    return this.adsAgentService.processTurn(req.user.tenantId, body.draftId, body.turn, body);
  }

  @Post('approve')
  async approveAndRunAd(@Req() req: any, @Body() body: { draftId: string }) {
    return this.adsAgentService.approveAndRunAd(req.user.tenantId, body.draftId);
  }

  @Get('drafts')
  async getDraftsAndCampaigns(@Req() req: any) {
    return this.adsAgentService.getDraftsAndCampaigns(req.user.tenantId);
  }

  @Patch('campaigns/:draftId/status')
  async toggleCampaignStatus(
    @Req() req: any,
    @Param('draftId') draftId: string,
    @Body() body: { action: 'PAUSE' | 'RESUME' }
  ) {
    return this.adsAgentService.toggleCampaignStatus(req.user.tenantId, draftId, body.action);
  }

  @Patch('campaigns/:draftId/auto-scale')
  async toggleAutoScaling(
    @Req() req: any,
    @Param('draftId') draftId: string,
    @Body() body: { enabled: boolean; maxBudget?: number }
  ) {
    return this.adsAgentService.toggleAutoScaling(req.user.tenantId, draftId, body.enabled, body.maxBudget);
  }
}


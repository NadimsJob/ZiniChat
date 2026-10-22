import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { McpAdsService } from './mcp-ads.service';
import { McpAdsServer } from './mcp-ads.server';

@Controller(['meta-ads', 'mcp-ads'])
@UseGuards(JwtAuthGuard)
export class McpAdsController {
  constructor(
    private readonly mcpAdsService: McpAdsService,
    private readonly mcpAdsServer: McpAdsServer,
  ) {}

  @Get('balance/:adAccountId')
  async getAdAccountBalance(@Request() req: any, @Param('adAccountId') adAccountId: string) {
    return this.mcpAdsService.getAdAccountBalance(req.user.tenantId, adAccountId);
  }

  @Get('campaigns/:adAccountId')
  async listCampaigns(
    @Request() req: any,
    @Param('adAccountId') adAccountId: string,
    @Query('status') status?: string,
  ) {
    return this.mcpAdsService.listCampaigns(req.user.tenantId, adAccountId, status);
  }

  @Get('campaigns/:campaignId/adsets')
  async listAdSets(@Request() req: any, @Param('campaignId') campaignId: string) {
    return this.mcpAdsService.listAdSets(req.user.tenantId, campaignId);
  }

  @Get('insights/:adAccountId')
  async getAdInsights(
    @Request() req: any,
    @Param('adAccountId') adAccountId: string,
    @Query('datePreset') datePreset?: string,
  ) {
    return this.mcpAdsService.getAdInsights(req.user.tenantId, adAccountId, datePreset);
  }

  @Get('page-posts')
  async getPagePosts(
    @Request() req: any,
    @Query('adAccountId') adAccountId?: string,
    @Query('pageId') pageId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.mcpAdsService.getPagePosts(
      req.user.tenantId,
      adAccountId,
      pageId,
      limit ? parseInt(limit, 10) : 25,
    );
  }

  @Post('boost-post')
  async boostPagePost(
    @Request() req: any,
    @Body() dto: {
      adAccountId: string;
      pagePostId: string;
      pageId: string;
      dailyBudget: number;
      durationDays?: number;
      campaignName?: string;
      targeting?: any;
    },
  ) {
    return this.mcpAdsService.boostPagePost(req.user.tenantId, dto);
  }

  @Patch('objects/:objectId/budget')
  async updateDailyBudget(
    @Request() req: any,
    @Param('objectId') objectId: string,
    @Body() body: { adAccountId: string; newDailyBudget: number },
  ) {
    return this.mcpAdsService.updateDailyBudget(
      req.user.tenantId,
      body.adAccountId,
      objectId,
      body.newDailyBudget,
    );
  }

  @Patch('objects/:objectId/scale')
  async scaleBudgetByPercentage(
    @Request() req: any,
    @Param('objectId') objectId: string,
    @Body() body: { adAccountId: string; percentage: number },
  ) {
    return this.mcpAdsService.scaleBudgetByPercentage(
      req.user.tenantId,
      body.adAccountId,
      objectId,
      body.percentage,
    );
  }

  @Patch('objects/:objectId/status')
  async updateStatus(
    @Request() req: any,
    @Param('objectId') objectId: string,
    @Body() body: { adAccountId: string; status: 'ACTIVE' | 'PAUSED' },
  ) {
    return this.mcpAdsService.updateStatus(
      req.user.tenantId,
      body.adAccountId,
      objectId,
      body.status,
    );
  }

  @Patch('adsets/:adSetId/targeting')
  async updateAdSetTargeting(
    @Request() req: any,
    @Param('adSetId') adSetId: string,
    @Body() body: { adAccountId: string; targeting: any },
  ) {
    return this.mcpAdsService.updateAdSetTargeting(
      req.user.tenantId,
      body.adAccountId,
      adSetId,
      body.targeting,
    );
  }

  @Post('campaigns/:campaignId/ai-retarget')
  async aiRetargetAudience(
    @Request() req: any,
    @Param('campaignId') campaignId: string,
    @Body()
    dto: {
      adAccountId: string;
      adSetId?: string;
      problemDescription?: string;
      targetBuyerPersona?: string;
    },
  ) {
    return this.mcpAdsService.aiRetargetAudience(req.user.tenantId, {
      ...dto,
      campaignId,
    });
  }

  @Patch('campaigns/:campaignId/edit')
  async updateCampaignDetails(
    @Request() req: any,
    @Param('campaignId') campaignId: string,
    @Body()
    dto: {
      adAccountId: string;
      name?: string;
      status?: 'ACTIVE' | 'PAUSED';
      dailyBudget?: number;
      adSetId?: string;
      targeting?: any;
    },
  ) {
    return this.mcpAdsService.updateCampaignDetails(req.user.tenantId, campaignId, dto);
  }

  @Post('campaigns/:campaignId/analyze-ai')
  async analyzeCampaignWithAi(
    @Request() req: any,
    @Param('campaignId') campaignId: string,
    @Body() body: { adAccountId: string },
  ) {
    return this.mcpAdsService.analyzeCampaignWithAi(
      req.user.tenantId,
      body.adAccountId,
      campaignId,
    );
  }

  @Post('campaigns/apply-ai-recommendation')
  async applyAiRecommendation(
    @Request() req: any,
    @Body() dto: {
      adAccountId: string;
      campaignId: string;
      adSetId?: string;
      actionType: 'SCALE_BUDGET' | 'UPDATE_TARGETING' | 'TOGGLE_STATUS';
      percentage?: number;
      newDailyBudget?: number;
      targeting?: any;
      status?: 'ACTIVE' | 'PAUSED';
    },
  ) {
    return this.mcpAdsService.applyAiRecommendation(req.user.tenantId, dto);
  }

  @Post('ai-review-ad')
  async reviewAdWithAi(
    @Request() req: any,
    @Body() dto: {
      adAccountId: string;
      campaignName?: string;
      objective: string;
      headlines?: string[];
      primaryTexts?: string[];
      headline?: string;
      bodyText?: string;
      callToAction?: string;
      targetAudience?: any;
      dailyBudget?: number;
      destinationUrl?: string;
      creativeSource?: 'upload' | 'existing_post';
      pagePostId?: string;
    },
  ) {
    return this.mcpAdsService.reviewAdWithAi(req.user.tenantId, dto);
  }

  @Get('pixels')
  async getAdAccountPixels(
    @Request() req: any,
    @Query('adAccountId') adAccountId?: string,
  ) {
    return this.mcpAdsService.getAdAccountPixels(req.user.tenantId, adAccountId);
  }

  @Post('launch-custom-campaign')
  async launchCustomCampaign(
    @Request() req: any,
    @Body() dto: {
      adAccountId: string;
      facebookPageId?: string;
      name: string;
      objective?: string;
      dailyBudget: number;
      durationDays?: number;
      headline?: string;
      headlines?: string[];
      bodyText?: string;
      primaryTexts?: string[];
      description?: string;
      callToAction?: string;
      linkUrl?: string;
      imageUrl?: string;
      creativeSource?: 'upload' | 'existing_post';
      pagePostId?: string;
      pagePostIds?: string[];
      targeting?: any;
      placements?: string[];
      pixelId?: string;
    },
  ) {
    return this.mcpAdsService.launchCustomCampaign(req.user.tenantId, dto);
  }

  @Get('tools')
  async getRegisteredTools() {
    return this.mcpAdsServer.getRegisteredTools();
  }
}


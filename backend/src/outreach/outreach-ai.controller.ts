import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import {
  OutreachAiService,
  AnalyzeBannerDto,
  GenerateDraftsDto,
  PreviewDraftDto,
} from './outreach-ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller(['tenant/outreach/ai', 'outreach/ai'])
@UseGuards(JwtAuthGuard)
export class OutreachAiController {
  constructor(private readonly outreachAiService: OutreachAiService) {}

  @Post('campaigns/:id/analyze-banner')
  async analyzeBanner(
    @Request() req: any,
    @Param('id') campaignId: string,
    @Body() dto: AnalyzeBannerDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.outreachAiService.analyzeBannerImage(campaignId, dto, tenantId);
  }

  @Post('campaigns/:id/context')
  async getCampaignContext(
    @Param('id') campaignId: string,
    @Body() dto: { forceRefreshCache?: boolean; isTestMode?: boolean },
  ) {
    return this.outreachAiService.compileCampaignContext(campaignId, dto);
  }

  @Post('campaigns/:id/preview')
  async previewDraft(
    @Request() req: any,
    @Param('id') campaignId: string,
    @Body() dto: PreviewDraftDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.outreachAiService.previewDraft(campaignId, dto, tenantId);
  }

  @Post('campaigns/:id/generate-drafts')
  async generateDrafts(
    @Request() req: any,
    @Param('id') campaignId: string,
    @Body() dto: GenerateDraftsDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.outreachAiService.generateDraftsForCampaign(campaignId, dto, tenantId);
  }

  @Post('campaigns/:id/leads/:leadId/draft')
  async generateDraftForLead(
    @Param('id') campaignId: string,
    @Param('leadId') leadId: string,
    @Body() dto: { isPreview?: boolean; isTestMode?: boolean },
  ) {
    return this.outreachAiService.generatePersonalizedEmail(campaignId, leadId, dto);
  }
}

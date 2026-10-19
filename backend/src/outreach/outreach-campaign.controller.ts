import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  OutreachCampaignService,
  CreateCampaignDto,
  CampaignLeadsQueryOptions,
} from './outreach-campaign.service';

@Controller(['tenant/outreach', 'outreach'])
@UseGuards(JwtAuthGuard)
export class OutreachCampaignController {
  constructor(private readonly campaignService: OutreachCampaignService) {}

  /**
   * Aggregate dashboard overview telemetry
   */
  @Get('overview')
  async getOverview(@Request() req: any) {
    const tenantId = req.user?.tenantId;
    return this.campaignService.getOverview(tenantId);
  }

  /**
   * List campaigns for the tenant
   */
  @Get('campaigns')
  async getCampaigns(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const tenantId = req.user?.tenantId;
    return this.campaignService.getCampaigns(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    });
  }

  /**
   * Create a new draft campaign
   */
  @Post('campaigns')
  async createCampaign(@Request() req: any, @Body() dto: CreateCampaignDto) {
    const tenantId = req.user?.tenantId;
    return this.campaignService.createCampaign(tenantId, dto);
  }

  /**
   * Get single campaign details with funnel counts
   */
  @Get('campaigns/:id')
  async getCampaignById(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.campaignService.getCampaignById(id, tenantId);
  }

  /**
   * Delete campaign
   */
  @Delete('campaigns/:id')
  async deleteCampaign(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.campaignService.deleteCampaign(id, tenantId);
  }

  /**
   * Paginated leads for a campaign with 1-click filters (e.g. clicked_no_order)
   */
  @Get('campaigns/:id/leads')
  async getCampaignLeads(
    @Request() req: any,
    @Param('id') id: string,
    @Query('filter') filter?: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user?.tenantId;
    return this.campaignService.getCampaignLeads(id, tenantId, {
      filter,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  /**
   * 1-Click Retargeting for "Clicked (No Order Yet)" audience
   */
  @Post('campaigns/:id/leads/retarget-broadcast')
  async retargetBroadcast(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.campaignService.retargetClickedNoOrderLeads(id, tenantId);
  }

  /**
   * Export campaign leads as CSV
   */
  @Get('campaigns/:id/export-leads')
  async exportLeads(
    @Request() req: any,
    @Param('id') id: string,
    @Query('filter') filter: string,
    @Res() res: any,
  ) {
    const tenantId = req.user?.tenantId;
    const csvContent = await this.campaignService.exportLeadsCsv(id, tenantId, filter);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="outreach_leads_${id}_${filter || 'all'}.csv"`,
    );
    return res.send(csvContent);
  }
}

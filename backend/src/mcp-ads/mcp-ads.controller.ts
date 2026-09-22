import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { McpAdsService } from './mcp-ads.service';
import { McpAdsServer } from './mcp-ads.server';

@Controller('mcp-ads')
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

  @Get('tools')
  async getRegisteredTools() {
    return this.mcpAdsServer.getRegisteredTools();
  }
}

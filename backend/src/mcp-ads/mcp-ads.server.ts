import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { McpAdsService } from './mcp-ads.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';

export interface RegisteredMcpTool {
  toolKey: string;
  displayName: string;
  riskLevel: 'READ_ONLY' | 'WRITE_SPEND' | 'WRITE_STRUCTURAL';
  isEnabled: boolean;
  handler: (tenantId: string, params: any) => Promise<any>;
}

@Injectable()
export class McpAdsServer implements OnModuleInit {
  private readonly logger = new Logger(McpAdsServer.name);
  private toolRegistry: Map<string, RegisteredMcpTool> = new Map();

  constructor(
    private readonly mcpAdsService: McpAdsService,
    private readonly marketingConfig: MetaMarketingConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing McpAdsServer...');
    await this.bootstrapTools();
  }

  async bootstrapTools() {
    const isEnabled = await this.marketingConfig.isMcpEnabled();
    if (!isEnabled) {
      this.logger.warn('Meta Marketing API is disabled platform-wide. McpAdsServer tools registration skipped.');
      this.toolRegistry.clear();
      return;
    }

    const enabledToolsFromDb = await this.marketingConfig.getEnabledTools();
    const enabledSet = new Set(enabledToolsFromDb.map((t) => t.toolKey));

    this.toolRegistry.clear();

    // Tool 1: get_ad_insights
    if (enabledSet.has('get_ad_insights')) {
      this.toolRegistry.set('get_ad_insights', {
        toolKey: 'get_ad_insights',
        displayName: 'Get Ad Insights',
        riskLevel: 'READ_ONLY',
        isEnabled: true,
        handler: async (tenantId: string, params: { adAccountId: string; datePreset?: string }) => {
          return this.mcpAdsService.getAdInsights(tenantId, params.adAccountId, params.datePreset);
        },
      });
    }

    // Tool 2: list_campaigns
    if (enabledSet.has('list_campaigns')) {
      this.toolRegistry.set('list_campaigns', {
        toolKey: 'list_campaigns',
        displayName: 'List Campaigns',
        riskLevel: 'READ_ONLY',
        isEnabled: true,
        handler: async (tenantId: string, params: { adAccountId: string; status?: string }) => {
          return this.mcpAdsService.listCampaigns(tenantId, params.adAccountId, params.status);
        },
      });
    }

    // Tool 3: get_ad_account_balance / get_account_overview
    if (enabledSet.has('get_ad_account_balance') || enabledSet.has('get_account_overview') || true) {
      this.toolRegistry.set('get_account_overview', {
        toolKey: 'get_account_overview',
        displayName: 'Get Account Overview',
        riskLevel: 'READ_ONLY',
        isEnabled: true,
        handler: async (tenantId: string, params: { adAccountId: string }) => {
          return this.mcpAdsService.getAdAccountBalance(tenantId, params.adAccountId);
        },
      });
      this.toolRegistry.set('get_ad_account_balance', {
        toolKey: 'get_ad_account_balance',
        displayName: 'Get Ad Account Balance',
        riskLevel: 'READ_ONLY',
        isEnabled: true,
        handler: async (tenantId: string, params: { adAccountId: string }) => {
          return this.mcpAdsService.getAdAccountBalance(tenantId, params.adAccountId);
        },
      });
    }

    // Tool 4: list_adsets
    this.toolRegistry.set('list_adsets', {
      toolKey: 'list_adsets',
      displayName: 'List Ad Sets',
      riskLevel: 'READ_ONLY',
      isEnabled: true,
      handler: async (tenantId: string, params: { campaignId: string }) => {
        return this.mcpAdsService.listAdSets(tenantId, params.campaignId);
      },
    });

    // Tool 5: update_daily_budget
    this.toolRegistry.set('update_daily_budget', {
      toolKey: 'update_daily_budget',
      displayName: 'Update Daily Budget',
      riskLevel: 'WRITE_SPEND',
      isEnabled: true,
      handler: async (tenantId: string, params: { adAccountId: string; object_id: string; new_daily_budget_usd: number }) => {
        return this.mcpAdsService.updateDailyBudget(tenantId, params.adAccountId, params.object_id, params.new_daily_budget_usd);
      },
    });

    // Tool 6: scale_budget_by_percentage
    this.toolRegistry.set('scale_budget_by_percentage', {
      toolKey: 'scale_budget_by_percentage',
      displayName: 'Scale Budget By Percentage',
      riskLevel: 'WRITE_SPEND',
      isEnabled: true,
      handler: async (tenantId: string, params: { adAccountId: string; object_id: string; percentage: number }) => {
        return this.mcpAdsService.scaleBudgetByPercentage(tenantId, params.adAccountId, params.object_id, params.percentage);
      },
    });

    // Tool 7: update_status
    this.toolRegistry.set('update_status', {
      toolKey: 'update_status',
      displayName: 'Update Status',
      riskLevel: 'WRITE_STRUCTURAL',
      isEnabled: true,
      handler: async (tenantId: string, params: { adAccountId: string; object_id: string; status: 'ACTIVE' | 'PAUSED' }) => {
        return this.mcpAdsService.updateStatus(tenantId, params.adAccountId, params.object_id, params.status);
      },
    });

    this.logger.log(`McpAdsServer initialized with ${this.toolRegistry.size} active tools.`);
  }

  getRegisteredTools(): Array<{ toolKey: string; displayName: string; riskLevel: string; isEnabled: boolean }> {
    return Array.from(this.toolRegistry.values()).map((t) => ({
      toolKey: t.toolKey,
      displayName: t.displayName,
      riskLevel: t.riskLevel,
      isEnabled: t.isEnabled,
    }));
  }

  async executeTool(toolKey: string, tenantId: string, params: any): Promise<any> {
    const isEnabled = await this.marketingConfig.isMcpEnabled();
    if (!isEnabled) {
      throw new Error('Meta Marketing API is disabled platform-wide.');
    }

    const tool = this.toolRegistry.get(toolKey);
    if (!tool || !tool.isEnabled) {
      throw new Error(`MCP tool '${toolKey}' is not registered or disabled.`);
    }

    return tool.handler(tenantId, params);
  }
}

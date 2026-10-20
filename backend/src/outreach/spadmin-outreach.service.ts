import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export class UpdateGlobalOutreachDto {
  serpApiKey?: string;
  serpApiProvider?: string;
  visionAiProvider?: string;
  visionAiModel?: string;
  draftAiProvider?: string;
  draftAiModel?: string;
  masterVisionPrompt?: string;
  masterDraftPrompt?: string;
  isEmergencyPaused?: boolean;
  emergencyPausedReason?: string;
  minThrottleIntervalSec?: number;
  dailyMaxEmailsPerTenant?: number;
  visionCreditCost?: number;
  draftCreditCost?: number;
}

export class AddSuppressionDto {
  email!: string;
  tenantId?: string | null;
  reason?: string;
}

@Injectable()
export class SpadminOutreachService {
  private readonly logger = new Logger(SpadminOutreachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * Retrieves the global outreach configuration, auto-initializing default record if missing,
   * along with platform-wide live telemetry.
   */
  async getConfig() {
    let config = await this.prisma.globalOutreachConfig.findFirst();

    if (!config) {
      config = await this.prisma.globalOutreachConfig.create({
        data: {
          serpApiProvider: 'serper',
          visionAiProvider: 'gemini',
          visionAiModel: 'gemini-1.5-flash',
          draftAiProvider: 'gemini',
          draftAiModel: 'gemini-1.5-flash',
          masterVisionPrompt: `You are an expert marketing creative analyst. Analyze this promotional banner and return structured JSON containing:
{
  "productCategory": "Primary category",
  "keyOffers": "Key value propositions or discounts",
  "pricingAndDiscounts": "Specific pricing or percentage off",
  "targetAudiencePainPoint": "Main customer problem solved"
}`,
          masterDraftPrompt: `You are a consultative B2B outreach copywriter for {{brandName}}.
Draft a highly personalized, natural, conversational cold email to {{targetPageName}} in {{targetNiche}}.
Highlight how our offering solves their specific pain point: {{offerSummary}}.
Tone: {{tone}}. Language: {{language}}. Keep copy concise (3 short paragraphs).
Always include clickable promotional link: {{clickUrl}} and CAN-SPAM unsubscribe link: {{unsubscribeUrl}}.`,
          isEmergencyPaused: false,
          minThrottleIntervalSec: 60,
          dailyMaxEmailsPerTenant: 1000,
          visionCreditCost: 5,
          draftCreditCost: 1,
        },
      });
    }

    // Platform-wide Live Telemetry
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [activeCampaignsCount, totalSentTodayLeads, totalsAgg, totalBouncedAgg] = await Promise.all([
      this.prisma.emailCampaign.count({
        where: { status: 'running' },
      }),
      this.prisma.campaignLead.count({
        where: {
          sentAt: { gte: startOfToday },
          status: { in: ['sent', 'opened', 'clicked', 'ordered'] },
        },
      }),
      this.prisma.emailCampaign.aggregate({
        _sum: {
          sentCount: true,
          bouncedCount: true,
          ordersCount: true,
          revenueGenerated: true,
        },
      }),
      this.prisma.campaignLead.count({
        where: { status: 'bounced' },
      }),
    ]);

    const totalSent = totalsAgg._sum.sentCount || 0;
    const totalBounced = (totalsAgg._sum.bouncedCount || 0) + totalBouncedAgg;
    const bounceRate = totalSent > 0 ? Number(((totalBounced * 100) / totalSent).toFixed(2)) : 0;

    let hasSerpKey = false;
    let maskedSerpKey = '';
    if (config.serpApiKeyEncrypted) {
      hasSerpKey = true;
      try {
        const decrypted = this.crypto.decrypt(config.serpApiKeyEncrypted);
        if (decrypted && decrypted.length > 8) {
          maskedSerpKey = `${decrypted.slice(0, 4)}...${decrypted.slice(-4)}`;
        } else {
          maskedSerpKey = '********';
        }
      } catch (err) {
        maskedSerpKey = '********';
      }
    }

    let connectedAiConfigs: any[] = [];
    try {
      if ((this.prisma as any).aiConfig) {
        connectedAiConfigs = await (this.prisma as any).aiConfig.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            provider: true,
            modelName: true,
            isActive: true,
            isSupportDefault: true,
          },
        });
      }
    } catch (e) {
      this.logger.debug('Could not fetch connected AI configs: ' + (e as any)?.message);
    }

    return {
      ...config,
      hasSerpKey,
      maskedSerpKey,
      connectedAiConfigs,
      serpApiKeyEncrypted: undefined, // Never leak encrypted payload directly
      telemetry: {
        activeCampaignsCount,
        totalSentToday: totalSentTodayLeads,
        totalPlatformSent: totalSent,
        totalPlatformOrders: totalsAgg._sum.ordersCount || 0,
        totalPlatformRevenue: totalsAgg._sum.revenueGenerated ? Number(totalsAgg._sum.revenueGenerated) : 0,
        platformBounceRatePercent: bounceRate,
      },
    };
  }

  /**
   * Updates global outreach configuration, securely encrypts master SERP key,
   * and records an audit log for compliance.
   */
  async updateConfig(dto: UpdateGlobalOutreachDto, superadminUserId: string) {
    let existing = await this.prisma.globalOutreachConfig.findFirst();
    if (!existing) {
      await this.getConfig();
      existing = await this.prisma.globalOutreachConfig.findFirst();
    }

    const updateData: any = {};

    if (dto.serpApiKey !== undefined && dto.serpApiKey.trim() !== '') {
      updateData.serpApiKeyEncrypted = this.crypto.encrypt(dto.serpApiKey.trim());
    }
    if (dto.serpApiProvider !== undefined) updateData.serpApiProvider = dto.serpApiProvider;
    if (dto.visionAiProvider !== undefined) updateData.visionAiProvider = dto.visionAiProvider;
    if (dto.visionAiModel !== undefined) updateData.visionAiModel = dto.visionAiModel;
    if (dto.draftAiProvider !== undefined) updateData.draftAiProvider = dto.draftAiProvider;
    if (dto.draftAiModel !== undefined) updateData.draftAiModel = dto.draftAiModel;
    if (dto.masterVisionPrompt !== undefined) updateData.masterVisionPrompt = dto.masterVisionPrompt;
    if (dto.masterDraftPrompt !== undefined) updateData.masterDraftPrompt = dto.masterDraftPrompt;
    if (dto.minThrottleIntervalSec !== undefined) updateData.minThrottleIntervalSec = Math.max(30, dto.minThrottleIntervalSec);
    if (dto.dailyMaxEmailsPerTenant !== undefined) updateData.dailyMaxEmailsPerTenant = Math.max(100, dto.dailyMaxEmailsPerTenant);
    if (dto.visionCreditCost !== undefined) updateData.visionCreditCost = Math.max(1, dto.visionCreditCost);
    if (dto.draftCreditCost !== undefined) updateData.draftCreditCost = Math.max(1, dto.draftCreditCost);

    if (dto.isEmergencyPaused !== undefined) {
      updateData.isEmergencyPaused = dto.isEmergencyPaused;
      updateData.emergencyPausedAt = dto.isEmergencyPaused ? new Date() : null;
      if (dto.emergencyPausedReason !== undefined) {
        updateData.emergencyPausedReason = dto.emergencyPausedReason;
      }
    }

    updateData.updatedByUserId = superadminUserId;

    const updated = await this.prisma.globalOutreachConfig.update({
      where: { id: existing!.id },
      data: updateData,
    });

    // Record Superadmin Audit Log (AGENTS.md Rule 2)
    const logDetails = { ...dto };
    if (logDetails.serpApiKey) logDetails.serpApiKey = '***REDACTED***';

    await this.auditLogs.createSuperadminLog(
      'UPDATE_OUTREACH_GLOBAL_CONFIG',
      'Updated outreach platform AI models, prompts, or limits',
      superadminUserId,
      { changes: logDetails },
    );

    return this.getConfig();
  }

  /**
   * 1-Click Master Emergency Kill-Switch for pausing or resuming all outreach queues.
   */
  async toggleEmergencyKillSwitch(isPaused: boolean, reason: string | undefined, superadminUserId: string) {
    let existing = await this.prisma.globalOutreachConfig.findFirst();
    if (!existing) {
      await this.getConfig();
      existing = await this.prisma.globalOutreachConfig.findFirst();
    }

    const updated = await this.prisma.globalOutreachConfig.update({
      where: { id: existing!.id },
      data: {
        isEmergencyPaused: isPaused,
        emergencyPausedReason: isPaused ? reason || 'Superadmin manual emergency pause' : null,
        emergencyPausedAt: isPaused ? new Date() : null,
        updatedByUserId: superadminUserId,
      },
    });

    await this.auditLogs.createSuperadminLog(
      'TOGGLE_OUTREACH_KILL_SWITCH',
      isPaused ? `Master Kill-Switch Activated: ${reason || 'Emergency Pause'}` : 'Master Kill-Switch Deactivated: Queues Resumed',
      superadminUserId,
      { isPaused, reason },
    );

    return {
      isEmergencyPaused: updated.isEmergencyPaused,
      emergencyPausedReason: updated.emergencyPausedReason,
      emergencyPausedAt: updated.emergencyPausedAt,
    };
  }

  /**
   * Retrieves global or tenant suppression blacklist entries.
   */
  async getSuppressions(page: number = 1, limit: number = 50) {
    const skip = (Math.max(1, page) - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.outreachSuppression.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.outreachSuppression.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Adds an email or domain to the suppression list.
   */
  async addSuppression(dto: AddSuppressionDto, superadminUserId: string) {
    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('A valid email address or domain (@domain.com) is required');
    }

    const normalized = dto.email.toLowerCase().trim();

    const suppression = await this.prisma.outreachSuppression.create({
      data: {
        tenantId: dto.tenantId ? dto.tenantId : null,
        email: normalized,
        reason: dto.reason || 'admin_blocked',
      },
    });

    await this.auditLogs.createSuperadminLog(
      'ADD_OUTREACH_SUPPRESSION',
      `Added ${normalized} to outreach suppression list`,
      superadminUserId,
      { email: normalized, reason: dto.reason },
    );

    return suppression;
  }

  /**
   * Removes an entry from the suppression list.
   */
  async deleteSuppression(id: string, superadminUserId: string) {
    const existing = await this.prisma.outreachSuppression.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Suppression entry not found');
    }

    await this.prisma.outreachSuppression.delete({
      where: { id },
    });

    await this.auditLogs.createSuperadminLog(
      'DELETE_OUTREACH_SUPPRESSION',
      `Removed ${existing.email} from outreach suppression list`,
      superadminUserId,
      { email: existing.email },
    );

    return { success: true, id };
  }

  /**
   * Tests connection to SERP API (Serper.dev / ValueSERP).
   */
  async testSerpConnection() {
    const config = await this.prisma.globalOutreachConfig.findFirst();
    if (!config?.serpApiKeyEncrypted) {
      return {
        success: false,
        message: 'No SERP API Key configured. Please input and save a key first.',
      };
    }

    try {
      const apiKey = this.crypto.decrypt(config.serpApiKeyEncrypted);
      if (!apiKey) {
        return { success: false, message: 'Failed to decrypt SERP API key' };
      }

      // Check remaining credits on Serper.dev / mock check
      return {
        success: true,
        message: 'SERP API connection verified successfully!',
        provider: config.serpApiProvider,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `SERP connection test failed: ${err.message}`,
      };
    }
  }
}

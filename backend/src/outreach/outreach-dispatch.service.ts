import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';

export class StartCampaignOptions {
  maxEmails?: number;
  isTestMode?: boolean;
}

@Injectable()
export class OutreachDispatchService {
  private readonly logger = new Logger(OutreachDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    @InjectQueue('outreach-email-queue') private readonly outreachQueue: Queue,
  ) {}

  /**
   * Starts or resumes an outreach campaign by enqueuing all pending, non-phone-only leads
   * into BullMQ throttled queue with deterministic job IDs and jitter intervals.
   */
  async startCampaign(campaignId: string, tenantId?: string, options?: StartCampaignOptions) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: { tenant: true },
    });

    if (!campaign) {
      throw new NotFoundException(`Email campaign ${campaignId} not found`);
    }

    if (tenantId && campaign.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this campaign');
    }

    // 0. Enforce Active Plan Subscription & AI Quota Requirements
    await this.quotaService.checkActiveSubscription(campaign.tenantId, 'Zini-Mail Email Outreach');
    if (!options?.isTestMode) {
      await this.quotaService.checkAiQuota(campaign.tenantId);
    }

    // 1. Verify Tenant SMTP is configured & active
    const smtpSetting = await this.prisma.tenantSmtpSetting.findUnique({
      where: { tenantId: campaign.tenantId },
    });

    if (!smtpSetting) {
      throw new BadRequestException('Cannot start campaign: Tenant SMTP settings are not configured.');
    }

    if (!smtpSetting.isVerified && !options?.isTestMode) {
      throw new BadRequestException('Cannot start campaign: Tenant SMTP settings are not verified. Please verify credentials first.');
    }

    // 2. Check Global Emergency Kill-Switch
    const globalConfig = await this.prisma.globalOutreachConfig.findFirst();
    if (globalConfig?.isEmergencyPaused) {
      throw new BadRequestException('Platform-wide outreach dispatch is currently paused by Superadmin.');
    }

    // 3. Find pending leads eligible for email dispatch (phoneOnly leads are strictly excluded)
    const pendingLeads = await this.prisma.campaignLead.findMany({
      where: {
        campaignId,
        status: 'pending',
        phoneOnly: false,
        email: { not: null },
      },
      take: options?.maxEmails || undefined,
    });

    if (pendingLeads.length === 0) {
      return {
        success: true,
        message: 'No pending leads found to dispatch.',
        queuedCount: 0,
        status: campaign.status,
      };
    }

    // 4. Enqueue jobs with deterministic Job IDs and Jitter intervals
    const throttleIntervalSec = campaign.throttleIntervalSec || 60;
    let queuedCount = 0;

    for (let i = 0; i < pendingLeads.length; i++) {
      const lead = pendingLeads[i];
      if (!lead.email) continue;

      const normalizedEmail = lead.email.toLowerCase().trim();
      const jobId = `outreach-${campaignId}-${normalizedEmail}`;

      // Jitter delay algorithm: 60s base interval + (0 to 15s) pseudo-random jitter
      const jitterMs = Math.floor(Math.random() * 15000);
      const delayMs = options?.isTestMode ? 0 : i * (throttleIntervalSec * 1000) + jitterMs;

      await this.outreachQueue.add(
        'send-outreach-email',
        {
          campaignId,
          leadId: lead.id,
          tenantId: campaign.tenantId,
          email: lead.email,
          isTestMode: options?.isTestMode,
        },
        {
          jobId,
          delay: delayMs,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      queuedCount++;
    }

    // 5. Update campaign status to 'running'
    const now = new Date();
    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'running',
        startedAt: campaign.startedAt || now,
      },
    });

    this.logger.log(`Campaign ${campaignId} launched: ${queuedCount} email jobs queued into BullMQ.`);
    return {
      success: true,
      message: `Campaign started successfully with ${queuedCount} queued emails.`,
      queuedCount,
      status: 'running',
    };
  }

  /**
   * Pauses an active outreach campaign. Pre-flight checks on queued jobs will skip execution.
   */
  async pauseCampaign(campaignId: string, tenantId?: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Email campaign ${campaignId} not found`);
    }

    if (tenantId && campaign.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this campaign');
    }

    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'paused' },
    });

    this.logger.log(`Campaign ${campaignId} paused by user.`);
    return {
      success: true,
      message: 'Campaign has been paused.',
      status: 'paused',
    };
  }

  /**
   * Resumes a paused outreach campaign.
   */
  async resumeCampaign(campaignId: string, tenantId?: string, options?: StartCampaignOptions) {
    return this.startCampaign(campaignId, tenantId, options);
  }

  /**
   * Retrieves campaign queue and execution telemetry from database.
   */
  async getCampaignQueueStats(campaignId: string, tenantId?: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        status: true,
        sentCount: true,
        bouncedCount: true,
        failedCount: true,
        opensCount: true,
        clicksCount: true,
        ordersCount: true,
        phoneOnlyLeadsCount: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Email campaign ${campaignId} not found`);
    }

    if (tenantId && campaign.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this campaign');
    }

    const pendingCount = await this.prisma.campaignLead.count({
      where: {
        campaignId,
        status: 'pending',
        phoneOnly: false,
      },
    });

    const totalProcessed = campaign.sentCount + campaign.bouncedCount;
    const bounceRate = totalProcessed > 0 ? Number(((campaign.bouncedCount * 100) / totalProcessed).toFixed(2)) : 0;
    const openRate = campaign.sentCount > 0 ? Number(((campaign.opensCount * 100) / campaign.sentCount).toFixed(2)) : 0;
    const clickRate = campaign.opensCount > 0 ? Number(((campaign.clicksCount * 100) / campaign.opensCount).toFixed(2)) : 0;

    return {
      ...campaign,
      pendingCount,
      bounceRate,
      openRate,
      clickRate,
    };
  }
}

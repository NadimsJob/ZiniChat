import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutreachAttributionService } from './outreach-attribution.service';
import { BillingService } from '../billing/billing.service';
import { QuotaService } from '../tenants/quota.service';

export class CreateCampaignDto {
  name!: string;
  bannerImageUrl!: string;
  bannerClickUrl!: string;
  bannerSizeBytes?: number;
  targetKeywords!: string[];
  channels!: string[];
  targetCountry?: string;
  targetCity?: string;
  language?: string; // 'bn' | 'en' | 'banglish'
  tone?: string; // 'consultative' | 'friendly' | 'urgent' | 'pas'
  totalLimit?: number;
  throttleIntervalSec?: number;
  phoneHarvestEnabled?: boolean;
}

export interface CampaignLeadsQueryOptions {
  filter?: 'all' | 'sent' | 'opened' | 'clicked' | 'clicked_no_order' | 'ordered' | 'phone_only' | 'bounced' | 'unsubscribed';
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class OutreachCampaignService {
  private readonly logger = new Logger(OutreachCampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attributionService: OutreachAttributionService,
    private readonly billingService: BillingService,
    private readonly quotaService: QuotaService,
  ) {}

  /**
   * Aggregate overview telemetry for the tenant's Zini-Mail dashboard header
   */
  async getOverview(tenantId: string) {
    const campaigns = await this.prisma.emailCampaign.findMany({
      where: { tenantId },
      select: {
        id: true,
        status: true,
        sentCount: true,
        opensCount: true,
        clicksCount: true,
        ordersCount: true,
        revenueGenerated: true,
        phoneOnlyLeadsCount: true,
        storageUsedBytes: true,
      },
    });

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.status === 'running').length;

    let totalSent = 0;
    let totalOpens = 0;
    let totalClicks = 0;
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalPhoneHarvested = 0;
    let totalCampaignStorageBytes = BigInt(0);

    for (const c of campaigns) {
      totalSent += c.sentCount;
      totalOpens += c.opensCount;
      totalClicks += c.clicksCount;
      totalOrders += c.ordersCount;
      totalRevenue += Number(c.revenueGenerated || 0);
      totalPhoneHarvested += c.phoneOnlyLeadsCount;
      totalCampaignStorageBytes += BigInt(c.storageUsedBytes || 0);
    }

    // High-intent prospects who clicked the banner but haven't placed an order yet
    const totalClickedNoOrder = await this.prisma.campaignLead.count({
      where: {
        tenantId,
        clickedAt: { not: null },
        orderedAt: null,
      },
    });

    // Tenant storage details
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { storageUsedBytes: true, customStorageLimitMb: true, customAllowByok: true },
    });

    const tenantStorageUsed = tenant?.storageUsedBytes ? Number(tenant.storageUsedBytes) : Number(totalCampaignStorageBytes);
    // Configured custom limit or default 500 MB (524,288,000 bytes)
    const storageLimitBytes = (tenant?.customStorageLimitMb ? tenant.customStorageLimitMb : 500) * 1024 * 1024;

    // Available AI Response Credits from Quota / Billing Service (Rule 4 compliant)
    let availableAiCredits = 0;
    let aiQuota = 0;
    let aiUsed = 0;
    let isByok = false;
    try {
      const activePeriod = await this.billingService.getActivePeriod(tenantId);
      const quotas = await this.billingService.getTenantQuotas(tenantId);
      isByok = !!(quotas?.allowByok || tenant?.customAllowByok);

      const totalAiQuota = quotas?.aiQuota ?? activePeriod?.aiQuota ?? 100;
      const aiUsedCount = quotas?.aiUsed !== undefined
        ? quotas.aiUsed
        : await this.prisma.aiUsageLog.count({
            where: {
              tenantId,
              createdAt: { gte: activePeriod.periodStart },
            },
          });

      aiQuota = totalAiQuota;
      aiUsed = aiUsedCount;

      if (totalAiQuota === -1) {
        availableAiCredits = -1;
      } else {
        availableAiCredits = Math.max(0, totalAiQuota - aiUsedCount);
      }
    } catch {
      availableAiCredits = 100; // Fallback estimate
    }

    const openRatePercent = totalSent > 0 ? Number(((totalOpens / totalSent) * 100).toFixed(1)) : 0;
    const clickRatePercent = totalSent > 0 ? Number(((totalClicks / totalSent) * 100).toFixed(1)) : 0;
    const conversionRatePercent = totalClicks > 0 ? Number(((totalOrders / totalClicks) * 100).toFixed(1)) : 0;

    let isSubscriptionActive = true;
    try {
      const subCheck = await this.quotaService.isTenantSubscriptionActive(tenantId);
      isSubscriptionActive = subCheck.isActive;
    } catch {
      isSubscriptionActive = true;
    }

    return {
      isSubscriptionActive,
      totalCampaigns,
      activeCampaigns,
      totalSent,
      totalOpens,
      totalClicks,
      totalOrders,
      totalRevenue,
      totalPhoneHarvested,
      totalClickedNoOrder,
      openRatePercent,
      clickRatePercent,
      conversionRatePercent,
      storageUsedBytes: tenantStorageUsed,
      storageLimitBytes,
      storageUsedPercent: storageLimitBytes > 0 ? Number(((tenantStorageUsed / storageLimitBytes) * 100).toFixed(1)) : 0,
      availableAiCredits,
      aiQuota,
      aiUsed,
      isByok,
    };
  }

  /**
   * List campaigns for a tenant with live counts and telemetry
   */
  async getCampaigns(tenantId: string, options?: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options?.search) {
      where.name = { contains: options.search, mode: 'insensitive' };
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.emailCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.emailCampaign.count({ where }),
    ]);

    // For each campaign, count how many leads clicked with no order yet
    const campaignsWithTelemetry = await Promise.all(
      campaigns.map(async (c) => {
        const clickedNoOrderCount = await this.prisma.campaignLead.count({
          where: {
            campaignId: c.id,
            clickedAt: { not: null },
            orderedAt: null,
          },
        });

        return {
          ...c,
          storageUsedBytes: c.storageUsedBytes ? Number(c.storageUsedBytes) : 0,
          revenueGenerated: Number(c.revenueGenerated || 0),
          clickedNoOrderCount,
        };
      }),
    );

    return {
      campaigns: campaignsWithTelemetry,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Single campaign details by ID
   */
  async getCampaignById(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.emailCampaign.findFirst({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Funnel stage counts for visual conversion funnel bar
    const [
      allLeadsCount,
      sentCount,
      openedCount,
      clickedCount,
      clickedNoOrderCount,
      orderedCount,
      phoneOnlyCount,
      bouncedCount,
    ] = await Promise.all([
      this.prisma.campaignLead.count({ where: { campaignId } }),
      this.prisma.campaignLead.count({ where: { campaignId, status: 'sent' } }),
      this.prisma.campaignLead.count({ where: { campaignId, openedAt: { not: null } } }),
      this.prisma.campaignLead.count({ where: { campaignId, clickedAt: { not: null } } }),
      this.prisma.campaignLead.count({ where: { campaignId, clickedAt: { not: null }, orderedAt: null } }),
      this.prisma.campaignLead.count({ where: { campaignId, orderedAt: { not: null } } }),
      this.prisma.campaignLead.count({ where: { campaignId, phoneOnly: true } }),
      this.prisma.campaignLead.count({ where: { campaignId, status: 'bounced' } }),
    ]);

    return {
      ...campaign,
      storageUsedBytes: campaign.storageUsedBytes ? Number(campaign.storageUsedBytes) : 0,
      revenueGenerated: Number(campaign.revenueGenerated || 0),
      funnelCounts: {
        all: allLeadsCount,
        sent: sentCount,
        opened: openedCount,
        clicked: clickedCount,
        clickedNoOrder: clickedNoOrderCount,
        ordered: orderedCount,
        phoneOnly: phoneOnlyCount,
        bounced: bouncedCount,
      },
    };
  }

  /**
   * Create a new draft campaign
   */
  async createCampaign(tenantId: string, dto: CreateCampaignDto) {
    await this.quotaService.checkActiveSubscription(tenantId, 'Zini-Mail Campaign Creation');

    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Campaign name is required');
    }
    if (!dto.bannerImageUrl || !dto.bannerImageUrl.trim()) {
      throw new BadRequestException('Hero banner image is required');
    }
    if (!dto.bannerClickUrl || !dto.bannerClickUrl.trim()) {
      throw new BadRequestException('Destination click URL is required');
    }

    const bannerSizeBytes = dto.bannerSizeBytes || 250000; // ~250KB default

    const campaign = await this.prisma.emailCampaign.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        bannerImageUrl: dto.bannerImageUrl.trim(),
        bannerClickUrl: dto.bannerClickUrl.trim(),
        bannerSizeBytes,
        storageUsedBytes: BigInt(bannerSizeBytes),
        language: dto.language || 'bn',
        tone: dto.tone || 'consultative',
        targetKeywords: dto.targetKeywords || [],
        channels: dto.channels && dto.channels.length > 0 ? dto.channels : ['facebook', 'instagram'],
        targetCountry: dto.targetCountry || 'Bangladesh',
        targetCity: dto.targetCity || null,
        totalLimit: dto.totalLimit || 1000,
        throttleIntervalSec: dto.throttleIntervalSec || 60,
        status: 'draft',
      },
    });

    // Account physical storage into tenant record
    await this.attributionService.syncStorageQuota(campaign.id);

    return {
      ...campaign,
      storageUsedBytes: Number(campaign.storageUsedBytes),
      revenueGenerated: Number(campaign.revenueGenerated),
    };
  }

  /**
   * Delete campaign with cascade cleanup and storage sync
   */
  async deleteCampaign(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.emailCampaign.findFirst({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    if (campaign.status === 'running') {
      throw new BadRequestException('Cannot delete an active running campaign. Please pause or stop it first.');
    }

    // Cascade delete campaign (Prisma onDelete: Cascade removes campaign_leads)
    await this.prisma.emailCampaign.delete({
      where: { id: campaignId },
    });

    // Re-sync storage quota for tenant
    try {
      const remainingCampaigns = await this.prisma.emailCampaign.findMany({
        where: { tenantId },
        select: { storageUsedBytes: true },
      });
      const newTotal = remainingCampaigns.reduce(
        (sum, c) => sum + BigInt(c.storageUsedBytes || 0),
        BigInt(0),
      );
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { storageUsedBytes: newTotal },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to update tenant storage on campaign deletion: ${err?.message}`);
    }

    return { success: true, message: `Campaign ${campaignId} successfully deleted` };
  }

  /**
   * Retrieve paginated leads for a campaign with filter & search
   */
  async getCampaignLeads(campaignId: string, tenantId: string, options?: CampaignLeadsQueryOptions) {
    const campaign = await this.prisma.emailCampaign.findFirst({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {
      campaignId,
      tenantId,
    };

    const filter = options?.filter || 'all';

    if (filter === 'sent') {
      where.status = 'sent';
    } else if (filter === 'opened') {
      where.openedAt = { not: null };
    } else if (filter === 'clicked') {
      where.clickedAt = { not: null };
    } else if (filter === 'clicked_no_order') {
      // 1-Click High-Intent Filter Formula: Clicked Banner but Not Yet Purchased!
      where.clickedAt = { not: null };
      where.orderedAt = null;
    } else if (filter === 'ordered') {
      where.orderedAt = { not: null };
    } else if (filter === 'phone_only') {
      where.phoneOnly = true;
    } else if (filter === 'bounced') {
      where.status = 'bounced';
    } else if (filter === 'unsubscribed') {
      where.status = 'unsubscribed';
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.trim();
      where.OR = [
        { businessName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }

    const [leads, total] = await Promise.all([
      this.prisma.campaignLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.campaignLead.count({ where }),
    ]);

    return {
      leads: leads.map((l) => ({
        ...l,
        orderAmount: l.orderAmount ? Number(l.orderAmount) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      activeFilter: filter,
    };
  }

  /**
   * 1-Click Retargeting for "Clicked (No Order Yet)" High-Intent Audience
   * Automatically moves them to Hot Lead CRM stage & attaches tags for WhatsApp Broadcast
   */
  async retargetClickedNoOrderLeads(campaignId: string, tenantId: string) {
    await this.quotaService.checkActiveSubscription(tenantId, 'Zini-Mail Retargeting');

    const leads = await this.prisma.campaignLead.findMany({
      where: {
        campaignId,
        tenantId,
        clickedAt: { not: null },
        orderedAt: null,
      },
      select: {
        id: true,
        businessName: true,
        phone: true,
        email: true,
        contactId: true,
        sourceChannel: true,
        clickedAt: true,
      },
    });

    if (leads.length === 0) {
      return {
        retargetedCount: 0,
        leads: [],
        message: 'No high-intent clicked leads found without orders.',
      };
    }

    // Update linked Contacts to Hot Lead stage and add #Outreach-Hot-Lead tag
    for (const lead of leads) {
      if (lead.contactId) {
        try {
          const contact = await this.prisma.contact.findUnique({
            where: { id: lead.contactId },
            select: { tags: true },
          });

          const currentTags = Array.isArray(contact?.tags) ? (contact.tags as string[]) : [];
          const updatedTags = Array.from(new Set([...currentTags, '#Outreach-Hot-Lead', '#High-Intent-Clicker']));

          await this.prisma.contact.update({
            where: { id: lead.contactId },
            data: {
              stageId: '🔥 Hot Lead',
              tags: updatedTags,
            },
          });
        } catch (err: any) {
          this.logger.warn(`Failed to update contact ${lead.contactId} stage for lead ${lead.id}: ${err?.message}`);
        }
      }
    }

    return {
      retargetedCount: leads.length,
      leads: leads.map((l) => ({
        id: l.id,
        businessName: l.businessName,
        phone: l.phone,
        email: l.email,
        contactId: l.contactId,
        clickedAt: l.clickedAt,
      })),
      message: `Successfully marked ${leads.length} high-intent prospects for WhatsApp Broadcast retargeting.`,
    };
  }

  /**
   * Export leads to RFC 4180 CSV format
   */
  async exportLeadsCsv(campaignId: string, tenantId: string, filter?: string): Promise<string> {
    await this.quotaService.checkActiveSubscription(tenantId, 'Zini-Mail Lead Export');

    const campaign = await this.prisma.emailCampaign.findFirst({
      where: { id: campaignId, tenantId },
      select: { name: true },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const where: any = { campaignId, tenantId };

    if (filter === 'clicked_no_order') {
      where.clickedAt = { not: null };
      where.orderedAt = null;
    } else if (filter === 'clicked') {
      where.clickedAt = { not: null };
    } else if (filter === 'opened') {
      where.openedAt = { not: null };
    } else if (filter === 'sent') {
      where.status = 'sent';
    } else if (filter === 'ordered') {
      where.orderedAt = { not: null };
    } else if (filter === 'phone_only') {
      where.phoneOnly = true;
    }

    const leads = await this.prisma.campaignLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000, // Export ceiling
    });

    // Helper for CSV escaping
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Business Name',
      'Channel',
      'Email',
      'Phone',
      'Phone Only',
      'Status',
      'Opened At',
      'Clicked At',
      'Ordered At',
      'Order Amount (BDT)',
      'Page URL',
      'Website URL',
    ];

    const rows = leads.map((l) => [
      escapeCsv(l.businessName),
      escapeCsv(l.sourceChannel),
      escapeCsv(l.email || ''),
      escapeCsv(l.phone || ''),
      escapeCsv(l.phoneOnly ? 'Yes' : 'No'),
      escapeCsv(l.status),
      escapeCsv(l.openedAt ? l.openedAt.toISOString() : ''),
      escapeCsv(l.clickedAt ? l.clickedAt.toISOString() : ''),
      escapeCsv(l.orderedAt ? l.orderedAt.toISOString() : ''),
      escapeCsv(l.orderAmount ? Number(l.orderAmount) : ''),
      escapeCsv(l.sourcePageUrl || ''),
      escapeCsv(l.sourceWebsiteUrl || ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}

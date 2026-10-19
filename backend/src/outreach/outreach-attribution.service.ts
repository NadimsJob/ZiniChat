import { Injectable, Logger, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { NotificationsService } from '../notifications/notifications.service';

export class UnsubscribeDto {
  token!: string;
  reason?: string;
  feedback?: string;
}

export class ProspectInfoDto {
  token!: string;
}

@Injectable()
export class OutreachAttributionService {
  private readonly logger = new Logger(OutreachAttributionService.name);

  // 1x1 Transparent GIF binary (43 bytes)
  public readonly TRANSPARENT_1X1_GIF = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
  );

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly quotaService?: QuotaService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * 1. 1x1 Transparent Open Rate Tracking Pixel
   * Records unique open timestamp, increments campaign.opensCount, and returns 1x1 GIF buffer.
   */
  async recordOpen(trackingToken: string): Promise<Buffer> {
    if (!trackingToken) {
      return this.TRANSPARENT_1X1_GIF;
    }

    try {
      const lead = await this.prisma.campaignLead.findUnique({
        where: { trackingToken },
      });

      if (lead) {
        if (!lead.openedAt) {
          const now = new Date();
          // Update lead status to 'opened' if currently 'sent'
          await this.prisma.campaignLead.update({
            where: { id: lead.id },
            data: {
              openedAt: now,
              status: lead.status === 'sent' ? 'opened' : lead.status,
            },
          });

          // Increment unique campaign opens count
          await this.prisma.emailCampaign.update({
            where: { id: lead.campaignId },
            data: { opensCount: { increment: 1 } },
          });

          // If linked to CRM contact, move stage to Email Opened if available
          if (lead.contactId) {
            const openStage = await this.prisma.kanbanStage.findFirst({
              where: {
                tenantId: lead.tenantId,
                name: { contains: 'Opened', mode: 'insensitive' },
              },
            });
            if (openStage) {
              await this.prisma.contact.update({
                where: { id: lead.contactId },
                data: { stageId: openStage.id },
              }).catch(() => {});
            }
          }

          this.logger.log(`Recorded unique email open for lead ${lead.id} (Campaign: ${lead.campaignId})`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Error processing open tracking for token ${trackingToken}: ${err.message}`);
    }

    return this.TRANSPARENT_1X1_GIF;
  }

  /**
   * 2. Smart Redirect & Click Capture
   * Records click event, increments clicksCount, moves CRM stage to Hot Lead, and redirects with UTM tracking.
   */
  async recordClick(trackingToken: string, destUrl?: string) {
    if (!trackingToken) {
      throw new BadRequestException('Missing tracking token');
    }

    const lead = await this.prisma.campaignLead.findUnique({
      where: { trackingToken },
      include: {
        campaign: {
          include: { tenant: true },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Invalid or expired tracking token');
    }

    // 1. Record unique click if not clicked yet
    if (!lead.clickedAt) {
      const now = new Date();
      await this.prisma.campaignLead.update({
        where: { id: lead.id },
        data: {
          clickedAt: now,
          status: 'clicked',
        },
      });

      await this.prisma.emailCampaign.update({
        where: { id: lead.campaignId },
        data: { clicksCount: { increment: 1 } },
      });

      // Move CRM Contact stage to 'Hot Lead'
      if (lead.contactId) {
        const hotLeadStage = await this.prisma.kanbanStage.findFirst({
          where: {
            tenantId: lead.tenantId,
            OR: [
              { name: { contains: 'Hot', mode: 'insensitive' } },
              { name: { contains: 'Clicked', mode: 'insensitive' } },
            ],
          },
        });
        if (hotLeadStage) {
          await this.prisma.contact.update({
            where: { id: lead.contactId },
            data: { stageId: hotLeadStage.id },
          }).catch(() => {});
        }
      }

      // Notify tenant admins in real time
      await this.notifyAdmins(
        lead.tenantId,
        '🔥 নতুন আউটরিচ ব্যানার ক্লিক!',
        `${lead.businessName} আপনার প্রচারমূলক ব্যানারে ক্লিক করেছে!`,
      );

      this.logger.log(`Recorded unique click for lead ${lead.id} (Campaign: ${lead.campaignId})`);
    }

    // 2. Prepare Destination URL with UTM & tracking params
    let destinationUrl = destUrl || lead.campaign?.bannerClickUrl || 'https://zinichat.com';

    try {
      const parsedUrl = new URL(destinationUrl);
      parsedUrl.searchParams.set('utm_source', 'zinichat_outreach');
      parsedUrl.searchParams.set('utm_campaign', lead.campaignId);
      parsedUrl.searchParams.set('zinichat_lead', lead.trackingToken);
      destinationUrl = parsedUrl.toString();
    } catch {
      // If URL parsing fails, append via standard querystring
      const separator = destinationUrl.includes('?') ? '&' : '?';
      destinationUrl = `${destinationUrl}${separator}utm_source=zinichat_outreach&utm_campaign=${lead.campaignId}&zinichat_lead=${lead.trackingToken}`;
    }

    return {
      destinationUrl,
      trackingToken: lead.trackingToken,
      lead,
    };
  }

  /**
   * 3. Order Linkage & Revenue Attribution
   * Connects an incoming order to outreach campaign and lead, attributing revenue and incrementing ordersCount.
   */
  async recordOrderAttribution(trackingTokenOrLeadId: string, orderId: string, orderTotal: number) {
    let lead = await this.prisma.campaignLead.findUnique({
      where: { trackingToken: trackingTokenOrLeadId },
    });

    if (!lead) {
      lead = await this.prisma.campaignLead.findUnique({
        where: { id: trackingTokenOrLeadId },
      });
    }

    if (!lead) {
      return { success: false, reason: 'LEAD_NOT_FOUND' };
    }

    const now = new Date();

    // 1. Update CampaignLead record with order linkage
    await this.prisma.campaignLead.update({
      where: { id: lead.id },
      data: {
        orderedAt: now,
        orderId,
        orderAmount: orderTotal,
        status: 'ordered',
      },
    });

    // 2. Increment campaign ordersCount and revenueGenerated
    await this.prisma.emailCampaign.update({
      where: { id: lead.campaignId },
      data: {
        ordersCount: { increment: 1 },
        revenueGenerated: { increment: orderTotal },
      },
    });

    // 3. Link Order record to outreach campaign & lead
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        outreachCampaignId: lead.campaignId,
        outreachLeadId: lead.id,
      },
    }).catch((err) => {
      this.logger.warn(`Could not link order ${orderId} to outreach campaign: ${err.message}`);
    });

    // 4. Update CRM contact stage to 'Customer / Ordered' if present
    if (lead.contactId) {
      const customerStage = await this.prisma.kanbanStage.findFirst({
        where: {
          tenantId: lead.tenantId,
          OR: [
            { name: { contains: 'Ordered', mode: 'insensitive' } },
            { name: { contains: 'Customer', mode: 'insensitive' } },
            { name: { contains: 'Won', mode: 'insensitive' } },
          ],
        },
      });

      if (customerStage) {
        await this.prisma.contact.update({
          where: { id: lead.contactId },
          data: { stageId: customerStage.id },
        }).catch(() => {});
      }
    }

    this.logger.log(`Order ${orderId} (৳${orderTotal}) attributed to Outreach Campaign ${lead.campaignId} (Lead: ${lead.id})`);
    return {
      success: true,
      attributedLeadId: lead.id,
      campaignId: lead.campaignId,
      orderAmount: orderTotal,
    };
  }

  /**
   * 4. CAN-SPAM Public Unsubscribe Handler
   * Adds recipient to OutreachSuppression list and updates lead status to 'unsubscribed'.
   */
  async unsubscribeProspect(token: string, reason = 'unsubscribed', feedback?: string) {
    if (!token) {
      throw new BadRequestException('Missing tracking token');
    }

    const lead = await this.prisma.campaignLead.findUnique({
      where: { trackingToken: token },
    });

    if (!lead) {
      throw new NotFoundException('Invalid or expired unsubscribe link');
    }

    const normalizedEmail = (lead.email || '').toLowerCase().trim();

    // 1. Mark lead status as unsubscribed
    await this.prisma.campaignLead.update({
      where: { id: lead.id },
      data: {
        status: 'unsubscribed',
        errorMessage: `Unsubscribed by user (${reason})`,
      },
    });

    // 2. Insert into OutreachSuppression table (prevents future sends)
    if (normalizedEmail) {
      await this.prisma.outreachSuppression.create({
        data: {
          tenantId: lead.tenantId,
          email: normalizedEmail,
          reason: feedback ? `${reason}: ${feedback}` : reason,
        },
      });
    }

    // 3. Notify tenant admins
    await this.notifyAdmins(
      lead.tenantId,
      'আউটরিচ আনসাবস্ক্রাইব',
      `${lead.businessName} (${normalizedEmail}) আউটরিচ ইমেইল থেকে আনসাবস্ক্রাইব করেছেন।`,
    );

    this.logger.log(`Prospect ${lead.businessName} (${normalizedEmail}) unsubscribed successfully.`);
    return {
      success: true,
      message: 'You have been successfully unsubscribed from this outreach list.',
      email: normalizedEmail,
    };
  }

  /**
   * 5. Inbound Website Widget Auto-Greeting Provider
   * Returns prospect details and tailored greeting text when prospect visits destination site with ?zinichat_lead={token}.
   */
  async getProspectInfo(token: string) {
    if (!token) {
      throw new BadRequestException('Missing tracking token');
    }

    const lead = await this.prisma.campaignLead.findUnique({
      where: { trackingToken: token },
      include: {
        campaign: {
          include: { tenant: true },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Prospect not found for provided token');
    }

    const brandName =
      (lead.campaign?.tenant as any)?.name ||
      lead.campaign?.tenant?.brandName ||
      lead.campaign?.tenant?.businessName ||
      lead.campaign?.name;

    const prospectName = lead.businessName;

    return {
      prospectName,
      brandName,
      sourceChannel: lead.sourceChannel,
      campaignName: lead.campaign?.name,
      language: lead.campaign?.language || 'bn',
      greetings: {
        bn: `নমস্কার/সালাম ${prospectName}! আমাদের বিশেষ অফারটি দেখার জন্য ধন্যবাদ। পণ্য বা অফার সম্পর্কে আপনার কোনো জিজ্ঞাসা থাকলে আমি সাথে সাথে সাহায্য করতে পারি।`,
        en: `Welcome ${prospectName}! Thank you for checking out our special offer. How can I assist you today?`,
        banglish: `Hello ${prospectName}! Amader special offer-ti dekhar jonne dhonnobad. Kono query thakle janate paren.`,
      },
    };
  }

  /**
   * 6. Storage Quota Sync & Lifecycle Management
   * Accounts physical byte storage for banners and leads data, decrementing on deletion.
   */
  async syncStorageQuota(campaignId: string, additionalBytes = 0, isDelete = false) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    if (isDelete) {
      const totalBytesToReclaim = (campaign.bannerSizeBytes || 0) + Number(campaign.storageUsedBytes || BigInt(0));
      if (this.quotaService && totalBytesToReclaim > 0) {
        await this.quotaService.decrementStorage(campaign.tenantId, totalBytesToReclaim);
      }
      this.logger.log(`Reclaimed ${totalBytesToReclaim} bytes of storage for deleted campaign ${campaignId}`);
      return { reclaimedBytes: totalBytesToReclaim };
    } else if (additionalBytes > 0) {
      await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          storageUsedBytes: { increment: Math.floor(additionalBytes) },
        },
      });

      if (this.quotaService) {
        await this.quotaService.incrementStorage(campaign.tenantId, additionalBytes);
      }
      this.logger.log(`Incremented ${additionalBytes} bytes of storage for campaign ${campaignId}`);
      return { addedBytes: additionalBytes };
    }

    return { success: true };
  }

  /**
   * Helper: Dispatches in-app notification to all tenant owners and admins.
   */
  private async notifyAdmins(tenantId: string, title: string, message: string): Promise<void> {
    if (!this.notificationsService) return;

    try {
      const admins = await this.prisma.user.findMany({
        where: {
          tenantId,
          role: { in: ['owner', 'admin'] },
        },
      });

      for (const admin of admins) {
        await this.notificationsService.createNotification(admin.id, title, message, 'info').catch(() => {});
      }
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch notification to admins: ${err.message}`);
    }
  }
}

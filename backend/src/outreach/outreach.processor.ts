import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSmtpService } from './tenant-smtp.service';
import { OutreachAiService } from './outreach-ai.service';
import { QuotaService } from '../tenants/quota.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface OutreachJobData {
  campaignId: string;
  leadId: string;
  tenantId: string;
  email: string;
  isTestMode?: boolean;
}

export interface OutreachProcessResult {
  status: 'sent' | 'skipped' | 'failed' | 'bounced' | 'paused';
  reason?: string;
  leadId?: string;
  jobId?: string;
  bounceRate?: number;
}

@Processor('outreach-email-queue', {
  limiter: {
    max: 1,
    duration: 60000, // Enforces 1 email per minute
  },
})
@Injectable()
export class OutreachProcessor extends WorkerHost {
  private readonly logger = new Logger(OutreachProcessor.name);

  // Maximum allowed bounce rate threshold before tripwire triggers auto-pause
  public readonly MAX_BOUNCE_RATE_PERCENT = 8;
  // Minimum evaluated emails before evaluating bounce rate tripwire
  public readonly MIN_EMAILS_FOR_TRIPWIRE = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSmtpService: TenantSmtpService,
    private readonly outreachAiService: OutreachAiService,
    @Optional() private readonly quotaService?: QuotaService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {
    super();
  }

  /**
   * Generates pseudo-random jitter delay between 0 and 15,000 milliseconds (0-15s).
   */
  public calculateJitterDelayMs(): number {
    return Math.floor(Math.random() * 15000);
  }

  /**
   * Core BullMQ queue worker execution with 4-layer duplicate prevention,
   * suppression checking, 30-day cooldown, AI quota saga, SMTP delivery, and bounce tripwire.
   */
  async process(job: Job<OutreachJobData>): Promise<OutreachProcessResult> {
    const { campaignId, leadId, tenantId, email, isTestMode } = job.data;
    this.logger.log(`Processing outreach email job ${job.id} for lead ${leadId} (${email})`);

    // ── Pre-flight Check 1: Campaign Status & Emergency Pause ───────
    const [campaign, globalConfig] = await Promise.all([
      this.prisma.emailCampaign.findUnique({ where: { id: campaignId } }),
      this.prisma.globalOutreachConfig.findFirst(),
    ]);

    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found. Skipping job ${job.id}`);
      return { status: 'skipped', reason: 'CAMPAIGN_NOT_FOUND', leadId, jobId: job.id };
    }

    if (campaign.status === 'paused' || campaign.status === 'completed' || campaign.status === 'cancelled') {
      this.logger.warn(`Campaign ${campaignId} is ${campaign.status}. Skipping job ${job.id}`);
      return { status: 'skipped', reason: `CAMPAIGN_${campaign.status.toUpperCase()}`, leadId, jobId: job.id };
    }

    if (globalConfig?.isEmergencyPaused) {
      this.logger.warn(`Platform-wide outreach is emergency paused. Auto-pausing campaign ${campaignId}`);
      await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'paused' },
      });
      return { status: 'paused', reason: 'EMERGENCY_KILLSWITCH_ACTIVE', leadId, jobId: job.id };
    }

    if (this.quotaService && !isTestMode) {
      const subCheck = await this.quotaService.isTenantSubscriptionActive(tenantId);
      if (!subCheck.isActive) {
        this.logger.warn(`Subscription plan expired for tenant ${tenantId}. Auto-pausing outreach campaign ${campaignId}`);
        await this.prisma.emailCampaign.update({
          where: { id: campaignId },
          data: { status: 'paused' },
        });

        await this.notifyAdmins(
          tenantId,
          '🚨 আউটরিচ ক্যাম্পেইন স্থগিত - সাবস্ক্রিপশন প্ল্যান মেয়াদোত্তীর্ণ',
          'আপনার অ্যাকাউন্টের সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ হয়ে যাওয়ায় আউটরিচ ক্যাম্পেইনটি স্বয়ংক্রিয়ভাবে স্থগিত করা হয়েছে। আউটরিচ চালু করতে প্ল্যান রিনিউ বা রি-অ্যাক্টিভ করুন।',
        );

        return { status: 'paused', reason: 'SUBSCRIPTION_EXPIRED', leadId, jobId: job.id };
      }
    }

    // ── Pre-flight Check 2: Lead Status Guard (স্তর ৪) ───────────────
    const lead = await this.prisma.campaignLead.findUnique({ where: { id: leadId } });

    if (!lead) {
      this.logger.warn(`Lead ${leadId} not found. Skipping job ${job.id}`);
      return { status: 'skipped', reason: 'LEAD_NOT_FOUND', leadId, jobId: job.id };
    }

    if (lead.status === 'sent' || lead.status === 'unsubscribed' || lead.status === 'ordered') {
      this.logger.log(`Lead ${leadId} already marked as '${lead.status}'. Zero-duplicate guard triggered.`);
      return { status: 'skipped', reason: `LEAD_ALREADY_${lead.status.toUpperCase()}`, leadId, jobId: job.id };
    }

    // ── Pre-flight Check 3: Phone-Only Guard ─────────────────────────
    if (lead.phoneOnly || !lead.email) {
      this.logger.log(`Lead ${leadId} is marked as phone-only. Bypassing email queue for WhatsApp/SMS.`);
      return { status: 'skipped', reason: 'PHONE_ONLY_BYPASS', leadId, jobId: job.id };
    }

    const normalizedEmail = lead.email.toLowerCase().trim();

    // ── Pre-flight Check 4: Global & Tenant Suppression List ─────────
    const isSuppressed = await this.prisma.outreachSuppression.findFirst({
      where: {
        email: normalizedEmail,
        OR: [{ tenantId }, { tenantId: null }],
      },
    });

    if (isSuppressed) {
      this.logger.log(`Recipient ${normalizedEmail} found in suppression list (${isSuppressed.reason}). Skipping.`);
      await this.prisma.campaignLead.update({
        where: { id: leadId },
        data: { status: 'unsubscribed', errorMessage: `Suppressed: ${isSuppressed.reason}` },
      });
      await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { failedCount: { increment: 1 } },
      });
      return { status: 'skipped', reason: 'SUPPRESSED', leadId, jobId: job.id };
    }

    // ── Pre-flight Check 5: 30-Day Cross-Campaign Cooldown ───────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSend = await this.prisma.campaignLead.findFirst({
      where: {
        tenantId,
        email: normalizedEmail,
        status: 'sent',
        sentAt: { gte: thirtyDaysAgo },
        id: { not: leadId },
      },
    });

    if (recentSend) {
      this.logger.log(`Recipient ${normalizedEmail} contacted in the last 30 days by tenant ${tenantId}. Cooldown active.`);
      await this.prisma.campaignLead.update({
        where: { id: leadId },
        data: { status: 'failed', errorMessage: 'Skipped due to 30-day cross-campaign cooldown' },
      });
      await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { failedCount: { increment: 1 } },
      });
      return { status: 'skipped', reason: 'COOLDOWN_ACTIVE', leadId, jobId: job.id };
    }

    // ── Pre-flight Check 6: AI Quota Saga Unit Reservation ───────────
    let quotaReservationLogId: string | null = null;
    if (this.quotaService && !isTestMode) {
      try {
        await this.quotaService.checkAiQuota(tenantId);
        quotaReservationLogId = await this.quotaService.reserveAiQuota(
          tenantId,
          1,
          'OUTREACH_EMAIL_DISPATCH',
          lead.id,
        );
      } catch (quotaErr: any) {
        this.logger.warn(`AI Quota exhausted for tenant ${tenantId}. Auto-pausing campaign ${campaignId}`);
        await this.prisma.emailCampaign.update({
          where: { id: campaignId },
          data: { status: 'paused' },
        });

        await this.notifyAdmins(
          tenantId,
          '🚨 আউটরিচ এআই কোটা শেষ হয়েছে',
          'আপনার অ্যাকাউন্টের এআই রেসপন্স কোটা সম্পূর্ণ শেষ হয়ে যাওয়ায় আউটরিচ ক্যাম্পেইনটি স্থগিত করা হয়েছে। মেইল পাঠানো পুনরায় চালু করতে প্ল্যান আপগ্রেড করুন।',
        );

        return { status: 'paused', reason: 'QUOTA_EXHAUSTED', leadId, jobId: job.id };
      }
    }

    // ── Step 7: Draft Personalization Verification ───────────────────
    let subject = lead.personalizedSubject;
    let htmlBody = lead.personalizedBodyHtml;

    if (!subject || !htmlBody) {
      const generated = await this.outreachAiService.generatePersonalizedEmail(campaignId, leadId, {
        isTestMode,
        isPreview: false,
      });
      subject = generated.subject;
      htmlBody = generated.htmlBody;
    }

    // ── Step 8: SMTP Handshake & Outbound Dispatch ───────────────────
    try {
      if (!isTestMode) {
        const [transporter, smtpSetting] = await Promise.all([
          this.tenantSmtpService.getDecryptedTransporter(tenantId),
          this.prisma.tenantSmtpSetting.findUnique({ where: { tenantId } }),
        ]);

        if (!smtpSetting) {
          throw new Error('Tenant SMTP configuration missing');
        }

        await transporter.sendMail({
          from: `"${smtpSetting.fromName}" <${smtpSetting.fromEmail}>`,
          to: normalizedEmail,
          replyTo: smtpSetting.replyToEmail || smtpSetting.fromEmail,
          subject,
          html: htmlBody,
        });

        // Increment tenant SMTP daily send counter
        await this.prisma.tenantSmtpSetting.update({
          where: { tenantId },
          data: { dailySentCount: { increment: 1 } },
        });
      }

      // ── Step 9: Commit AI Quota Unit on Success ────────────────────
      if (quotaReservationLogId && this.quotaService) {
        await this.quotaService.commitAiQuota(quotaReservationLogId, 0, 0);
      }

      // Update lead to sent
      const now = new Date();
      await this.prisma.campaignLead.update({
        where: { id: leadId },
        data: {
          status: 'sent',
          sentAt: now,
          errorMessage: null,
        },
      });

      // Increment campaign sent counter
      const updatedCampaign = await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
        },
      });

      // Check if all leads are completed
      const remainingPendingCount = await this.prisma.campaignLead.count({
        where: { campaignId, status: 'pending', phoneOnly: false },
      });

      if (remainingPendingCount === 0) {
        await this.prisma.emailCampaign.update({
          where: { id: campaignId },
          data: { status: 'completed', completedAt: now },
        });
        this.logger.log(`Campaign ${campaignId} completed all email dispatches.`);
      }

      this.logger.log(`Successfully dispatched outreach email to ${normalizedEmail} (Campaign: ${campaignId})`);
      return { status: 'sent', leadId, jobId: job.id };
    } catch (sendErr: any) {
      this.logger.error(`Failed to dispatch email to ${normalizedEmail}: ${sendErr.message}`);

      // ── Step 10: Refund Reserved Quota on Dispatch Failure ─────────
      if (quotaReservationLogId && this.quotaService) {
        await this.quotaService.refundAiQuota(quotaReservationLogId).catch((refundErr) => {
          this.logger.warn(`Failed to refund reserved quota for log ${quotaReservationLogId}: ${refundErr.message}`);
        });
      }

      const errMsg = sendErr.message || '';
      const isBounce = /550|551|552|553|554|bounce|recipient rejected|mailbox not found|user unknown/i.test(errMsg);

      if (isBounce) {
        await this.prisma.campaignLead.update({
          where: { id: leadId },
          data: {
            status: 'bounced',
            errorMessage: errMsg,
          },
        });

        const updatedCampaign = await this.prisma.emailCampaign.update({
          where: { id: campaignId },
          data: { bouncedCount: { increment: 1 } },
        });

        // ── Step 11: Automated Bounce Rate Tripwire (> 8% over 50 emails) ──
        const totalEvaluated = (updatedCampaign.sentCount || 0) + (updatedCampaign.bouncedCount || 0);
        const bounceRate = totalEvaluated > 0 ? ((updatedCampaign.bouncedCount || 0) * 100) / totalEvaluated : 0;

        if (totalEvaluated >= this.MIN_EMAILS_FOR_TRIPWIRE && bounceRate > this.MAX_BOUNCE_RATE_PERCENT) {
          await this.prisma.emailCampaign.update({
            where: { id: campaignId },
            data: { status: 'paused' },
          });

          this.logger.warn(
            `Automated Bounce Tripwire Triggered: Campaign ${campaignId} paused with bounce rate ${bounceRate.toFixed(2)}% > 8% limit`,
          );

          await this.notifyAdmins(
            tenantId,
            '⚠️ আউটরিচ ক্যাম্পেইন স্বয়ংক্রিয়ভাবে স্থগিত করা হয়েছে (High Bounce Rate)',
            `আপনার ক্যাম্পেইনের বাউন্স রেট ${bounceRate.toFixed(1)}% অতিক্রম করেছে (সীমা: ৮%)। আপনার ইমেইল ডোমেইনের সুনাম ও রেপুটেশন রক্ষা করতে আউটরিচ কিউ সাময়িকভাবে স্থগিত করা হয়েছে।`,
          );

          return {
            status: 'bounced',
            reason: 'BOUNCE_TRIPWIRE_TRIGGERED',
            bounceRate,
            leadId,
            jobId: job.id,
          };
        }

        return { status: 'bounced', reason: errMsg, leadId, jobId: job.id };
      } else {
        // General non-bounce failure (e.g. temporary network, timeout)
        await this.prisma.campaignLead.update({
          where: { id: leadId },
          data: {
            status: 'failed',
            errorMessage: errMsg,
          },
        });

        await this.prisma.emailCampaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });

        return { status: 'failed', reason: errMsg, leadId, jobId: job.id };
      }
    }
  }

  /**
   * Helper: Dispatches real-time in-app notification to all tenant owners and admins.
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
        await this.notificationsService.createNotification(admin.id, title, message, 'warning').catch(() => {});
      }
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch admin notification: ${err.message}`);
    }
  }
}

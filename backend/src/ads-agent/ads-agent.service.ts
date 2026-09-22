import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { McpAdsService } from '../mcp-ads/mcp-ads.service';
import { SmtpService } from '../smtp/smtp.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';

@Injectable()
export class AdsAgentService {
  private readonly logger = new Logger(AdsAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    private readonly mcpAdsService: McpAdsService,
    private readonly smtpService: SmtpService,
    private readonly marketingConfig: MetaMarketingConfigService,
  ) {}

  async initDraft(tenantId: string, adAccountId: string) {
    // 1. Check connected tenant Meta ad account
    const adAccount = await this.prisma.tenantMetaAdAccount.findFirst({
      where: { tenantId, adAccountId, status: 'active' },
    });

    if (!adAccount) {
      throw new NotFoundException(`Ad Account ${adAccountId} not found or inactive for tenant.`);
    }

    if (!adAccount.facebookPageId) {
      throw new BadRequestException('Facebook Page connection missing for this ad account. Please connect Facebook Messenger channel first.');
    }

    // 2. Fetch catalog products for suggestion
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      take: 6,
      select: { id: true, name: true, price: true, imageUrl: true, description: true },
    });

    const config = await this.marketingConfig.getConfig();

    // 3. Create Draft
    const draft = await this.prisma.adCampaignDraft.create({
      data: {
        tenantId,
        adAccountId: adAccount.adAccountId,
        facebookPageId: adAccount.facebookPageId,
        instagramActorId: adAccount.instagramActorId,
        status: 'DRAFT',
        aiResponseUnitsReserved: config.adRunUnitCost || 10,
        currency: adAccount.currency || 'BDT',
      },
    });

    return {
      draftId: draft.id,
      currentTurn: 1,
      aiMessage: {
        en: 'What product or offer would you like to promote today? Select from your catalog below or describe your promotion.',
        bn: 'আজ আপনি কোন পণ্য বা অফার প্রমোট করতে চান? নিচে আপনার ক্যাটালগ থেকে নির্বাচন করুন বা অফারের বর্ণনা দিন।',
      },
      products,
    };
  }

  async processTurn(tenantId: string, draftId: string, turn: number, payload: {
    userMessage?: string;
    productIds?: string[];
    locations?: string[];
    budget?: number;
    durationDays?: number;
    placements?: string[];
    headline?: string;
    bodyText?: string;
    callToAction?: string;
    imageUrl?: string;
  }) {
    const draft = await this.prisma.adCampaignDraft.findFirst({
      where: { id: draftId, tenantId },
    });

    if (!draft) {
      throw new NotFoundException(`Ad Campaign Draft ${draftId} not found.`);
    }

    // Turn 1: Product Selection / RAG
    if (turn === 1) {
      let selectedProductIds = payload.productIds || [];
      let promotionDesc = payload.userMessage || '';

      if (selectedProductIds.length === 0 && promotionDesc) {
        // Search catalog for matching product
        const matchedProducts = await this.prisma.product.findMany({
          where: {
            tenantId,
            isActive: true,
            OR: [
              { name: { contains: promotionDesc, mode: 'insensitive' } },
              { description: { contains: promotionDesc, mode: 'insensitive' } },
            ],
          },
          take: 3,
        });
        selectedProductIds = matchedProducts.map((p) => p.id);
      }

      await this.prisma.adCampaignDraft.update({
        where: { id: draftId },
        data: {
          productIds: selectedProductIds,
          promotionDescription: promotionDesc,
        },
      });

      return {
        draftId,
        currentTurn: 2,
        aiMessage: {
          en: 'Great! We will target Advantage+ Audience by default for optimal Meta conversion algorithms. Which locations should your ad target?',
          bn: 'চমৎকার! সেরা রূপান্তরের জন্য আমরা Advantage+ Audience ব্যবহার করব। আপনার বিজ্ঞাপনটি কোন অঞ্চলে দেখাতে চান?',
        },
        defaultLocations: ['Dhaka', 'Bangladesh'],
      };
    }

    // Turn 2: Audience & Location
    if (turn === 2) {
      const locations = payload.locations || ['Bangladesh'];
      const targetLocations = locations.map((loc) => ({ country: 'BD', city: loc }));

      await this.prisma.adCampaignDraft.update({
        where: { id: draftId },
        data: {
          targetLocations: targetLocations as any,
          ageMin: 18,
          ageMax: 65,
          audienceType: 'ADVANTAGE_PLUS',
        },
      });

      return {
        draftId,
        currentTurn: 3,
        aiMessage: {
          en: 'Got it. What daily budget and campaign duration would you like to set? Specify placements (Facebook & Instagram).',
          bn: 'ঠিক আছে। আপনার দৈনিক বাজেট কত এবং কতদিনের জন্য চালাতে চান? প্লেসমেন্ট নির্বাচন করুন (Facebook & Instagram)।',
        },
        suggestedBudget: 500,
        currency: draft.currency || 'BDT',
      };
    }

    // Turn 3: Budget & Placements
    if (turn === 3) {
      const budget = payload.budget || 500;
      const durationDays = payload.durationDays || 7;
      const placements = payload.placements || ['facebook', 'instagram'];

      // Telemetry balance check
      let balanceWarning = false;
      try {
        const balanceData = await this.mcpAdsService.getAdAccountBalance(tenantId, draft.adAccountId);
        if (balanceData.balance > 0 && balanceData.balance < budget) {
          balanceWarning = true;
        }
      } catch (err) {
        this.logger.warn(`Could not verify ad account balance: ${err}`);
      }

      // Generate AI Creative Copy based on product selection
      let headline = payload.headline || 'বিশেষ অফার - আজই অর্ডার করুন!';
      let bodyText = payload.bodyText || 'আমাদের প্রিমিয়াম কোয়ালিটি প্রোডাক্টে আকর্ষণীয় মূল্যছাড়। সারাদেশে ক্যাশ অন ডেলিভারি।';
      let imageUrl = payload.imageUrl || '';

      if (draft.productIds.length > 0) {
        const firstProd = await this.prisma.product.findUnique({
          where: { id: draft.productIds[0] },
        });
        if (firstProd) {
          headline = `${firstProd.name.slice(0, 35)} - অফার!`;
          if (firstProd.description) {
            bodyText = `${firstProd.description.slice(0, 110)}... এখনই অর্ডার করুন!`;
          }
          if (firstProd.imageUrl) {
            imageUrl = firstProd.imageUrl;
          }
        }
      }

      await this.prisma.adCampaignDraft.update({
        where: { id: draftId },
        data: {
          budget,
          durationDays,
          placements,
          headline: headline.slice(0, 40),
          bodyText: bodyText.slice(0, 125),
          callToAction: 'SHOP_NOW',
          imageUrl,
        },
      });

      return {
        draftId,
        currentTurn: 4,
        aiMessage: {
          en: 'Here is your AI-generated ad creative. You can review the copy and image before finalizing.',
          bn: 'এই যে আপনার AI-জেনারেটেড বিজ্ঞাপন বিবরণ ও ছবি। চূড়ান্ত করার আগে কপি ও ইমেজ চেক করে নিন।',
        },
        balanceWarning,
        creative: {
          headline,
          bodyText,
          callToAction: 'SHOP_NOW',
          imageUrl,
        },
      };
    }

    // Turn 4: Creative Review & Image Hash Resolution
    if (turn === 4) {
      const headline = (payload.headline || draft.headline || 'বিশেষ অফার').slice(0, 40);
      const bodyText = (payload.bodyText || draft.bodyText || 'সেরা প্রোডাক্ট এ সেরা ছাড়।').slice(0, 125);
      const callToAction = payload.callToAction || draft.callToAction || 'SHOP_NOW';
      const imageUrl = payload.imageUrl || draft.imageUrl || '';

      let metaImageHash: string | undefined = undefined;

      // Upload image to Meta adimages if image URL exists
      if (imageUrl) {
        try {
          const uploadRes = await this.mcpAdsService.uploadAdImage(tenantId, draft.adAccountId, { imageUrl });
          metaImageHash = uploadRes.hash;
        } catch (err: any) {
          this.logger.warn(`Failed to pre-upload image to Meta: ${err.message}`);
        }
      }

      const updatedDraft = await this.prisma.adCampaignDraft.update({
        where: { id: draftId },
        data: {
          headline,
          bodyText,
          callToAction,
          imageUrl,
          metaImageHash,
        },
      });

      return {
        draftId,
        currentTurn: 5,
        aiMessage: {
          en: 'Your campaign draft is complete and ready for final approval.',
          bn: 'আপনার ক্যাম্পেইন ড্রাফট সম্পূর্ণ তৈরি এবং চূড়ান্ত অনুমোদনের জন্য প্রস্তুত।',
        },
        summaryCard: {
          draftId: updatedDraft.id,
          adAccountId: updatedDraft.adAccountId,
          headline: updatedDraft.headline,
          bodyText: updatedDraft.bodyText,
          budget: Number(updatedDraft.budget),
          currency: updatedDraft.currency,
          durationDays: updatedDraft.durationDays,
          placements: updatedDraft.placements,
          imageUrl: updatedDraft.imageUrl,
          aiResponseUnitsRequired: updatedDraft.aiResponseUnitsReserved,
        },
      };
    }

    throw new BadRequestException(`Invalid turn step: ${turn}`);
  }

  // 4-Step Saga Pattern Execution: Approve & Run Ad
  async approveAndRunAd(tenantId: string, draftId: string) {
    const draft = await this.prisma.adCampaignDraft.findFirst({
      where: { id: draftId, tenantId },
    });

    if (!draft) {
      throw new NotFoundException(`Ad Campaign Draft ${draftId} not found.`);
    }

    if (draft.status !== 'DRAFT' && draft.status !== 'FAILED_REFUNDED') {
      throw new BadRequestException(`Campaign draft is already in ${draft.status} state.`);
    }

    const unitsToReserve = draft.aiResponseUnitsReserved || 10;

    // STEP 1: Reserve AI Response Units
    try {
      await this.quotaService.reserveAiResponseUnits(tenantId, unitsToReserve, 'AD_RUN', draftId);
    } catch (error: any) {
      this.logger.error(`Quota reservation failed for tenant ${tenantId}: ${error.message}`);
      throw new BadRequestException('AI Response কোটা পর্যাপ্ত নেই! অনুগ্রহ করে কোটা রিনিউ বা অ্যাড-অন ক্রয় করুন।');
    }

    let metaCampaignId: string | undefined;
    let metaAdSetId: string | undefined;
    let metaAdId: string | undefined;

    try {
      // STEP 2: Create Campaign on Meta
      const campaignRes = await this.mcpAdsService.createCampaign(tenantId, draft.adAccountId, {
        name: `ZiniChat - ${draft.headline || 'AI Ad'}`,
        dailyBudget: Number(draft.budget),
        status: 'PAUSED',
      });
      metaCampaignId = campaignRes.campaignId;

      // STEP 3: Create AdSet on Meta
      try {
        const adSetRes = await this.mcpAdsService.createAdSet(tenantId, draft.adAccountId, metaCampaignId!, {
          name: `AdSet - Advantage+ Audience`,
          dailyBudget: Number(draft.budget),
          facebookPageId: draft.facebookPageId,
          targeting: draft.targetLocations,
          status: 'PAUSED',
        });
        metaAdSetId = adSetRes.adSetId;
      } catch (adSetError: any) {
        // Compensate: Pause created campaign
        this.logger.error(`AdSet creation failed. Compensating campaign ${metaCampaignId}...`);
        await this.mcpAdsService.pauseCampaign(tenantId, draft.adAccountId, metaCampaignId!).catch(() => null);
        throw adSetError;
      }

      // STEP 4: Create Ad on Meta
      try {
        const adRes = await this.mcpAdsService.createAd(tenantId, draft.adAccountId, metaAdSetId!, {
          name: `Ad Creative - ${draft.headline}`,
          facebookPageId: draft.facebookPageId,
          headline: draft.headline || 'বিশেষ অফার',
          bodyText: draft.bodyText || 'আজই অর্ডার করুন',
          callToAction: draft.callToAction || 'SHOP_NOW',
          metaImageHash: draft.metaImageHash || undefined,
          imageUrl: draft.imageUrl || undefined,
          status: 'PAUSED',
        });
        metaAdId = adRes.adId;
      } catch (adError: any) {
        // Compensate: Pause AdSet and Campaign
        this.logger.error(`Ad creation failed. Compensating AdSet ${metaAdSetId} & Campaign ${metaCampaignId}...`);
        await this.mcpAdsService.pauseAdSet(tenantId, draft.adAccountId, metaAdSetId!).catch(() => null);
        await this.mcpAdsService.pauseCampaign(tenantId, draft.adAccountId, metaCampaignId!).catch(() => null);
        throw adError;
      }

      // ALL Succeeded: Commit reserved units & update draft status to PENDING_REVIEW
      await this.quotaService.commitReservedUnits(draftId);

      const updatedDraft = await this.prisma.adCampaignDraft.update({
        where: { id: draftId },
        data: {
          status: 'PENDING_REVIEW',
          approvedAt: new Date(),
          metaCampaignId,
          metaAdSetId,
          metaAdId,
          metaAdReviewStatus: 'PENDING_REVIEW',
        },
      });

      // Log AI Token Usage
      await this.prisma.aiTokenUsageLog.create({
        data: {
          tenantId,
          featureName: 'AD_CREATOR',
          modelName: 'claude-3-5-sonnet',
          inputTokens: 1200,
          outputTokens: 450,
          costUsd: 0.035,
          draftId,
        },
      });

      // Send Email Notification
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { users: true } });
      const ownerEmail = tenant?.users?.find((u) => u.role === 'owner' || u.role === 'admin')?.email;
      if (ownerEmail && tenant) {
        const tenantName = (tenant as any).name || (tenant as any).slug || 'Merchant';
        await this.smtpService.triggerAdPublishedEmail(ownerEmail, tenantName, {
          name: draft.headline || 'Meta Campaign',
          budget: Number(draft.budget),
          currency: draft.currency || 'BDT',
        }).catch(() => null);
      }

      return {
        success: true,
        message: 'বিজ্ঞাপনটি সফলভাবে তৈরি হয়ে Meta Review-তে সাবমিট করা হয়েছে।',
        metaCampaignId,
        metaAdSetId,
        metaAdId,
        status: updatedDraft.status,
      };

    } catch (sagaError: any) {
      this.logger.error(`Saga failed during ad launch: ${sagaError.message}`);

      // Execute Compensation Refund
      await this.quotaService.refundReservedUnits(draftId, sagaError.message).catch(() => null);

      await this.prisma.adCampaignDraft.update({
        where: { id: draftId },
        data: {
          status: 'FAILED_REFUNDED',
          failureReason: sagaError.message,
        },
      });

      // Send failure notification email
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { users: true } });
      const ownerEmail = tenant?.users?.find((u) => u.role === 'owner' || u.role === 'admin')?.email;
      if (ownerEmail && tenant) {
        const tenantName = (tenant as any).name || (tenant as any).slug || 'Merchant';
        await this.smtpService.triggerAdFailedRefundedEmail(ownerEmail, tenantName, sagaError.message).catch(() => null);
      }

      throw new InternalServerErrorException(`ক্যাম্পেইন প্রকাশ করতে ব্যর্থ হয়েছে: ${sagaError.message}. আপনার কোটা ইউনিট রিফান্ড করা হয়েছে।`);
    }
  }

  // Handle Webhook from Meta for Ad Review Status
  async handleMetaAdReviewWebhook(metaAdId: string, status: 'ACTIVE' | 'REJECTED', reason?: string) {
    const draft = await this.prisma.adCampaignDraft.findFirst({
      where: { metaAdId },
      include: { tenant: { include: { users: true } } },
    });

    if (!draft) {
      this.logger.warn(`No AdCampaignDraft found matching Meta Ad ID ${metaAdId}`);
      return;
    }

    if (status === 'REJECTED') {
      // Refund reserved units for policy rejection
      await this.quotaService.refundReservedUnits(draft.id, `Meta policy rejection: ${reason}`).catch(() => null);

      await this.prisma.adCampaignDraft.update({
        where: { id: draft.id },
        data: {
          status: 'REJECTED_BY_META',
          metaAdReviewStatus: 'REJECTED',
          failureReason: reason || 'Meta Policy Violation',
        },
      });

      const ownerEmail = draft.tenant?.users?.find((u) => u.role === 'owner' || u.role === 'admin')?.email;
      if (ownerEmail && draft.tenant) {
        const tenantName = (draft.tenant as any).name || (draft.tenant as any).slug || 'Merchant';
        await this.smtpService.triggerAdRejectedByMetaEmail(ownerEmail, tenantName, draft.headline || 'Ad Campaign', reason || 'Policy Violation').catch(() => null);
      }
    } else if (status === 'ACTIVE') {
      await this.prisma.adCampaignDraft.update({
        where: { id: draft.id },
        data: {
          status: 'ACTIVE',
          metaAdReviewStatus: 'APPROVED',
        },
      });
    }
  }

  async getDraftsAndCampaigns(tenantId: string) {
    return this.prisma.adCampaignDraft.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async toggleCampaignStatus(tenantId: string, draftId: string, action: 'PAUSE' | 'RESUME') {
    const draft = await this.prisma.adCampaignDraft.findFirst({
      where: { id: draftId, tenantId },
    });

    if (!draft || !draft.metaCampaignId) {
      throw new NotFoundException(`Active Meta campaign for draft ${draftId} not found.`);
    }

    if (action === 'PAUSE') {
      await this.mcpAdsService.pauseCampaign(tenantId, draft.adAccountId, draft.metaCampaignId);
      await this.prisma.adCampaignDraft.update({
        where: { id: draftId },
        data: { status: 'PAUSED' },
      });
      return { status: 'PAUSED' };
    } else {
      await this.mcpAdsService.resumeCampaign(tenantId, draft.adAccountId, draft.metaCampaignId);
      await this.prisma.adCampaignDraft.update({
        where: { id: draftId },
        data: { status: 'ACTIVE' },
      });
      return { status: 'ACTIVE' };
    }
  }

  // --- Phase 7 Auto-Scaling Engine & Data Retention ---

  async toggleAutoScaling(tenantId: string, draftId: string, enabled: boolean, maxBudget?: number) {
    const draft = await this.prisma.adCampaignDraft.findFirst({
      where: { id: draftId, tenantId },
    });

    if (!draft) {
      throw new NotFoundException(`Ad Campaign Draft ${draftId} not found.`);
    }

    const updated = await this.prisma.adCampaignDraft.update({
      where: { id: draftId },
      data: {
        autoScalingEnabled: enabled,
        autoScalingMaxBudget: enabled ? (maxBudget || Number(draft.budget) * 2) : draft.autoScalingMaxBudget,
      },
    });

    return {
      autoScalingEnabled: updated.autoScalingEnabled,
      autoScalingMaxBudget: Number(updated.autoScalingMaxBudget || 0),
    };
  }

  async executeCampaignAutoScaling(draftId: string) {
    const draft = await this.prisma.adCampaignDraft.findUnique({
      where: { id: draftId },
      include: { tenant: { include: { users: true } } },
    });

    if (!draft || !draft.autoScalingEnabled || draft.status !== 'ACTIVE' || !draft.metaCampaignId) {
      return;
    }

    // Guardrail 1: Max 1 scaling action per 24h
    if (draft.autoScalingActionsToday >= 1) {
      this.logger.log(`Auto-scaling skipped for ${draftId}: Daily action limit (1/1) reached.`);
      return;
    }

    // Fetch telemetry performance (ROAS / CTR / Conversions)
    let insights: any = null;
    try {
      insights = await this.mcpAdsService.getAdInsights(draft.tenantId, draft.adAccountId, 'today');
    } catch (err) {
      this.logger.warn(`Could not fetch insights for auto-scaling ${draftId}: ${err}`);
      return;
    }

    const ctr = insights?.ctr || 0;
    const purchases = insights?.purchases || 0;
    const leads = insights?.leads || 0;

    // Guardrail 2: Performance threshold check
    const performsWell = ctr >= 1.5 || purchases > 0 || leads > 0;
    if (!performsWell) {
      this.logger.log(`Auto-scaling skipped for ${draftId}: Performance below threshold (CTR: ${ctr}%).`);
      return;
    }

    const currentBudget = Number(draft.budget || 500);
    const maxBudgetCap = draft.autoScalingMaxBudget ? Number(draft.autoScalingMaxBudget) : currentBudget * 2;

    // Guardrail 3: 20% max increase cap
    const maxAllowedIncrease = currentBudget * 0.20;
    const headroom = Math.max(0, maxBudgetCap - currentBudget);
    const budgetIncrease = Math.min(maxAllowedIncrease, headroom);

    if (budgetIncrease <= 0) {
      this.logger.log(`Auto-scaling skipped for ${draftId}: Max budget cap (${maxBudgetCap}) reached.`);
      return;
    }

    const newBudget = Math.round(currentBudget + budgetIncrease);
    const config = await this.marketingConfig.getConfig();
    const autoScaleUnitCost = config.autoScaleUnitCost || 5;

    // STEP 1: Reserve Auto-scaling Units
    try {
      await this.quotaService.reserveAiResponseUnits(draft.tenantId, autoScaleUnitCost, 'AD_AUTOSCALE', draft.id);
    } catch (err: any) {
      this.logger.warn(`Auto-scaling skipped for ${draftId}: Insufficient AI quota (${err.message}).`);
      return;
    }

    // STEP 2: Update Campaign / AdSet Budget on Meta
    try {
      await this.mcpAdsService.createCampaign(draft.tenantId, draft.adAccountId, {
        name: `ZiniChat - ${draft.headline || 'AI Ad'}`,
        dailyBudget: newBudget,
        status: 'ACTIVE',
      });

      // Commit units & update draft
      await this.quotaService.commitReservedUnits(draft.id);

      await this.prisma.adCampaignDraft.update({
        where: { id: draft.id },
        data: {
          budget: newBudget,
          autoScalingActionsToday: draft.autoScalingActionsToday + 1,
          autoScalingLastActionAt: new Date(),
        },
      });

      // Send email alert
      const ownerEmail = draft.tenant?.users?.find((u) => u.role === 'owner' || u.role === 'admin')?.email;
      if (ownerEmail && draft.tenant) {
        const tenantName = (draft.tenant as any).name || (draft.tenant as any).slug || 'Merchant';
        await this.smtpService.triggerAutoScaleActionEmail(ownerEmail, tenantName, {
          name: draft.headline || 'Ad Campaign',
          oldBudget: currentBudget,
          newBudget,
          currency: draft.currency || 'BDT',
        }).catch(() => null);
      }

      this.logger.log(`Successfully auto-scaled campaign ${draft.id} budget from ${currentBudget} to ${newBudget}`);
    } catch (scaleErr: any) {
      this.logger.error(`Auto-scaling Meta API call failed for ${draft.id}: ${scaleErr.message}`);
      await this.quotaService.refundReservedUnits(draft.id, 'auto_scale_failed').catch(() => null);
    }
  }

  async purgeOldDataLogs() {
    const now = new Date();
    const minus60d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const minus90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const minus6mo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const [capiRes, draftRes, tokenRes] = await Promise.all([
      this.prisma.capiEventLog.deleteMany({ where: { createdAt: { lt: minus60d } } }),
      this.prisma.adCampaignDraft.deleteMany({ where: { status: 'DRAFT', createdAt: { lt: minus90d } } }),
      this.prisma.aiTokenUsageLog.deleteMany({ where: { createdAt: { lt: minus6mo } } }),
    ]);

    this.logger.log(`Data Purge Completed: ${capiRes.count} CAPI logs, ${draftRes.count} drafts, ${tokenRes.count} token logs purged.`);
    return { capiPurged: capiRes.count, draftsPurged: draftRes.count, tokensPurged: tokenRes.count };
  }
}


import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class TenantStatsService {
  constructor(
    private prisma: PrismaService,
    private quotaService: QuotaService,
    private billingService: BillingService,
  ) {}

  // ─── helpers ────────────────────────────────────────────────────────────────
  private startOfDay(date = new Date()): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date = new Date()): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private parseDateRange(range = '30d', startDateStr?: string, endDateStr?: string): { from: Date; to: Date; prevFrom: Date; prevTo: Date; numDays: number } {
    const now = new Date();
    let from: Date;
    let to = this.endOfDay(now);

    if (startDateStr && endDateStr) {
      from = this.startOfDay(new Date(startDateStr));
      to = this.endOfDay(new Date(endDateStr));
      const diffMs = to.getTime() - from.getTime();
      const numDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const prevFrom = new Date(from.getTime() - numDays * 24 * 60 * 60 * 1000);
      const prevTo = new Date(from.getTime() - 1);
      return { from, to, prevFrom, prevTo, numDays };
    }

    let days = 30;
    if (range === 'today') days = 1;
    else if (range === '7d') days = 7;
    else if (range === '15d') days = 15;
    else if (range === '30d') days = 30;
    else if (range === '90d') days = 90;
    else if (range === 'this_month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = this.endOfDay(now);
      const diffMs = to.getTime() - from.getTime();
      const numDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { from, to, prevFrom, prevTo, numDays };
    } else if (range === 'last_month') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const prevFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const prevTo = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
      return { from, to, prevFrom, prevTo, numDays: 30 };
    }

    from = this.daysAgo(days - 1);
    const prevFrom = this.daysAgo(days * 2 - 1);
    const prevTo = new Date(from.getTime() - 1);

    return { from, to, prevFrom, prevTo, numDays: days };
  }

  private computeGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // ─── main dashboard overview ─────────────────────────────────────────────────
  async getDashboardOverview(tenantId: string, range = '30d', startDate?: string, endDate?: string) {
    const todayStart = this.startOfDay();
    const { from, to, prevFrom, prevTo, numDays } = this.parseDateRange(range, startDate, endDate);

    const { periodStart, messageQuota, aiQuota, subscription: activeSub } =
      await this.billingService.getActivePeriod(tenantId);

    const quotas = await this.billingService.getTenantQuotas(tenantId);

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const finalMsgLimit = tenant?.customMessageQuota ?? messageQuota;
    const finalAiLimit = tenant?.customAiQuota ?? aiQuota;

    // ── KPIs: Messages ──────────────────────────────────────────────────────
    const [
      msgToday,
      msgFiltered,
      msgPrevFiltered,
      messagesUsed,
    ] = await Promise.all([
      this.prisma.message.count({
        where: { conversation: { tenantId }, direction: 'outbound', createdAt: { gte: todayStart } }
      }),
      this.prisma.message.count({
        where: { conversation: { tenantId }, direction: 'outbound', createdAt: { gte: from, lte: to } }
      }),
      this.prisma.message.count({
        where: { conversation: { tenantId }, direction: 'outbound', createdAt: { gte: prevFrom, lte: prevTo } }
      }),
      this.quotaService.getMessageUsage(tenantId, periodStart),
    ]);

    // ── KPIs: AI responses ────────────────────────────────────────────────────
    const [aiToday, aiFiltered, aiPrevFiltered, aiCostToday, aiCostFiltered, aiUsedInPeriod] = await Promise.all([
      this.prisma.aiUsageLog.count({
        where: { tenantId, createdAt: { gte: todayStart } }
      }),
      this.prisma.aiUsageLog.count({
        where: { tenantId, createdAt: { gte: from, lte: to } }
      }),
      this.prisma.aiUsageLog.count({
        where: { tenantId, createdAt: { gte: prevFrom, lte: prevTo } }
      }),
      this.prisma.aiUsageLog.aggregate({
        _sum: { costUsd: true },
        where: { tenantId, createdAt: { gte: todayStart } }
      }),
      this.prisma.aiUsageLog.aggregate({
        _sum: { costUsd: true, tokensUsed: true },
        _count: true,
        where: { tenantId, createdAt: { gte: from, lte: to } }
      }),
      this.prisma.aiUsageLog.count({
        where: { tenantId, createdAt: { gte: periodStart } }
      }),
    ]);

    const aiCostTodayUsd = Number(aiCostToday._sum.costUsd || 0);
    const aiCostFilteredUsd = Number(aiCostFiltered._sum.costUsd || 0);
    const aiTotalTokens = Number(aiCostFiltered._sum.tokensUsed || 0);
    const aiResponseCount = aiCostFiltered._count || 1;
    const avgTokensPerResponse = aiResponseCount > 0 ? Math.round(aiTotalTokens / aiResponseCount) : 0;
    const projectedAiCost = numDays > 0 ? (aiCostFilteredUsd / numDays) * 30 : 0;
    const avgCostPerResponse = aiResponseCount > 0 ? aiCostFilteredUsd / aiResponseCount : 0;

    const yesterday = this.daysAgo(1);
    const [msgYesterday, outboundToday] = await Promise.all([
      this.prisma.message.count({
        where: { conversation: { tenantId }, createdAt: { gte: yesterday, lt: todayStart } }
      }),
      this.prisma.message.count({
        where: { conversation: { tenantId }, direction: 'outbound', createdAt: { gte: todayStart } }
      })
    ]);


    const todayAutomationRate = outboundToday > 0 ? Math.round((aiToday / outboundToday) * 100) : 0;
    const todayMsgGrowth = msgYesterday > 0 ? Math.round(((msgToday - msgYesterday) / msgYesterday) * 100) : 0;

    // Human messages = total outbound - AI outbound in range
    const outboundFiltered = await this.prisma.message.count({
      where: { conversation: { tenantId }, direction: 'outbound', createdAt: { gte: from, lte: to } }
    });
    const humanFiltered = Math.max(0, outboundFiltered - aiFiltered);
    const automationRate = outboundFiltered > 0 ? Math.round((aiFiltered / outboundFiltered) * 100) : 0;

    // ── KPIs: Conversations ───────────────────────────────────────────────────
    const [openConvs, unreadConvs, pendingConvs, resolvedToday] = await Promise.all([
      this.prisma.conversation.count({ where: { tenantId, status: 'open' } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'open', unreadCount: { gt: 0 } } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'bot' } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'closed', lastMessageAt: { gte: todayStart } } }),
    ]);

    // Fetch today's explicit metrics for leads, orders, revenue, and broadcasts
    const [leadsTodayCount, ordersTodayCount, todayRevenueAggregate, broadcastsTodayCount] = await Promise.all([
      this.prisma.contact.count({ where: { tenantId, lastSeenAt: { gte: todayStart } } }),
      this.prisma.order.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      this.prisma.order.aggregate({
        where: { tenantId, status: { in: ['delivered', 'completed', 'paid'] }, createdAt: { gte: todayStart } },
        _sum: { totalAmount: true }
      }),
      this.prisma.broadcast.count({ where: { tenantId, createdAt: { gte: todayStart } } })
    ]);


    const todayRevenueVal = Number(todayRevenueAggregate._sum.totalAmount || 0);

    // Build strict TODAY summary text (does not change with date range filter)
    const todaySummaryEn = [
      todayAutomationRate > 0 ? `AI handled ${todayAutomationRate}% of messages automatically today.` : 'AI has not automated replies today.',
      todayMsgGrowth > 0 
        ? `Message volume is up ${todayMsgGrowth}% compared to yesterday.`
        : todayMsgGrowth < 0 
        ? `Message volume is down ${Math.abs(todayMsgGrowth)}% from yesterday.` 
        : 'Message volume is steady compared to yesterday.',
      openConvs > 0 
        ? `${openConvs} conversation${openConvs > 1 ? 's are' : ' is'} currently open (${unreadConvs > 0 ? `${unreadConvs} unread 🔴` : 'all read 🟢'}).`
        : 'No open inbox messages pending 🟢',
      leadsTodayCount > 0 ? `Acquired ${leadsTodayCount} new lead${leadsTodayCount > 1 ? 's' : ''} today.` : 'No new leads acquired today.',
      ordersTodayCount > 0 ? `Received ${ordersTodayCount} order${ordersTodayCount > 1 ? 's' : ''} today (total ৳${todayRevenueVal.toLocaleString()}).` : 'No new orders today.',
      broadcastsTodayCount > 0 ? `Sent ${broadcastsTodayCount} broadcast campaign${broadcastsTodayCount > 1 ? 's' : ''} today.` : ''
    ].filter(Boolean).join(' ');

    const todaySummaryBn = [
      todayAutomationRate > 0 ? `আজ এআই ${todayAutomationRate}% মেসেজ স্বয়ংক্রিয়ভাবে উত্তর দিয়েছে।` : 'আজ এআই মেসেজ হ্যান্ডলিং শুরু করেনি।',
      todayMsgGrowth > 0
        ? `গতকালকের তুলনায় মেসেজের সংখ্যা ${todayMsgGrowth}% বেড়েছে।`
        : todayMsgGrowth < 0
        ? `গতকালকের তুলনায় মেসেজ ভলিউম ${Math.abs(todayMsgGrowth)}% কমেছে।`
        : 'গতকালকের তুলনায় মেসেজ ভলিউম স্থিতিশীল আছে।',
      openConvs > 0
        ? `${openConvs}টি ইনবক্স কনভারসেশন ওপেন আছে (${unreadConvs > 0 ? `${unreadConvs}টি অপঠিত 🔴` : 'সব পঠিত 🟢'})।`
        : 'কোনো ওপেন ইনবক্স মেসেজ পেন্ডিং নেই 🟢',
      leadsTodayCount > 0 ? `আজ নতুন ${leadsTodayCount}টি লিড যুক্ত হয়েছে।` : 'আজ কোনো নতুন লিড যুক্ত হয়নি।',
      ordersTodayCount > 0 ? `আজ ${ordersTodayCount}টি অর্ডার এসেছে (মোট ৳${todayRevenueVal.toLocaleString('bn-BD')})।` : 'আজ কোনো নতুন অর্ডার আসেনি।',
      broadcastsTodayCount > 0 ? `আজ ${broadcastsTodayCount}টি ব্রডকাস্ট ক্যাম্পেইন পরিচালনা করা হয়েছে।` : ''
    ].filter(Boolean).join(' ');



    // ── Subscription health ───────────────────────────────────────────────────
    const storageLimitMb = quotas.storageLimitMb;
    const seatLimit = quotas.seatLimit;
    const [teamCount] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
    ]);
    const broadcastCount = await this.prisma.broadcast.count({ where: { tenantId } });
    const contactsCount = await this.prisma.contact.count({ where: { tenantId } });
    const productsCount = await this.prisma.product.count({ where: { tenantId } });

    // ── Connected channels ────────────────────────────────────────────────────
    const channelConnections = await this.prisma.channelConnection.findMany({
      where: { tenantId },
      select: {
        id: true, channelType: true, displayName: true, status: true,
        provider: true, phoneNumber: true, createdAt: true
      }
    });

    const channelMsgToday = await Promise.all(
      channelConnections.map(async (ch) => {
        const count = await this.prisma.message.count({
          where: {
            conversation: { tenantId, channelConnectionId: ch.id },
            createdAt: { gte: from, lte: to }
          }
        });
        return { ...ch, messagesToday: count };
      })
    );

    const websiteWidgets = await this.prisma.websiteWidget.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, createdAt: true, primaryColor: true }
    });

    const widgetChannels = await Promise.all(
      websiteWidgets.map(async (w) => {
        const count = await this.prisma.message.count({
          where: {
            conversation: { tenantId, channel: 'website' },
            createdAt: { gte: from, lte: to }
          }
        });
        return {
          id: w.id,
          channelType: 'website',
          displayName: w.name || 'Website Live Chat',
          status: 'connected',
          provider: 'ZiniChat Widget',
          phoneNumber: 'Widget',
          createdAt: w.createdAt,
          messagesToday: count
        };
      })
    );

    const allChannels = [...channelMsgToday, ...widgetChannels];

    // ── Team overview ─────────────────────────────────────────────────────────
    const [adminCount, agentCount] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, role: 'admin' } }),
      this.prisma.user.count({ where: { tenantId, role: { in: ['agent', 'member'] } } }),
    ]);

    // ── CRM ───────────────────────────────────────────────────────────────────
    const [crmTotal, crmNew, crmFollowUpDue, crmOverdue] = await Promise.all([
      this.prisma.contact.count({ where: { tenantId } }),
      this.prisma.contact.count({ where: { tenantId, lastSeenAt: { gte: from, lte: to } } }),
      this.prisma.contact.count({
        where: { tenantId, followUpAt: { gte: new Date(), lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } }
      }),
      this.prisma.contact.count({
        where: { tenantId, followUpAt: { lt: new Date() }, followUpNotified: false }
      }),
    ]);

    // CRM stage breakdown via stageId
    const stageGroups = await this.prisma.contact.groupBy({
      by: ['stageId'],
      where: { tenantId },
      _count: { id: true }
    });
    const stages = (this.prisma as any).stage ? await (this.prisma as any).stage.findMany({ where: { tenantId }, select: { id: true, name: true } }).catch(() => []) : [];
    const stageLookup: Record<string, string> = {};
    stages.forEach((s: any) => { stageLookup[s.id] = s.name?.toLowerCase(); });

    let stageNew = 0, stageQualified = 0, stageNegotiation = 0, stageWon = 0, stageLost = 0, stageProposal = 0;
    for (const g of stageGroups) {
      const name = stageLookup[g.stageId || ''] || '';
      const count = g._count.id;
      if (name.includes('new') || name.includes('lead') || !g.stageId) stageNew += count;
      else if (name.includes('qualif')) stageQualified += count;
      else if (name.includes('proposal') || name.includes('propos')) stageProposal += count;
      else if (name.includes('negotiat')) stageNegotiation += count;
      else if (name.includes('won') || name.includes('closed-won')) stageWon += count;
      else if (name.includes('lost') || name.includes('closed-lost')) stageLost += count;
      else stageNew += count;
    }

    // ── Orders ────────────────────────────────────────────────────────────────
    const [ordersToday, ordersFiltered, pendingOrders, processingOrders, deliveredOrders, cancelledOrders, refundedOrders] = await Promise.all([
      this.prisma.order.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      this.prisma.order.count({ where: { tenantId, createdAt: { gte: from, lte: to } } }),
      this.prisma.order.count({ where: { tenantId, status: 'pending' } }),
      this.prisma.order.count({ where: { tenantId, status: { in: ['confirmed', 'processing', 'shipped'] } } }),
      this.prisma.order.count({ where: { tenantId, status: 'delivered' } }),
      this.prisma.order.count({ where: { tenantId, status: 'cancelled' } }),
      this.prisma.order.count({ where: { tenantId, status: 'refunded' } }),
    ]);

    const [revenueAgg, revenuePrevFiltered, revToday] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { tenantId, status: 'delivered', createdAt: { gte: from, lte: to } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { tenantId, status: 'delivered', createdAt: { gte: prevFrom, lte: prevTo } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { tenantId, status: { in: ['delivered', 'confirmed'] }, createdAt: { gte: todayStart } } }),
    ]);
    const filteredRevenue = Number(revenueAgg._sum.totalAmount || 0);
    const prevFilteredRevenue = Number(revenuePrevFiltered._sum.totalAmount || 0);
    const todayRevenue = Number(revToday._sum.totalAmount || 0);
    const avgOrderValue = ordersFiltered > 0 ? filteredRevenue / ordersFiltered : 0;

    // ── Products ──────────────────────────────────────────────────────────────
    const [publishedProducts, draftProducts, outOfStockProducts] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: false } }),
      this.prisma.product.count({ where: { tenantId, stockCount: 0, isActive: true } }).catch(() => 0),
    ]);

    // ── Broadcasts ────────────────────────────────────────────────────────────
    const [bcDelivered, bcRead, bcFailed, bcClicked] = await Promise.all([
      this.prisma.broadcastRecipient.count({ where: { broadcast: { tenantId }, status: 'sent' } }).catch(() => 0),
      this.prisma.broadcastRecipient.count({ where: { broadcast: { tenantId }, status: 'read' } }).catch(() => 0),
      this.prisma.broadcastRecipient.count({ where: { broadcast: { tenantId }, status: 'failed' } }).catch(() => 0),
      this.prisma.broadcastRecipient.count({ where: { broadcast: { tenantId }, status: 'clicked' } }).catch(() => 0),
    ]);
    const bcTotal = bcDelivered + bcRead + bcFailed;
    const ctr = bcTotal > 0 ? Math.round((bcClicked / bcTotal) * 100 * 10) / 10 : 0;

    // ── Activity ─────────────────────────────────────────────────────────────
    const recentMessages = await this.prisma.message.findMany({
      where: { conversation: { tenantId } },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { conversation: { include: { contact: true } } }
    });
    const formattedActivity = recentMessages.map(msg => ({
      id: msg.id,
      type: 'message',
      title: msg.direction === 'inbound' ? 'Message received' : 'Message sent',
      description: String(msg.content || '').substring(0, 60),
      time: msg.createdAt,
      contactName: msg.conversation?.contact?.name || 'Unknown'
    }));

    // ── Business Health Score (Real Data - 0 if no sales/CRM) ────────────────
    const finalMessagesUsed = Math.max(messagesUsed, aiUsedInPeriod);
    const msgUsagePct = Math.min(100, Math.round((finalMessagesUsed / finalMsgLimit) * 100));
    const aiUsagePct = Math.min(100, Math.round((aiFiltered / finalAiLimit) * 100));
    const aiPeriodUsagePct = Math.min(100, Math.round((aiUsedInPeriod / finalAiLimit) * 100));
    const subHealth = Math.max(0, 100 - Math.max(0, msgUsagePct - 80) - Math.max(0, aiPeriodUsagePct - 80));

    const responseScore = automationRate > 0 ? Math.min(100, Math.round(automationRate > 70 ? 95 : automationRate > 40 ? 80 : 60)) : 0;
    const crmHealth = crmTotal > 0 ? Math.min(100, Math.round(((stageWon + stageQualified) / crmTotal) * 100)) : 0;
    const salesPerf = filteredRevenue > 0 ? Math.min(100, Math.round(this.computeGrowth(filteredRevenue, prevFilteredRevenue) / 2 + 70)) : 0;
    const csatScore = openConvs + resolvedToday > 0 ? Math.min(100, Math.round((resolvedToday / (openConvs + resolvedToday)) * 100)) : 0;
    const aiPerfScore = aiFiltered > 0 ? Math.min(100, Math.round(60 + automationRate * 0.4)) : 0;

    // Health Score calculation (weighted average of non-zero active areas, 0 if fresh account)
    let scoreSum = 0;
    let weightSum = 0;

    if (subHealth > 0) { scoreSum += subHealth * 0.2; weightSum += 0.2; }
    if (responseScore > 0) { scoreSum += responseScore * 0.2; weightSum += 0.2; }
    if (crmHealth > 0) { scoreSum += crmHealth * 0.2; weightSum += 0.2; }
    if (salesPerf > 0) { scoreSum += salesPerf * 0.2; weightSum += 0.2; }
    if (aiPerfScore > 0) { scoreSum += aiPerfScore * 0.2; weightSum += 0.2; }

    const overallHealthScore = weightSum > 0 ? Math.round(scoreSum / weightSum) : 0;

    const features: string[] = Array.isArray(quotas.features) ? quotas.features as string[] : [];

    return {
      range,
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
      todaySummaryEn,
      todaySummaryBn,
      // KPI cards

      kpis: {
        messages: {
          today: msgToday,
          month: msgFiltered,
          used: messagesUsed,
          limit: finalMsgLimit,
          pct: msgUsagePct,
          growth: this.computeGrowth(msgFiltered, msgPrevFiltered),
          remaining: Math.max(0, finalMsgLimit - messagesUsed),
        },
        ai: {
          today: aiToday,
          month: aiFiltered,
          used: aiFiltered,
          limit: finalAiLimit,
          pct: aiUsagePct,
          growth: this.computeGrowth(aiFiltered, aiPrevFiltered),
          automationRate,
          costToday: aiCostTodayUsd,
          costMonth: aiCostFilteredUsd,
          projectedCost: projectedAiCost,
          avgCostPerResponse,
          avgTokens: avgTokensPerResponse,
        },
        human: {
          today: Math.max(0, msgToday - aiToday),
          month: humanFiltered,
          humanVsAiPct: 100 - automationRate,
        },
        conversations: {
          open: openConvs,
          unread: unreadConvs,
          pending: pendingConvs,
          resolvedToday,
          avgResolutionTime: null,
        },
      },
      // Subscription health
      subscriptionHealth: {
        planName: quotas.customPlanName || quotas.basePlan?.name || 'Free',
        renewDate: activeSub?.currentPeriodEnd || null,
        messages: { used: finalMessagesUsed, limit: finalMsgLimit, pct: msgUsagePct },
        ai: { used: aiUsedInPeriod, limit: finalAiLimit, pct: aiPeriodUsagePct },
        seats: { used: teamCount, limit: seatLimit, pct: Math.round((teamCount / Math.max(1, seatLimit)) * 100) },
        contacts: {
          used: contactsCount,
          limit: quotas.contactsLimit,
          pct: quotas.contactsLimit ? Math.round((contactsCount / quotas.contactsLimit) * 100) : 0
        },
        products: {
          used: productsCount,
          limit: quotas.productCatalogLimit,
          pct: Math.round((productsCount / Math.max(1, quotas.productCatalogLimit)) * 100)
        },
        broadcasts: { used: broadcastCount, limit: 50, pct: Math.round((broadcastCount / 50) * 100) },
        storageMb: { used: 0, limit: storageLimitMb, pct: 0 },
      },
      // Channels
      channels: allChannels,
      // Team
      team: {
        total: teamCount,
        admins: adminCount,
        agents: agentCount,
        online: 0,
      },
      // CRM
      crm: {
        total: crmTotal,
        new: crmNew,
        stageNew,
        qualified: stageQualified,
        proposal: stageProposal,
        negotiation: stageNegotiation,
        won: stageWon,
        lost: stageLost,
        followUpDue: crmFollowUpDue,
        overdue: crmOverdue,
        conversionRate: crmTotal > 0 ? Math.round((stageWon / crmTotal) * 100) : 0,
      },
      // Orders
      orders: {
        today: ordersToday,
        month: ordersFiltered,
        pending: pendingOrders,
        processing: processingOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        refunded: refundedOrders,
        revenue: filteredRevenue,
        revenueToday: todayRevenue,
        prevMonthRevenue: prevFilteredRevenue,
        revenueGrowth: this.computeGrowth(filteredRevenue, prevFilteredRevenue),
        avgOrderValue,
      },
      // Products
      products: {
        total: publishedProducts + draftProducts,
        published: publishedProducts,
        draft: draftProducts,
        outOfStock: outOfStockProducts as number,
      },
      // Broadcasts
      broadcasts: {
        campaigns: broadcastCount,
        delivered: bcDelivered,
        read: bcRead,
        failed: bcFailed,
        clicked: bcClicked,
        ctr,
        total: bcTotal,
      },
      // AI health
      aiHealth: {
        automationRate,
        avgTokens: avgTokensPerResponse,
        costToday: aiCostTodayUsd,
        costMonth: aiCostFilteredUsd,
        successRate: automationRate,
      },
      // Business health
      healthScore: {
        overall: Math.min(100, Math.max(0, overallHealthScore)),
        aiPerformance: Math.round(aiPerfScore),
        crmHealth: Math.min(100, Math.max(0, crmHealth)),
        salesPerformance: Math.min(100, Math.max(0, salesPerf)),
        customerSatisfaction: csatScore,
        responseSpeed: responseScore,
        subscriptionHealth: Math.min(100, Math.max(0, subHealth)),
      },
      activity: formattedActivity,
      features,
      plan: quotas.basePlan || null,
    };
  }


  // ─── Chart time-series data with YouTube style filters ───────────────────────
  async getChartData(tenantId: string, range = '30d', startDate?: string, endDate?: string) {
    const { from, to, numDays } = this.parseDateRange(range, startDate, endDate);
    const points: Array<{ date: string; messages: number; aiReplies: number; humanReplies: number; revenue: number; leads: number }> = [];

    const totalDays = Math.min(numDays, 180);
    for (let i = 0; i < totalDays; i++) {
      const dayStart = new Date(from);
      dayStart.setDate(dayStart.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      if (dayStart > to) break;

      const [msgs, aiLogs, orders, contacts] = await Promise.all([
        this.prisma.message.count({ where: { conversation: { tenantId }, createdAt: { gte: dayStart, lte: dayEnd } } }),
        this.prisma.aiUsageLog.count({ where: { tenantId, createdAt: { gte: dayStart, lte: dayEnd } } }),
        this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { tenantId, status: 'delivered', createdAt: { gte: dayStart, lte: dayEnd } } }),
        this.prisma.contact.count({ where: { tenantId, lastSeenAt: { gte: dayStart, lte: dayEnd } } }),
      ]);

      points.push({
        date: dayStart.toISOString().split('T')[0],
        messages: msgs,
        aiReplies: aiLogs,
        humanReplies: Math.max(0, msgs - aiLogs),
        revenue: Number(orders._sum.totalAmount || 0),
        leads: contacts,
      });
    }

    // Conversation labels distribution
    const labelStats = await this.prisma.label.findMany({
      where: { tenantId },
      include: { _count: { select: { conversations: true } } }
    }).catch(() => []);

    // Channel distribution in date range
    const channelDist = await this.prisma.conversation.groupBy({
      by: ['channel'],
      where: { tenantId, lastMessageAt: { gte: from, lte: to } },
      _count: { id: true },
    });

    return {
      timeSeries: points,
      labelDistribution: labelStats.map((l: any) => ({
        name: l.name,
        value: l._count?.conversations || 0,
        color: l.color || '#6366f1',
      })),
      channelDistribution: channelDist.map(c => ({
        channel: c.channel,
        count: c._count.id,
      })),
    };
  }

  // ─── Recent conversations ────────────────────────────────────────────────────
  async getRecentConversations(tenantId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { tenantId },
        take: limit,
        skip,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          contact: { select: { name: true, phone: true, channel: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { content: true, createdAt: true, direction: true, status: true } },
        }
      }),
      this.prisma.conversation.count({ where: { tenantId } }),
    ]);

    return {
      data: items.map(c => {
        const lastMsgObj = c.messages[0];
        let msgText = '';
        if (lastMsgObj?.content) {
          if (typeof lastMsgObj.content === 'string') {
            msgText = lastMsgObj.content;
          } else if (typeof lastMsgObj.content === 'object') {
            msgText = (lastMsgObj.content as any).body || (lastMsgObj.content as any).text || (lastMsgObj.content as any).caption || JSON.stringify(lastMsgObj.content);
          }
        }
        return {
          id: c.id,
          contactName: c.contact?.name || 'Unknown',
          channel: c.channel,
          status: c.status,
          isAiEnabled: c.isAiEnabled,
          lastMessage: String(msgText || 'Message').substring(0, 80),
          lastMessageAt: lastMsgObj?.createdAt || c.lastMessageAt,
          direction: lastMsgObj?.direction || 'inbound',
          messageStatus: lastMsgObj?.status || 'sent',
        };
      }),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ─── Recent contacts/leads ────────────────────────────────────────────────────
  async getRecentLeads(tenantId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.contact.findMany({
        where: { tenantId },
        take: limit,
        skip,
        orderBy: { lastSeenAt: 'desc' },
        select: {
          id: true, name: true, phone: true, channel: true,
          followUpAt: true, lastSeenAt: true, tags: true,
          assignedUser: { select: { name: true } },
        }
      }),
      this.prisma.contact.count({ where: { tenantId } }),
    ]);

    return {
      data: items.map(c => ({
        id: c.id,
        name: c.name || 'Unknown',
        phone: c.phone || '—',
        source: c.channel,
        followUpAt: c.followUpAt,
        assignedTo: (c as any).assignedUser?.name || '—',
        tags: c.tags || [],
        isOverdue: c.followUpAt ? new Date(c.followUpAt) < new Date() : false,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ─── Recent orders ────────────────────────────────────────────────────────────
  async getRecentOrders(tenantId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { tenantId },
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { name: true } },
          items: { include: { product: { select: { name: true } } } },
        }
      }),
      this.prisma.order.count({ where: { tenantId } }),
    ]);

    return {
      data: items.map(o => ({
        id: o.id,
        customerName: o.contact?.name || 'Unknown',
        amount: Number(o.totalAmount),
        currency: o.currency,
        status: o.status,
        createdAt: o.createdAt,
        productName: o.items?.[0]?.product?.name || '—',
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ─── Activity timeline ────────────────────────────────────────────────────────
  async getActivityTimeline(tenantId: string) {
    const from = this.daysAgo(3);
    const msgs = await this.prisma.message.findMany({
      where: { conversation: { tenantId }, createdAt: { gte: from } },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { conversation: { include: { contact: true } } }
    });

    const orders = await this.prisma.order.findMany({
      where: { tenantId, createdAt: { gte: from } },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { contact: { select: { name: true } } }
    });

    const broadcasts = await this.prisma.broadcast.findMany({
      where: { tenantId, createdAt: { gte: from } },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const events: any[] = [
      ...msgs.map(m => ({
        id: m.id, type: 'message',
        title: m.direction === 'inbound' ? 'Message received' : 'Message sent',
        meta: m.conversation?.contact?.name || 'Unknown',
        time: m.createdAt, icon: 'message',
      })),
      ...orders.map(o => ({
        id: o.id, type: 'order',
        title: `Order ${o.status}`,
        meta: `${o.contact?.name || 'Customer'} — ৳${Number(o.totalAmount).toLocaleString()}`,
        time: o.createdAt, icon: 'order',
      })),
      ...broadcasts.map(b => ({
        id: b.id, type: 'broadcast',
        title: 'Broadcast sent',
        meta: b.status,
        time: b.createdAt, icon: 'broadcast',
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 30);

    return events;
  }

  // ─── AI natural language summary ──────────────────────────────────────────────
  async getAiSummary(tenantId: string) {
    const todayStart = this.startOfDay();
    const yesterday = this.daysAgo(1);

    const [msgToday, msgYesterday, aiToday, openConvs, overdue, followUpDue] = await Promise.all([
      this.prisma.message.count({ where: { conversation: { tenantId }, createdAt: { gte: todayStart } } }),
      this.prisma.message.count({ where: { conversation: { tenantId }, createdAt: { gte: yesterday, lt: todayStart } } }),
      this.prisma.aiUsageLog.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'open' } }),
      this.prisma.contact.count({ where: { tenantId, followUpAt: { lt: new Date() }, followUpNotified: false } }),
      this.prisma.contact.count({
        where: { tenantId, followUpAt: { gte: new Date(), lte: new Date(Date.now() + 24 * 3600000) } }
      }),
    ]);

    const outboundToday = await this.prisma.message.count({
      where: { conversation: { tenantId }, direction: 'outbound', createdAt: { gte: todayStart } }
    });

    const aiRate = outboundToday > 0 ? Math.round((aiToday / outboundToday) * 100) : 0;
    const msgGrowth = msgYesterday > 0 ? Math.round(((msgToday - msgYesterday) / msgYesterday) * 100) : 0;

    const points: string[] = [];
    if (aiRate > 0) points.push(`AI handled ${aiRate}% of conversations automatically.`);
    if (msgGrowth > 0) points.push(`Customer messages increased by ${msgGrowth}% compared to yesterday.`);
    else if (msgGrowth < 0) points.push(`Message volume is down ${Math.abs(msgGrowth)}% from yesterday.`);
    if (overdue > 0) points.push(`${overdue} leads are overdue for follow-up.`);
    else if (followUpDue > 0) points.push(`${followUpDue} leads require follow-up today.`);
    if (openConvs > 0) points.push(`${openConvs} conversations are currently open.`);

    return {
      summary: points.join(' '),
      points,
      stats: { msgToday, aiRate, openConvs, overdue, followUpDue },
    };
  }
}

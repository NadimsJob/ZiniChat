import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── TENANTS ──────────────────────────────────────────────────────────────
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      newTenantsThisMonth,
      onboardedTenants,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'active' } }),
      this.prisma.tenant.count({ where: { status: 'suspended' } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.tenant.count({ where: { isOnboarded: true } }),
    ]);

    // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
    const [activeSubscriptions, trialSubscriptions, expiredSubscriptions] =
      await Promise.all([
        this.prisma.subscription.count({ where: { status: 'active' } }),
        this.prisma.subscription.count({ where: { status: 'trial' } }),
        this.prisma.subscription.count({ where: { status: 'expired' } }),
      ]);

    // Revenue by plan
    const planRevenue = await this.prisma.plan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        subscriptions: {
          where: { status: 'active' },
          select: { id: true },
        },
      },
    });

    const subscriptionsByPlan = planRevenue.map((p) => ({
      name: p.name,
      count: p.subscriptions.length,
    }));

    // ── REVENUE ───────────────────────────────────────────────────────────────
    const [totalRevenueAgg, monthRevenueAgg, lastMonthRevenueAgg] =
      await Promise.all([
        this.prisma.payment.aggregate({
          _sum: { amountBdt: true },
          where: { status: 'success' },
        }),
        this.prisma.payment.aggregate({
          _sum: { amountBdt: true },
          where: { status: 'success', createdAt: { gte: startOfMonth } },
        }),
        this.prisma.payment.aggregate({
          _sum: { amountBdt: true },
          where: {
            status: 'success',
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
        }),
      ]);

    const totalRevenue = Number(totalRevenueAgg._sum.amountBdt || 0);
    const monthRevenue = Number(monthRevenueAgg._sum.amountBdt || 0);
    const lastMonthRevenue = Number(lastMonthRevenueAgg._sum.amountBdt || 0);
    const revenueGrowth =
      lastMonthRevenue > 0
        ? (((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
        : null;

    // Revenue trend: last 6 months
    const revenueTrend = await this.getRevenueTrend(6);

    // ── CONVERSATIONS & MESSAGES ──────────────────────────────────────────────
    const [
      totalConversations,
      openConversations,
      closedConversations,
      totalMessages,
    ] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.conversation.count({ where: { status: 'open' } }),
      this.prisma.conversation.count({ where: { status: 'closed' } }),
      this.prisma.message.count(),
    ]);

    const messageTrend = await this.getMessageTrend(7);

    // ── AI USAGE ─────────────────────────────────────────────────────────────
    const [totalAiAgg, monthAiAgg] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({ _sum: { tokensUsed: true } }),
      this.prisma.aiUsageLog.aggregate({
        _sum: { tokensUsed: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    const totalAiTokens = totalAiAgg._sum.tokensUsed || 0;
    const monthAiTokens = monthAiAgg._sum.tokensUsed || 0;

    // AI usage trend: last 7 days
    const aiTrend = await this.getAiTrend(7);

    // Top 5 tenants by AI token usage
    const topAiTenants = await this.prisma.aiUsageLog.groupBy({
      by: ['tenantId'],
      _sum: { tokensUsed: true },
      orderBy: { _sum: { tokensUsed: 'desc' } },
      take: 5,
    });

    // ── CHANNELS ─────────────────────────────────────────────────────────────
    const channelCounts = await this.prisma.channelConnection.groupBy({
      by: ['channelType'],
      _count: { id: true },
    });

    const totalChannels = await this.prisma.channelConnection.count();
    const activeChannels = await this.prisma.channelConnection.count({
      where: { status: 'active' },
    });

    const channelDistribution = channelCounts.map((c) => ({
      name: c.channelType,
      count: c._count.id,
    }));

    // ── CONTACTS ──────────────────────────────────────────────────────────────
    const totalContacts = await this.prisma.contact.count();
    const newContactsThisMonth = await this.prisma.contact.count({
      where: { lastSeenAt: { gte: startOfMonth } },
    });

    // ── TICKETS ───────────────────────────────────────────────────────────────
    const [openTickets, resolvedTickets, pendingTickets] = await Promise.all([
      this.prisma.ticket.count({ where: { status: 'open' } }),
      this.prisma.ticket.count({ where: { status: 'resolved' } }),
      this.prisma.ticket.count({ where: { status: 'pending' } }),
    ]);
    const totalTickets = openTickets + resolvedTickets + pendingTickets;

    // ── TEAM ──────────────────────────────────────────────────────────────────
    const [totalAgents, totalUsers] = await Promise.all([
      this.prisma.user.count({
        where: { role: { in: ['agent', 'admin', 'owner'] }, tenantId: { not: null } },
      }),
      this.prisma.user.count({ where: { tenantId: { not: null } } }),
    ]);

    // ── PRODUCTS & ORDERS ─────────────────────────────────────────────────────
    const [totalProducts, totalOrders, orderRevenueAgg] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.order.count(),
      this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
    ]);
    const orderRevenue = Number(orderRevenueAgg._sum.totalAmount || 0);

    // ── BROADCASTS & AUTOMATIONS ──────────────────────────────────────────────
    const [totalBroadcasts, totalAutomations] = await Promise.all([
      this.prisma.broadcast.count(),
      this.prisma.automation.count({ where: { isActive: true } }),
    ]);

    // ── TOP TENANTS BY MESSAGE COUNT ──────────────────────────────────────────
    const topTenantsByMessages = await this.prisma.tenant.findMany({
      orderBy: { messageCount: 'desc' },
      take: 6,
      select: { id: true, businessName: true, brandName: true, messageCount: true },
    });

    // ── RECENT AUDIT LOGS ─────────────────────────────────────────────────────
    const recentAuditLogs = await this.prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: { select: { name: true, email: true, role: true } },
        targetTenant: { select: { businessName: true } },
      },
    });

    // ── NEW TENANTS TREND (last 7 days) ───────────────────────────────────────
    const newTenantsTrend = await this.getNewTenantsTrend(7);

    return {
      // Tenants
      totalTenants,
      activeTenants,
      suspendedTenants,
      newTenantsThisMonth,
      onboardedTenants,
      newTenantsTrend,

      // Subscriptions
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      subscriptionsByPlan,

      // Revenue
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      revenueGrowth,
      revenueTrend,

      // Conversations & Messages
      totalConversations,
      openConversations,
      closedConversations,
      totalMessages,
      messageTrend,

      // AI
      totalAiTokens,
      monthAiTokens,
      aiTrend,
      topAiTenants,

      // Channels
      totalChannels,
      activeChannels,
      channelDistribution,

      // Contacts
      totalContacts,
      newContactsThisMonth,

      // Tickets
      openTickets,
      resolvedTickets,
      pendingTickets,
      totalTickets,

      // Team
      totalAgents,
      totalUsers,

      // Commerce
      totalProducts,
      totalOrders,
      orderRevenue,

      // Engagement
      totalBroadcasts,
      totalAutomations,

      // Top lists
      topTenantsByMessages,

      // Activity
      recentAuditLogs,
    };
  }

  // ── HELPERS ────────────────────────────────────────────────────────────────

  private async getRevenueTrend(months: number) {
    const result = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const agg = await this.prisma.payment.aggregate({
        _sum: { amountBdt: true },
        where: { status: 'success', createdAt: { gte: start, lte: end } },
      });
      result.push({
        month: start.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
        revenue: Number(agg._sum.amountBdt || 0),
      });
    }
    return result;
  }

  private async getMessageTrend(days: number) {
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const [msgs, convs] = await Promise.all([
        this.prisma.message.count({ where: { createdAt: { gte: start, lte: end } } }),
        this.prisma.conversation.count({ where: { lastMessageAt: { gte: start, lte: end } } }),
      ]);

      result.push({
        day: start.toLocaleString('en-US', { weekday: 'short', day: 'numeric' }),
        messages: msgs,
        conversations: convs,
      });
    }
    return result;
  }

  private async getAiTrend(days: number) {
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const agg = await this.prisma.aiUsageLog.aggregate({
        _sum: { tokensUsed: true },
        where: { createdAt: { gte: start, lte: end } },
      });
      result.push({
        day: start.toLocaleString('en-US', { weekday: 'short', day: 'numeric' }),
        tokens: agg._sum.tokensUsed || 0,
      });
    }
    return result;
  }

  private async getNewTenantsTrend(days: number) {
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const count = await this.prisma.tenant.count({
        where: { createdAt: { gte: start, lte: end } },
      });
      result.push({
        day: start.toLocaleString('en-US', { weekday: 'short', day: 'numeric' }),
        tenants: count,
      });
    }
    return result;
  }
}

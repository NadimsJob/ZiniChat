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

  async getDashboardOverview(tenantId: string) {
    // 1. Get active billing period (subscription-based, not calendar month)
    const { periodStart, messageQuota, aiQuota, subscription: activeSubscription } =
      await this.billingService.getActivePeriod(tenantId);

    // Also fetch tenant for custom overrides
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const finalMsgLimit = tenant?.customMessageQuota ?? messageQuota;
    const finalAiLimit = tenant?.customAiQuota ?? aiQuota;

    // 2. Messages Used in current billing period (outbound + broadcasts)
    const messagesUsed = await this.quotaService.getMessageUsage(tenantId, periodStart);

    // 3. AI Responses Used in current billing period
    const aiUsed = await this.prisma.aiUsageLog.count({
      where: {
        tenantId,
        createdAt: { gte: periodStart }
      }
    });

    // 4. Leads (CRM)
    const activeLeads = await this.prisma.contact.count({ where: { tenantId } });
    const newLeads = await this.prisma.contact.count({
      where: { tenantId, lastSeenAt: { gte: periodStart } }
    });

    // 5. E-commerce Orders & Revenue
    const pendingOrders = await this.prisma.order.count({ where: { tenantId, status: 'pending' } });
    const completedOrders = await this.prisma.order.count({ where: { tenantId, status: 'completed' } });

    const revenueAgg = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { tenantId, status: 'completed', createdAt: { gte: periodStart } }
    });
    const monthlyRevenue = Number(revenueAgg._sum.totalAmount || 0);

    const totalProducts = await this.prisma.product.count({ where: { tenantId, isActive: true } });

    // 6. Recent Activity (Latest 5 Messages)
    const recentMessages = await this.prisma.message.findMany({
      where: { conversation: { tenantId } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { conversation: { include: { contact: true } } }
    });

    const formattedActivity = recentMessages.map(msg => {
      const contentStr = String(msg.content || '');
      return {
        id: msg.id,
        type: 'message',
        title: msg.direction === 'inbound' ? 'Message received' : 'Message sent',
        description: contentStr.substring(0, 50) + (contentStr.length > 50 ? '...' : ''),
        time: msg.createdAt,
        contactName: msg.conversation?.contact?.name || 'Unknown'
      };
    });

    return {
      messages: {
        used: messagesUsed,
        limit: finalMsgLimit,
        percentage: Math.min(100, Math.round((messagesUsed / finalMsgLimit) * 100)),
        periodStart,
      },
      leads: {
        total: activeLeads,
        newThisMonth: newLeads
      },
      orders: {
        pending: pendingOrders,
        completed: completedOrders,
        revenue: monthlyRevenue,
        totalProducts: totalProducts
      },
      aiQuota: {
        used: aiUsed,
        limit: finalAiLimit,
        percentage: Math.min(100, Math.round((aiUsed / finalAiLimit) * 100))
      },
      activity: formattedActivity,
      features: activeSubscription?.plan?.features || [],
      plan: activeSubscription?.plan || null
    };
  }
}


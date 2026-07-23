import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantStatsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardOverview(tenantId: string) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // 1. Messages Usage (current month)
    const totalMessages = await this.prisma.message.count({
      where: {
        conversation: { tenantId },
        createdAt: { gte: startOfMonth }
      }
    });

    // 2. Leads (CRM)
    const activeLeads = await this.prisma.contact.count({
      where: { tenantId }
    });
    
    const newLeads = await this.prisma.contact.count({
      where: { tenantId, lastSeenAt: { gte: startOfMonth } }
    });

    // 3. E-commerce Orders & Revenue
    const pendingOrders = await this.prisma.order.count({
      where: { tenantId, status: 'pending' }
    });
    
    const completedOrders = await this.prisma.order.count({
      where: { tenantId, status: 'completed' }
    });

    const revenueAgg = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { tenantId, status: 'completed', createdAt: { gte: startOfMonth } }
    });
    const monthlyRevenue = Number(revenueAgg._sum.totalAmount || 0);

    const totalProducts = await this.prisma.product.count({
      where: { tenantId, isActive: true }
    });

    // 4. AI & Subscription Quotas
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
        currentPeriodEnd: { gt: new Date() }
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' }
    });

    const aiLimit = activeSubscription?.plan?.aiQuota || 50;
    const msgLimit = activeSubscription?.plan?.messageQuota || 100;

    const aiUsed = await this.prisma.aiUsageLog.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth }
      }
    });

    // 5. Recent Activity (Latest 5 Messages)
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
        total: totalMessages, 
        used: totalMessages,
        limit: msgLimit,
        percentage: Math.min(100, Math.round((totalMessages / msgLimit) * 100))
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
        limit: aiLimit,
        percentage: Math.min(100, Math.round((aiUsed / aiLimit) * 100))
      },
      activity: formattedActivity,
      features: activeSubscription?.plan?.features || [],
      plan: activeSubscription?.plan || null
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantStatsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardOverview(tenantId: string) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // 1. Total Messages (current month)
    const totalMessages = await this.prisma.message.count({
      where: {
        conversation: { tenantId },
        createdAt: { gte: startOfMonth }
      }
    });

    // 2. Total Leads (Active contacts)
    const activeLeads = await this.prisma.contact.count({
      where: { tenantId }
    });

    // 3. Pending Orders
    const pendingOrders = await this.prisma.order.count({
      where: {
        tenantId,
        status: 'pending'
      }
    });

    // 4. AI Usage
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

    return {
      messages: { 
        total: totalMessages, // keep this for backward compatibility
        used: totalMessages,
        limit: msgLimit,
        percentage: Math.min(100, Math.round((totalMessages / msgLimit) * 100))
      },
      leads: { total: activeLeads },
      orders: { pending: pendingOrders },
      aiQuota: {
        used: aiUsed,
        limit: aiLimit,
        percentage: Math.min(100, Math.round((aiUsed / aiLimit) * 100))
      },
      features: activeSubscription?.plan?.features || []
    };
  }
}

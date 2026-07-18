import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const totalTenants = await this.prisma.tenant.count();
    const totalConversations = await this.prisma.conversation.count();
    
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { status: 'active' },
    });

    const totalRevenue = await this.prisma.payment.aggregate({
      _sum: { amountBdt: true },
      where: { status: 'success' },
    });

    const aiUsage = await this.prisma.aiUsageLog.aggregate({
      _sum: { tokensUsed: true },
    });

    return {
      totalTenants,
      totalConversations,
      activeSubscriptions,
      totalRevenue: totalRevenue._sum.amountBdt || 0,
      totalAiTokens: aiUsage._sum.tokensUsed || 0,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserPresenceService {
  constructor(private prisma: PrismaService) {}

  async updatePresence(userId: string, status: string) {
    const validStatuses = ['available', 'busy', 'away', 'offline'];
    const finalStatus = validStatuses.includes(status) ? status : 'available';

    return (this.prisma as any).userPresence.upsert({
      where: { userId },
      update: { status: finalStatus },
      create: { userId, status: finalStatus },
    });
  }

  async getTeamPresence(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        role: true,
        profilePicUrl: true,
        presence: true,
      },
    });

    return users.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      profilePicUrl: u.profilePicUrl,
      status: u.presence?.status || 'offline',
      updatedAt: u.presence?.updatedAt || null,
    }));
  }
}

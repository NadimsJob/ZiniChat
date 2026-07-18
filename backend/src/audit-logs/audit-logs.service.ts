import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async getLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        actorUser: true,
        targetTenant: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 logs
    });
  }
}

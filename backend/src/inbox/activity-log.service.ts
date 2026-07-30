import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordActivityInput {
  tenantId: string;
  conversationId: string;
  contactId?: string;
  type: string; // ASSIGNED, LABEL_ADDED, LABEL_REMOVED, NOTE_ADDED, ORDER_CREATED, TICKET_CREATED, RESOLVED, REOPENED, ARCHIVED, AI_HANDOVER, STARRED, COLLABORATOR_ADDED, FOLLOW_UP_FLAGGED
  actorUserId?: string;
  metadataJson?: any;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private prisma: PrismaService) {}

  async record(data: RecordActivityInput) {
    try {
      return await (this.prisma as any).conversationActivity.create({
        data: {
          tenantId: data.tenantId,
          conversationId: data.conversationId,
          contactId: data.contactId || null,
          type: data.type,
          actorUserId: data.actorUserId || null,
          metadataJson: data.metadataJson || null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record conversation activity: ${error.message}`, error.stack);
      // Append-only logger shouldn't break main execution flow
      return null;
    }
  }

  async getActivityForConversation(tenantId: string, conversationId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      (this.prisma as any).conversationActivity.findMany({
        where: { tenantId, conversationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      (this.prisma as any).conversationActivity.count({
        where: { tenantId, conversationId },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

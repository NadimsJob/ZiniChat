import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeadsCronService {
  private readonly logger = new Logger(LeadsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleFollowUpNotifications() {
    this.logger.log('Checking for pending follow-ups...');
    
    const now = new Date();

    const pendingLeads = await this.prisma.contact.findMany({
      where: {
        followUpAt: { lte: now },
        followUpNotified: false
      },
      include: {
        assignedUser: true,
        tenant: true
      }
    });

    if (pendingLeads.length > 0) {
      this.logger.log(`Found ${pendingLeads.length} leads requiring follow-up notifications.`);
      
      for (const lead of pendingLeads) {
        let targetUserId = lead.assignedUserId;

        if (targetUserId) {
          // Verify if the explicitly assigned user actually belongs to this tenant
          // Prevents superadmins who created test leads from receiving notifications
          const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
          if (!user || user.tenantId !== lead.tenantId) {
             targetUserId = null; // Fallback to notifying the tenant owner
          }
        }

        // If no user is explicitly assigned (or invalid), notify the tenant owner/admin
        if (!targetUserId) {
          const owner = await this.prisma.user.findFirst({
            where: { tenantId: lead.tenantId, role: { in: ['owner', 'admin'] } }
          });
          targetUserId = owner?.id || null;
        }

        if (targetUserId) {
          const message = `It's time to follow up with ${lead.name || lead.externalContactId}.`;
          await this.notificationsService.createNotification(
            targetUserId,
            'Lead Follow-up Due',
            message,
            'info'
          );

          await this.prisma.contact.update({
            where: { id: lead.id },
            data: { followUpNotified: true }
          });
        }
      }
    }
  }
}

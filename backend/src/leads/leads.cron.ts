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
        const targetUserIds: string[] = [];

        if (lead.assignedUserId) {
          const user = await this.prisma.user.findUnique({ where: { id: lead.assignedUserId } });
          if (user && user.tenantId === lead.tenantId) {
            targetUserIds.push(lead.assignedUserId);
          }
        }

        if (targetUserIds.length === 0) {
          const admins = await this.prisma.user.findMany({
            where: { tenantId: lead.tenantId, role: { in: ['owner', 'admin'] } }
          });
          targetUserIds.push(...admins.map(a => a.id));
        }

        if (targetUserIds.length > 0) {
          const message = `It's time to follow up with ${lead.name || lead.externalContactId}.`;
          for (const uid of targetUserIds) {
            await this.notificationsService.createNotification(
              uid,
              'Lead Follow-up Due',
              message,
              'info'
            ).catch(() => {});
          }

          await this.prisma.contact.update({
            where: { id: lead.id },
            data: { followUpNotified: true }
          });
        }
      }
    }
  }
}

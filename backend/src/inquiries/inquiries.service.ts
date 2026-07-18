import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmtpService } from '../smtp/smtp.service';

@Injectable()
export class InquiriesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private smtp: SmtpService
  ) {}

  async createInquiry(data: { name: string; email: string; message: string }) {
    const inquiry = await this.prisma.siteInquiry.create({
      data: {
        name: data.name,
        email: data.email,
        message: data.message,
      },
    });

    // Notify superadmins via web notification
    await this.notifications.createSystemNotificationForSuperadmins(
      'New Contact Inquiry',
      `${data.name} just submitted a new contact inquiry.`,
      'info'
    );

    // Trigger Email
    await this.smtp.triggerNewInquiryEmail(data.name, data.email, data.message);

    return { success: true, inquiry };
  }

  async getInquiries() {
    return this.prisma.siteInquiry.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateInquiryStatus(id: string, status: string) {
    return this.prisma.siteInquiry.update({
      where: { id },
      data: { status },
    });
  }
}

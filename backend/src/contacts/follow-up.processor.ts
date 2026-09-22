import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InboxService } from '../inbox/inbox.service';
import { QuotaService } from '../tenants/quota.service';

@Processor('follow-up')
export class FollowUpProcessor extends WorkerHost {
  private readonly logger = new Logger(FollowUpProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxService: InboxService,
    private readonly quotaService: QuotaService,
  ) {
    super();
  }

  async process(job: Job<{ contactId: string }>): Promise<any> {
    const { contactId } = job.data;
    this.logger.log(`Processing automated follow-up job for contact ${contactId}`);

    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      this.logger.warn(`Contact ${contactId} not found for automated follow-up`);
      return;
    }

    if (contact.automatedFollowUpSent) {
      this.logger.log(`Automated follow-up already sent for contact ${contactId}`);
      return;
    }

    if (!contact.automatedFollowUpMessage) {
      this.logger.log(`No automated follow-up message set for contact ${contactId}`);
      return;
    }

    // Check if tenant is suspended
    const tenant = await this.prisma.tenant.findUnique({ where: { id: contact.tenantId } });
    if (tenant?.status === 'suspended') {
      this.logger.warn(`Tenant ${contact.tenantId} is suspended. Skipping automated follow-up for contact ${contactId}`);
      return;
    }

    // Find the latest active/open conversation for this contact
    let latestConv = await this.prisma.conversation.findFirst({
      where: { contactId: contact.id, status: 'open' },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (!latestConv) {
      // Fallback: any conversation for this contact
      latestConv = await this.prisma.conversation.findFirst({
        where: { contactId: contact.id },
        orderBy: { lastMessageAt: 'desc' },
      });
    }

    if (!latestConv) {
      this.logger.warn(`No conversation found for contact ${contact.id} to send automated follow-up`);
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: { automatedFollowUpSent: true },
      });
      return;
    }

    try {
      // Deduct quotas
      await this.quotaService.checkMessageQuota(contact.tenantId);
      await this.quotaService.checkAiQuota(contact.tenantId);

      const quotaLogId = await this.quotaService.reserveAiResponseUnits(
        contact.tenantId,
        1,
        'Automated Follow-up',
        contact.id,
      );
      await this.quotaService.commitReservedUnits(quotaLogId);

      // Get the AI Assistant for attribution if exists
      const aiAssistant = await this.prisma.aiAssistant.findFirst({
        where: { tenantId: contact.tenantId },
      });

      await this.inboxService.saveOutboundMessage(
        contact.tenantId,
        latestConv.id,
        contact.automatedFollowUpMessage,
        'text',
        aiAssistant?.id || undefined,
      );

      await this.prisma.contact.update({
        where: { id: contact.id },
        data: { automatedFollowUpSent: true },
      });

      this.logger.log(`Successfully sent automated follow-up to contact ${contact.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to process automated follow-up for contact ${contact.id}: ${error.message}`);
      throw error;
    }
  }
}

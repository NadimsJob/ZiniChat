import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InboxService } from '../inbox/inbox.service';
import { CapiHubService } from '../capi-hub/capi-hub.service';

export interface CreateWidgetDto {
  type: 'LIVE_CHAT' | 'WHATSAPP';
  name: string;
  domain?: string;
  primaryColor?: string;
  heading?: string;
  tagline?: string;
  greetingEnabled?: boolean;
  whatsappInboxId?: string;
  whatsappNumber?: string;
  prefilledText?: string;
  customIconUrl?: string | null;
  position?: 'bottom-right' | 'bottom-left';
  tooltipTextEn?: string;
  tooltipTextBn?: string;
  requireLeadCapture?: boolean;
  leadCaptureFields?: string;
}

@Injectable()
export class WebsiteWidgetService implements OnModuleInit {
  private readonly logger = new Logger(WebsiteWidgetService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => InboxService))
    private readonly inboxService: InboxService,
    private readonly capiHubService: CapiHubService,
  ) {}

  async onModuleInit() {
    try {
      const deleted = await this.prisma.websiteWidget.deleteMany({
        where: { isActive: false },
      });
      if (deleted.count > 0) {
        this.logger.log(`Hard-deleted ${deleted.count} inactive website widgets to prevent DB bloat.`);
      }
    } catch (err) {
      this.logger.warn(`Failed to clean up inactive website widgets on init: ${err.message}`);
    }
  }

  // ─── Quota check helper ──────────────────────────────────────────────────────
  private async getWidgetQuota(tenantId: string): Promise<{
    limit: number;
    current: number;
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'trialing'] },
        currentPeriodEnd: { gt: new Date() },
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    const planLimit = activeSub?.plan?.websiteWidgetLimit ?? 0;
    const limit = tenant.customWebsiteWidgetLimit ?? planLimit;

    const current = await this.prisma.websiteWidget.count({
      where: { tenantId, isActive: true },
    });

    return { limit, current };
  }

  // ─── Create Widget ───────────────────────────────────────────────────────────
  async createWidget(tenantId: string, dto: CreateWidgetDto) {
    const quota = await this.getWidgetQuota(tenantId);
    if (quota.current >= quota.limit) {
      throw new ForbiddenException(
        `Website widget limit reached (${quota.current}/${quota.limit}). Please upgrade your plan or purchase an addon to add more widgets.`,
      );
    }

    let resolvedPhoneNumber = dto.whatsappNumber;

    // Validate WHATSAPP type requires a connected inbox or explicit phone number
    if (dto.type === 'WHATSAPP') {
      if (!dto.whatsappInboxId && !dto.whatsappNumber) {
        throw new BadRequestException(
          'A connected WhatsApp inbox ID or phone number is required. WhatsApp inbox ID is required for WhatsApp website widget.',
        );
      }

      if (dto.whatsappInboxId) {
        const inbox = await this.prisma.channelConnection.findFirst({
          where: {
            id: dto.whatsappInboxId,
            tenantId,
            channelType: 'whatsapp',
            status: { in: ['active', 'connected'] },
          },
        });
        if (!inbox) {
          throw new NotFoundException(
            'No active WhatsApp inbox found with that ID for this tenant.',
          );
        }
        if (inbox.phoneNumber) {
          resolvedPhoneNumber = resolvedPhoneNumber || inbox.phoneNumber;
        }
      }
    }

    return this.prisma.websiteWidget.create({
      data: {
        tenantId,
        type: dto.type,
        name: dto.name,
        domain: dto.domain ?? null,
        primaryColor: dto.primaryColor ?? '#1F824A',
        heading: dto.heading ?? 'Chat with us',
        tagline: dto.tagline ?? 'We are here to help you.',
        greetingEnabled: dto.greetingEnabled ?? false,
        whatsappInboxId: dto.whatsappInboxId ?? null,
        whatsappNumber: resolvedPhoneNumber ?? null,
        prefilledText: dto.prefilledText ?? null,
        customIconUrl: dto.customIconUrl ?? null,
        position: dto.position ?? 'bottom-right',
        tooltipTextEn: dto.tooltipTextEn ?? 'Chat with us on WhatsApp',
        tooltipTextBn: dto.tooltipTextBn ?? 'হোয়াটসঅ্যাপে চ্যাট করুন',
        requireLeadCapture: dto.requireLeadCapture ?? false,
        leadCaptureFields: dto.leadCaptureFields ?? 'name,phone,email',
      },
    });
  }

  // ─── List Widgets ────────────────────────────────────────────────────────────
  async getWidgets(tenantId: string) {
    return this.prisma.websiteWidget.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Get by widget token (public — for embed script SDK) ─────────────────────
  async getWidgetByToken(widgetToken: string) {
    const widget = await this.prisma.websiteWidget.findUnique({
      where: { widgetToken },
      select: {
        id: true,
        widgetToken: true,
        type: true,
        name: true,
        primaryColor: true,
        heading: true,
        tagline: true,
        greetingEnabled: true,
        whatsappInboxId: true,
        whatsappNumber: true,
        prefilledText: true,
        customIconUrl: true,
        position: true,
        tooltipTextEn: true,
        tooltipTextBn: true,
        requireLeadCapture: true,
        leadCaptureFields: true,
        isActive: true,
        tenant: {
          select: {
            id: true,
            businessName: true,
            brandName: true,
          },
        },
      },
    });

    if (!widget || !widget.isActive) {
      throw new NotFoundException('Widget not found or inactive.');
    }

    // If WHATSAPP type and whatsappNumber missing on widget, resolve from linked inbox
    let phoneNumber = widget.whatsappNumber;
    if (widget.type === 'WHATSAPP' && !phoneNumber && widget.whatsappInboxId) {
      const inbox = await this.prisma.channelConnection.findUnique({
        where: { id: widget.whatsappInboxId },
        select: { phoneNumber: true },
      });
      if (inbox?.phoneNumber) {
        phoneNumber = inbox.phoneNumber;
      }
    }

    return {
      ...widget,
      whatsappNumber: phoneNumber,
    };
  }

  // ─── Delete Widget ───────────────────────────────────────────────────────────
  async deleteWidget(tenantId: string, widgetId: string) {
    const widget = await this.prisma.websiteWidget.findFirst({
      where: { id: widgetId, tenantId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found.');
    }

    return this.prisma.websiteWidget.delete({
      where: { id: widgetId },
    });
  }

  // ─── Update Widget Settings ──────────────────────────────────────────────────
  async updateWidget(tenantId: string, widgetId: string, dto: Partial<CreateWidgetDto>) {
    const widget = await this.prisma.websiteWidget.findFirst({
      where: { id: widgetId, tenantId, isActive: true },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found or inactive.');
    }

    let resolvedPhoneNumber = dto.whatsappNumber !== undefined ? dto.whatsappNumber : widget.whatsappNumber;

    if (dto.whatsappInboxId && dto.whatsappInboxId !== widget.whatsappInboxId) {
      const inbox = await this.prisma.channelConnection.findFirst({
        where: {
          id: dto.whatsappInboxId,
          tenantId,
          channelType: 'whatsapp',
        },
      });
      if (inbox?.phoneNumber) {
        resolvedPhoneNumber = resolvedPhoneNumber || inbox.phoneNumber;
      }
    }

    return this.prisma.websiteWidget.update({
      where: { id: widgetId },
      data: {
        name: dto.name ?? widget.name,
        domain: dto.domain !== undefined ? dto.domain : widget.domain,
        primaryColor: dto.primaryColor ?? widget.primaryColor,
        heading: dto.heading ?? widget.heading,
        tagline: dto.tagline ?? widget.tagline,
        greetingEnabled: dto.greetingEnabled !== undefined ? dto.greetingEnabled : widget.greetingEnabled,
        whatsappInboxId: dto.whatsappInboxId !== undefined ? dto.whatsappInboxId : widget.whatsappInboxId,
        whatsappNumber: resolvedPhoneNumber,
        prefilledText: dto.prefilledText !== undefined ? dto.prefilledText : widget.prefilledText,
        customIconUrl: dto.customIconUrl !== undefined ? dto.customIconUrl : widget.customIconUrl,
        position: dto.position ?? widget.position,
        tooltipTextEn: dto.tooltipTextEn ?? widget.tooltipTextEn,
        tooltipTextBn: dto.tooltipTextBn ?? widget.tooltipTextBn,
        requireLeadCapture: dto.requireLeadCapture !== undefined ? dto.requireLeadCapture : widget.requireLeadCapture,
        leadCaptureFields: dto.leadCaptureFields ?? widget.leadCaptureFields,
      },
    });
  }

  // ─── Get quota info (for billing endpoint) ──────────────────────────────────
  async getQuotaInfo(tenantId: string) {
    return this.getWidgetQuota(tenantId);
  }

  // ─── Public: Fetch visitor messages for polling ─────────────────────────────
  async getVisitorMessages(widgetToken: string, visitorId: string, afterId?: string) {
    if (!widgetToken || !visitorId) {
      throw new BadRequestException('widgetToken and visitorId are required.');
    }

    const widget = await this.prisma.websiteWidget.findFirst({
      where: {
        widgetToken,
        isActive: true,
      },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found or inactive.');
    }

    const contact = await this.prisma.contact.findFirst({
      where: {
        tenantId: widget.tenantId,
        externalContactId: visitorId,
      },
    });

    if (!contact) {
      return { messages: [] };
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId: widget.tenantId,
        contactId: contact.id,
        channel: 'website',
      },
    });

    if (!conversation) {
      return { messages: [] };
    }

    let afterMessageCreatedAt: Date | undefined;
    if (afterId) {
      const afterMsg = await this.prisma.message.findUnique({
        where: { id: afterId },
        select: { createdAt: true },
      });
      if (afterMsg) {
        afterMessageCreatedAt = afterMsg.createdAt;
      }
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        ...(afterMessageCreatedAt ? { createdAt: { gt: afterMessageCreatedAt } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return {
      messages: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        senderType: m.senderType,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  // ─── Public: Send message from live chat widget ──────────────────────────────
  async sendVisitorMessage(
    widgetToken: string,
    visitorId: string,
    message: string,
    leadInfo?: { name?: string; phone?: string; email?: string },
  ) {
    if (!widgetToken || !visitorId || !message?.trim()) {
      throw new BadRequestException('widgetToken, visitorId, and message are required.');
    }

    const widget = await this.prisma.websiteWidget.findFirst({
      where: {
        widgetToken,
        isActive: true,
        type: 'LIVE_CHAT',
      },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found or inactive.');
    }

    // 1. Find existing contact
    const existingContact = await this.prisma.contact.findFirst({
      where: { tenantId: widget.tenantId, externalContactId: visitorId },
    });

    // 2. Resolve target contact name
    let contactName = leadInfo?.name?.trim();
    if (!contactName && existingContact?.name && !existingContact.name.startsWith('Website Visitor (')) {
      contactName = existingContact.name;
    }
    if (!contactName) {
      contactName = `Website Visitor (${visitorId.slice(-4)})`;
    }

    const externalMessageId = `widget_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 3. Handle incoming message with resolved contact name
    await this.inboxService.handleIncomingMessage({
      tenantId: widget.tenantId,
      channel: 'website',
      externalContactId: visitorId,
      contactName,
      messageType: 'text',
      content: { body: message.trim() },
      externalMessageId,
      timestamp: new Date(),
    });

    // 4. Update contact with lead info (name, phone, email) if provided
    if (leadInfo) {
      const targetContact = await this.prisma.contact.findFirst({
        where: { tenantId: widget.tenantId, externalContactId: visitorId },
      });

      if (targetContact) {
        const updateData: any = {};
        if (leadInfo.name?.trim()) updateData.name = leadInfo.name.trim();
        if (leadInfo.phone?.trim()) updateData.phone = leadInfo.phone.trim();
        if (leadInfo.email?.trim()) updateData.email = leadInfo.email.trim();

        if (Object.keys(updateData).length > 0) {
          const updatedContact = await this.prisma.contact.update({
            where: { id: targetContact.id },
            data: updateData,
          });

          if (this.inboxService['inboxGateway']) {
            this.inboxService['inboxGateway'].broadcastToTenant(
              widget.tenantId,
              'contact:updated',
              updatedContact,
            );
          }

          // Trigger CAPI Lead Event
          this.capiHubService.fireEvent(widget.tenantId, 'Lead', {
            event_id: `widget_lead_${updatedContact.id}`,
            event_source_url: widget.domain || 'website_widget',
            user_data: {
              em: updatedContact.email || undefined,
              ph: updatedContact.phone || undefined,
              fn: updatedContact.name || undefined
            }
          }, 'website_widget').catch(() => {});
        }
      }
    }

    return { success: true, messageId: externalMessageId };
  }
}

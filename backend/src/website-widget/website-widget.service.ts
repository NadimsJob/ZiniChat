import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}

@Injectable()
export class WebsiteWidgetService {
  constructor(private readonly prisma: PrismaService) {}

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
    const { limit, current } = await this.getWidgetQuota(tenantId);

    if (limit === 0) {
      throw new ForbiddenException(
        'Your plan does not include website widgets. Please upgrade your plan.',
      );
    }

    if (current >= limit) {
      throw new ForbiddenException(
        `Your plan allows ${limit} website widget${limit > 1 ? 's' : ''}. Please upgrade to add more.`,
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
      },
    });
  }

  // ─── Get quota info (for billing endpoint) ──────────────────────────────────
  async getQuotaInfo(tenantId: string) {
    return this.getWidgetQuota(tenantId);
  }
}

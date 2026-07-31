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

    // Validate WHATSAPP type requires a connected inbox
    if (dto.type === 'WHATSAPP') {
      if (!dto.whatsappInboxId) {
        throw new BadRequestException(
          'A connected WhatsApp inbox ID is required for WhatsApp website widget.',
        );
      }
      // Verify the inbox belongs to this tenant and is active
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

    return widget;
  }

  // ─── Delete Widget ───────────────────────────────────────────────────────────
  async deleteWidget(tenantId: string, widgetId: string) {
    const widget = await this.prisma.websiteWidget.findFirst({
      where: { id: widgetId, tenantId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found.');
    }

    return this.prisma.websiteWidget.update({
      where: { id: widgetId },
      data: { isActive: false },
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

    return this.prisma.websiteWidget.update({
      where: { id: widgetId },
      data: {
        name: dto.name ?? widget.name,
        domain: dto.domain !== undefined ? dto.domain : widget.domain,
        primaryColor: dto.primaryColor ?? widget.primaryColor,
        heading: dto.heading ?? widget.heading,
        tagline: dto.tagline ?? widget.tagline,
        greetingEnabled: dto.greetingEnabled !== undefined ? dto.greetingEnabled : widget.greetingEnabled,
      },
    });
  }

  // ─── Get quota info (for billing endpoint) ──────────────────────────────────
  async getQuotaInfo(tenantId: string) {
    return this.getWidgetQuota(tenantId);
  }
}

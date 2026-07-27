import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import { QuotaService } from '../tenants/quota.service';

@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('broadcasts') private broadcastQueue: Queue,
    private notificationsService: NotificationsService,
    private quotaService: QuotaService,
  ) {}

  async checkAccessControl(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
          orderBy: { currentPeriodEnd: 'desc' },
          take: 1
        }
      }
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const activePlan = tenant.subscriptions?.[0]?.plan;
    let allowedFeatures: string[] = [];

    if (tenant.customFeatures) {
      allowedFeatures = tenant.customFeatures as string[];
    } else if (activePlan && activePlan.features) {
      allowedFeatures = activePlan.features as string[];
    }

    if (!allowedFeatures.includes('broadcast')) {
      throw new ForbiddenException('Your current plan does not support Broadcast Campaigns. Please upgrade your plan.');
    }

    return true;
  }

  async getTemplates(tenantId: string) {
    await this.checkAccessControl(tenantId);
    return this.prisma.template.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async uploadMediaToMeta(file: Express.Multer.File, accessToken: string): Promise<string> {
    const fbConfig = await this.prisma.facebookAuthConfig.findFirst();
    const appId = fbConfig?.appId || '123456789';

    // Step 1: Initialize upload session
    const initRes = await fetch(`https://graph.facebook.com/v21.0/${appId}/uploads?file_length=${file.size}&file_type=${encodeURIComponent(file.mimetype)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      this.logger.error('Meta Resumable Upload init failed', err);
      throw new BadRequestException(`Meta Upload Init Failed: ${err.error?.message || 'Unknown error'}`);
    }

    const initData = await initRes.json();
    const sessionId = initData.id;

    // Step 2: Upload file bytes
    const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${sessionId}`, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${accessToken}`,
        file_offset: '0',
        'Content-Type': file.mimetype
      },
      body: file.buffer as any
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      this.logger.error('Meta Resumable Upload file transfer failed', err);
      throw new BadRequestException(`Meta Upload Transfer Failed: ${err.error?.message || 'Unknown error'}`);
    }

    const uploadData = await uploadRes.json();
    return uploadData.h; // Returns "h:header_handle_string"
  }

  async createTemplate(tenantId: string, data: any, file?: Express.Multer.File) {
    await this.checkAccessControl(tenantId);

    // Validate Template Name (lowercase_alphanumeric_underscore)
    if (!/^[a-z0-9_]+$/.test(data.name)) {
      throw new BadRequestException('Template Name must contain only lowercase letters, numbers, and underscores (e.g. eid_offer_2026).');
    }

    const channelConn = await this.prisma.channelConnection.findFirst({
      where: { tenantId, channelType: 'whatsapp', status: 'active' }
    });

    if (!channelConn || !channelConn.wabaId || !channelConn.accessTokenEncrypted) {
      throw new BadRequestException('An active WhatsApp Business Account (WABA) connection is required to create Meta templates.');
    }

    const wabaId = channelConn.wabaId;
    const accessToken = channelConn.accessTokenEncrypted;

    let headerMediaHandle: string | null = null;
    let headerMediaUrl: string | null = null;

    if (file && ['IMAGE', 'DOCUMENT', 'VIDEO'].includes(data.headerFormat)) {
      headerMediaUrl = `/uploads/${file.filename}`;

      if (accessToken.startsWith('mock_') || wabaId.startsWith('mock_')) {
        headerMediaHandle = `h:mock_handle_${Date.now()}`;
      } else {
        headerMediaHandle = await this.uploadMediaToMeta(file, accessToken);
      }
    }

    // Build Meta Components Payload
    const components: any[] = [];

    // Header
    if (data.headerFormat && data.headerFormat !== 'NONE') {
      const headerComp: any = {
        type: 'HEADER',
        format: data.headerFormat
      };

      if (data.headerFormat === 'TEXT') {
        headerComp.text = data.headerText;
        if (data.headerText && data.headerText.includes('{{1}}') && data.headerSamples) {
          let samples = data.headerSamples;
          if (typeof samples === 'string') {
            try { samples = JSON.parse(samples); } catch (e) { samples = [samples]; }
          }
          headerComp.example = {
            header_text: Array.isArray(samples) ? samples : [samples]
          };
        }
      } else if (['IMAGE', 'DOCUMENT', 'VIDEO'].includes(data.headerFormat)) {
        if (headerMediaHandle) {
          headerComp.example = {
            header_handle: [headerMediaHandle]
          };
        }
      }
      components.push(headerComp);
    }

    // Body
    const bodyComp: any = {
      type: 'BODY',
      text: data.bodyText
    };

    if (data.bodySamples) {
      let samplesArray = data.bodySamples;
      if (typeof samplesArray === 'string') {
        try { samplesArray = JSON.parse(samplesArray); } catch (e) { samplesArray = [samplesArray]; }
      }
      if (!Array.isArray(samplesArray)) samplesArray = [samplesArray];
      bodyComp.example = {
        body_text: [samplesArray]
      };
    }
    components.push(bodyComp);

    // Footer
    if (data.footerText && data.footerText.trim()) {
      components.push({
        type: 'FOOTER',
        text: data.footerText.trim()
      });
    }

    // Buttons
    if (data.buttons) {
      let buttonsArray = data.buttons;
      if (typeof buttonsArray === 'string') {
        try { buttonsArray = JSON.parse(buttonsArray); } catch (e) {}
      }
      if (Array.isArray(buttonsArray) && buttonsArray.length > 0) {
        const formattedButtons = buttonsArray.map((btn: any) => {
          if (btn.type === 'QUICK_REPLY') {
            return { type: 'QUICK_REPLY', text: btn.text };
          } else if (btn.type === 'URL') {
            const btnObj: any = { type: 'URL', text: btn.text, url: btn.url };
            if (btn.sample) {
              btnObj.example = Array.isArray(btn.sample) ? btn.sample : [btn.sample];
            }
            return btnObj;
          } else if (btn.type === 'PHONE_NUMBER') {
            return { type: 'PHONE_NUMBER', text: btn.text, phone_number: btn.phoneNumber };
          }
          return btn;
        });
        components.push({
          type: 'BUTTONS',
          buttons: formattedButtons
        });
      }
    }

    let metaResponse: any = {};

    if (accessToken.startsWith('mock_') || wabaId.startsWith('mock_')) {
      metaResponse = { id: `mock_tpl_${Date.now()}`, status: 'PENDING' };
    } else {
      const response = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: data.name,
          category: data.category,
          language: data.language || 'bn',
          components
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error('Meta Message Template Creation Failed', errorData);
        throw new BadRequestException(`Meta API Error: ${errorData.error?.message || 'Failed to submit template to Meta'}`);
      }

      metaResponse = await response.json();
    }

    const template = await this.prisma.template.create({
      data: {
        tenantId,
        name: data.name,
        category: data.category,
        language: data.language || 'bn',
        headerFormat: data.headerFormat || 'NONE',
        headerText: data.headerText || null,
        headerMediaHandle: headerMediaHandle || null,
        headerMediaUrl: headerMediaUrl || null,
        bodyText: data.bodyText,
        body: data.bodyText,
        footerText: data.footerText || null,
        components,
        status: metaResponse.status || 'PENDING',
        metaTemplateId: metaResponse.id || null
      }
    });

    return template;
  }

  async deleteTemplate(tenantId: string, templateId: string) {
    await this.checkAccessControl(tenantId);

    const template = await this.prisma.template.findFirst({
      where: { id: templateId, tenantId }
    });

    if (!template) throw new NotFoundException('Template not found');

    const channelConn = await this.prisma.channelConnection.findFirst({
      where: { tenantId, channelType: 'whatsapp', status: 'active' }
    });

    if (channelConn && channelConn.wabaId && channelConn.accessTokenEncrypted) {
      if (!channelConn.accessTokenEncrypted.startsWith('mock_')) {
        try {
          await fetch(`https://graph.facebook.com/v21.0/${channelConn.wabaId}/message_templates?name=${template.name}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${channelConn.accessTokenEncrypted}` }
          });
        } catch (e) {
          this.logger.warn('Failed to delete template on Meta API', e);
        }
      }
    }

    return this.prisma.template.delete({
      where: { id: templateId }
    });
  }

  async handleMetaWebhookTemplateEvent(value: any) {
    this.logger.log('Received Meta Webhook message_template_status_update', value);
    const metaTemplateId = value.message_template_id;
    const name = value.message_template_name;
    const event = value.event; // APPROVED, REJECTED, PAUSED, DISABLED
    const reason = value.reason || null;

    let template = null;
    if (metaTemplateId) {
      template = await this.prisma.template.findFirst({ where: { metaTemplateId } });
    }
    if (!template && name) {
      template = await this.prisma.template.findFirst({ where: { name } });
    }

    if (template) {
      const updated = await this.prisma.template.update({
        where: { id: template.id },
        data: {
          status: event,
          rejectionReason: reason
        }
      });

      const tenantOwner = await this.prisma.user.findFirst({
        where: { tenantId: template.tenantId, role: 'owner' }
      });

      if (tenantOwner) {
        await this.notificationsService.createNotification(
          tenantOwner.id,
          `WhatsApp Template Status: ${event}`,
          `Your template "${template.name}" has been marked as ${event} by Meta.${reason ? ' Reason: ' + reason : ''}`,
          event === 'APPROVED' ? 'info' : 'warning'
        ).catch(e => this.logger.error('Failed to create template notification', e));
      }

      return updated;
    }
  }

  async getBroadcasts(tenantId: string) {
    await this.checkAccessControl(tenantId);
    return this.prisma.broadcast.findMany({
      where: { tenantId },
      include: { template: true, _count: { select: { recipients: true } } },
      orderBy: { scheduledAt: 'desc' }
    });
  }

  async createBroadcast(tenantId: string, data: any) {
    await this.checkAccessControl(tenantId);

    const template = await this.prisma.template.findFirst({
      where: { id: data.templateId, tenantId }
    });

    if (!template) throw new NotFoundException('Template not found');
    if (template.status !== 'APPROVED') {
      throw new BadRequestException('Only Meta-APPROVED templates can be used for Broadcast Campaigns.');
    }

    // Pre-check: Count how many contacts will receive this broadcast
    const recipientCount = await this.prisma.contact.count({
      where: { tenantId, phone: { not: null } }
    });

    // Check if this broadcast would exceed the message quota
    const { periodStart, messageQuota } = await this.quotaService.getActivePeriodForTenant(tenantId);
    const currentUsage = await this.quotaService.getMessageUsage(tenantId, periodStart);
    const projectedTotal = currentUsage + recipientCount;

    if (projectedTotal > messageQuota) {
      const remaining = Math.max(0, messageQuota - currentUsage);
      throw new ForbiddenException(
        `Insufficient message quota. You have ${remaining} messages remaining but this broadcast targets ${recipientCount} contacts. Please upgrade your plan.`
      );
    }
    
    const broadcast = await this.prisma.broadcast.create({
      data: {
        tenantId,
        templateId: data.templateId,
        segmentFilter: data.segmentFilter || {},
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
        status: 'scheduled'
      }
    });

    await this.broadcastQueue.add('process-broadcast', {
      broadcastId: broadcast.id,
      tenantId
    });

    return broadcast;
  }

  // --- Superadmin Endpoints (Read-Only Monitoring) ---
  async getAllTemplatesForAdmin() {
    return this.prisma.template.findMany({
      include: {
        tenant: {
          select: { businessName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ============================================================
  // GLOBAL TEMPLATE LIBRARY — TENANT-FACING
  // ============================================================

  async getGlobalTemplates(filters?: { category?: string; categoryTag?: string; search?: string }) {
    const where: any = { isPublic: true };

    if (filters?.categoryTag && filters.categoryTag !== 'ALL') {
      where.categoryTag = filters.categoryTag;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { bodyText: { contains: filters.search, mode: 'insensitive' } },
        { categoryTag: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.globalTemplate.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async importFromLibrary(tenantId: string, data: { globalTemplateId: string; customName: string }) {
    // Validate template name
    if (!/^[a-z0-9_]+$/.test(data.customName)) {
      throw new BadRequestException('Template name must only contain lowercase letters, numbers, and underscores.');
    }

    const globalTemplate = await this.prisma.globalTemplate.findUnique({
      where: { id: data.globalTemplateId }
    });

    if (!globalTemplate) throw new NotFoundException('Global template not found in library.');

    // Check if tenant already imported this template name
    const existing = await this.prisma.template.findFirst({
      where: { tenantId, name: data.customName }
    });
    if (existing) {
      throw new BadRequestException(`You already have a template named "${data.customName}". Please choose a different name.`);
    }

    // Fetch tenant's active WABA connection
    const channelConn = await this.prisma.channelConnection.findFirst({
      where: { tenantId, channelType: 'whatsapp', status: 'active' }
    });

    if (!channelConn || !channelConn.wabaId || !channelConn.accessTokenEncrypted) {
      throw new BadRequestException('An active WhatsApp Business Account (WABA) connection is required to import templates. Please connect your WhatsApp account first.');
    }

    const wabaId = channelConn.wabaId;
    const accessToken = channelConn.accessTokenEncrypted;

    // Rebuild components — strip any media handles (those are per-account)
    const components = globalTemplate.components as any[];

    let metaResponse: any = {};

    if (accessToken.startsWith('mock_') || wabaId.startsWith('mock_')) {
      // Dev/test mode: simulate instant approval
      metaResponse = { id: `mock_imported_${Date.now()}`, status: 'APPROVED' };
    } else {
      const response = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: data.customName,
          category: globalTemplate.category,
          language: globalTemplate.language,
          components
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error('Meta API Template Import Failed', errorData);
        throw new BadRequestException(`Meta API Error: ${errorData.error?.message || 'Failed to import template. Please try again.'}`);
      }

      metaResponse = await response.json();
    }

    // Save to tenant's personal templates table
    const template = await this.prisma.template.create({
      data: {
        tenantId,
        name: data.customName,
        category: globalTemplate.category,
        language: globalTemplate.language,
        headerFormat: globalTemplate.headerFormat,
        headerText: globalTemplate.headerText || null,
        headerMediaHandle: null,
        headerMediaUrl: null,
        bodyText: globalTemplate.bodyText,
        body: globalTemplate.bodyText,
        footerText: globalTemplate.footerText || null,
        components: globalTemplate.components as any,
        status: metaResponse.status || 'PENDING',
        metaTemplateId: metaResponse.id || null
      }
    });

    // Increment global usage count
    await this.prisma.globalTemplate.update({
      where: { id: data.globalTemplateId },
      data: { usageCount: { increment: 1 } }
    });

    // Notify tenant owner
    const tenantOwner = await this.prisma.user.findFirst({
      where: { tenantId, role: 'owner' }
    });
    if (tenantOwner) {
      const statusMsg = template.status === 'APPROVED'
        ? `"${data.customName}" টেমপ্লেটটি সফলভাবে Import হয়েছে এবং Broadcast-এর জন্য Ready!`
        : `"${data.customName}" টেমপ্লেটটি Meta-তে Submit হয়েছে। কয়েক মিনিটের মধ্যে Approved হবে।`;
      await this.notificationsService.createNotification(
        tenantOwner.id,
        `Template Library Import: ${template.status}`,
        statusMsg,
        template.status === 'APPROVED' ? 'info' : 'warning'
      ).catch(e => this.logger.error('Failed to send import notification', e));
    }

    return { template, status: template.status };
  }

  // ============================================================
  // GLOBAL TEMPLATE LIBRARY — SUPERADMIN-FACING
  // ============================================================

  async getGlobalTemplatesForAdmin() {
    return this.prisma.globalTemplate.findMany({
      orderBy: [{ isFeatured: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async createGlobalTemplate(data: {
    title: string;
    categoryTag: string;
    category: string;
    language: string;
    headerFormat?: string;
    headerText?: string;
    bodyText: string;
    footerText?: string;
    components: any;
    isPublic?: boolean;
    isFeatured?: boolean;
  }) {
    return this.prisma.globalTemplate.create({
      data: {
        title: data.title,
        categoryTag: data.categoryTag,
        category: data.category,
        language: data.language || 'bn',
        headerFormat: data.headerFormat || 'NONE',
        headerText: data.headerText || null,
        bodyText: data.bodyText,
        footerText: data.footerText || null,
        components: data.components,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        isFeatured: data.isFeatured || false,
      }
    });
  }

  async promoteToGlobalLibrary(tenantTemplateId: string, data: { title: string; categoryTag: string; isFeatured?: boolean }) {
    const tenantTemplate = await this.prisma.template.findUnique({
      where: { id: tenantTemplateId }
    });

    if (!tenantTemplate) throw new NotFoundException('Tenant template not found.');
    if (tenantTemplate.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED templates can be promoted to the global library.');
    }

    // Build components from stored template data if components field is null
    const components = tenantTemplate.components || [
      { type: 'BODY', text: tenantTemplate.bodyText }
    ];

    return this.prisma.globalTemplate.create({
      data: {
        title: data.title,
        categoryTag: data.categoryTag,
        category: tenantTemplate.category,
        language: tenantTemplate.language,
        headerFormat: tenantTemplate.headerFormat || 'NONE',
        headerText: tenantTemplate.headerText || null,
        bodyText: tenantTemplate.bodyText,
        footerText: tenantTemplate.footerText || null,
        components: components as any,
        isPublic: true,
        isFeatured: data.isFeatured || false,
        sourceTenantId: tenantTemplate.tenantId,
      }
    });
  }

  async updateGlobalTemplate(id: string, data: Partial<{
    title: string;
    categoryTag: string;
    category: string;
    language: string;
    headerFormat: string;
    headerText: string;
    bodyText: string;
    footerText: string;
    components: any;
    isPublic: boolean;
    isFeatured: boolean;
  }>) {
    const existing = await this.prisma.globalTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Global template not found.');
    return this.prisma.globalTemplate.update({ where: { id }, data });
  }

  async deleteGlobalTemplate(id: string) {
    const existing = await this.prisma.globalTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Global template not found.');
    return this.prisma.globalTemplate.delete({ where: { id } });
  }
}


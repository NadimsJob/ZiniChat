import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BroadcastsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('broadcasts') private broadcastQueue: Queue
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

    const activePlan = tenant.subscriptions[0]?.plan;
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
      orderBy: { id: 'desc' }
    });
  }

  async createTemplate(tenantId: string, data: any) {
    await this.checkAccessControl(tenantId);
    return this.prisma.template.create({
      data: {
        tenantId,
        name: data.name,
        category: data.category,
        body: data.body,
        status: 'pending',
      }
    });
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
    
    // Create the broadcast
    const broadcast = await this.prisma.broadcast.create({
      data: {
        tenantId,
        templateId: data.templateId,
        segmentFilter: data.segmentFilter || {},
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
        status: 'scheduled'
      }
    });

    // Enqueue a job to process recipients
    await this.broadcastQueue.add('process-broadcast', {
      broadcastId: broadcast.id,
      tenantId
    });

    return broadcast;
  }
}

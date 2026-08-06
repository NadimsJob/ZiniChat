import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiCacheService } from '../ai/ai-cache.service';

@Injectable()
export class LabelsService {
  constructor(
    private prisma: PrismaService,
    private aiCacheService: AiCacheService
  ) {}

  async getLabels(tenantId: string) {
    return this.prisma.label.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createLabel(tenantId: string, data: { name: string; color: string; aiPrompt?: string; description?: string; isActive?: boolean }) {
    const label = await this.prisma.label.create({
      data: {
        tenantId,
        name: data.name,
        color: data.color,
        aiPrompt: data.aiPrompt,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
    await this.aiCacheService.invalidateCache(tenantId);
    return label;
  }

  async updateLabel(tenantId: string, id: string, data: { name?: string; color?: string; aiPrompt?: string; description?: string; isActive?: boolean }) {
    const existing = await this.prisma.label.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Label not found');

    const updated = await this.prisma.label.update({
      where: { id },
      data: {
        name: data.name,
        color: data.color,
        aiPrompt: data.aiPrompt,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : undefined
      }
    });
    await this.aiCacheService.invalidateCache(tenantId);
    return updated;
  }

  async deleteLabel(tenantId: string, id: string) {
    const existing = await this.prisma.label.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Label not found');

    await this.prisma.label.delete({ where: { id } });
    await this.aiCacheService.invalidateCache(tenantId);
    return { success: true };
  }

  async syncToAi(tenantId: string, id: string) {
    const label = await this.prisma.label.findFirst({ where: { id, tenantId } });
    if (!label) throw new NotFoundException('Label not found');
    await this.aiCacheService.invalidateCache(tenantId);
    return { success: true, message: 'Synced to AI Training successfully' };
  }
}

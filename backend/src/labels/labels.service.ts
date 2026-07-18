import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LabelsService {
  constructor(private prisma: PrismaService) {}

  async getLabels(tenantId: string) {
    return this.prisma.label.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createLabel(tenantId: string, data: { name: string; color: string; aiPrompt?: string }) {
    return this.prisma.label.create({
      data: {
        tenantId,
        name: data.name,
        color: data.color,
        aiPrompt: data.aiPrompt
      }
    });
  }

  async updateLabel(tenantId: string, id: string, data: { name?: string; color?: string; aiPrompt?: string }) {
    const existing = await this.prisma.label.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Label not found');

    return this.prisma.label.update({
      where: { id },
      data
    });
  }

  async deleteLabel(tenantId: string, id: string) {
    const existing = await this.prisma.label.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Label not found');

    await this.prisma.label.delete({ where: { id } });
    return { success: true };
  }
}

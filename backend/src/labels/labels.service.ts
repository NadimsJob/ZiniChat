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
  async syncToAi(tenantId: string, id: string) {
    const label = await this.prisma.label.findFirst({ where: { id, tenantId } });
    if (!label) throw new NotFoundException('Label not found');
    if (!label.aiPrompt) return { success: true, message: 'No AI prompt to sync' };

    const assistant = await this.prisma.aiAssistant.findFirst({ where: { tenantId } });
    if (!assistant) throw new NotFoundException('AI Assistant not found for this tenant');

    const startTag = `<Label: ${label.name}>`;
    const endTag = `</Label: ${label.name}>`;
    const newBlock = `\n\n${startTag}\n${label.aiPrompt}\n${endTag}`;

    let newSystemPrompt = assistant.systemPrompt || '';

    // Check if the label tag already exists in the prompt
    const regex = new RegExp(`\\n?\\n?<Label: ${label.name}>[\\s\\S]*?<\\/Label: ${label.name}>`);
    if (regex.test(newSystemPrompt)) {
      newSystemPrompt = newSystemPrompt.replace(regex, newBlock);
    } else {
      newSystemPrompt += newBlock;
    }

    await this.prisma.aiAssistant.update({
      where: { id: assistant.id },
      data: { systemPrompt: newSystemPrompt.trim() }
    });

    return { success: true, message: 'Synced to AI Training successfully' };
  }
}

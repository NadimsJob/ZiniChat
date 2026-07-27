import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async getStages(tenantId: string) {
    const stages = await this.prisma.kanbanStage.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' }
    });

    if (stages.length === 0) {
      // Create defaults
      await this.prisma.kanbanStage.createMany({
        data: [
          { tenantId, name: 'Intake', color: '#8b5cf6', order: 0 },
          { tenantId, name: 'Follow up', color: '#f59e0b', order: 1 },
          { tenantId, name: 'Qualified', color: '#3b82f6', order: 2 },
          { tenantId, name: 'Closed', color: '#10b981', order: 3 }
        ]
      });
      return this.prisma.kanbanStage.findMany({
        where: { tenantId },
        orderBy: { order: 'asc' }
      });
    }
    return stages;
  }

  async createStage(tenantId: string, data: any) {
    const existing = await this.prisma.kanbanStage.count({ where: { tenantId } });
    return this.prisma.kanbanStage.create({
      data: {
        tenantId,
        name: data.name,
        color: data.color || '#9ca3af',
        order: data.order ?? existing,
      }
    });
  }

  async updateStage(id: string, data: any) {
    return this.prisma.kanbanStage.update({
      where: { id },
      data
    });
  }

  async deleteStage(id: string) {
    return this.prisma.kanbanStage.delete({ where: { id } });
  }

  async getLeads(tenantId: string) {
    return this.prisma.contact.findMany({
      where: { tenantId },
      include: {
        stage: true,
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        assignedUser: {
          select: { id: true, name: true, profilePicUrl: true }
        },
        conversations: {
          select: { id: true }
        }
      },
      orderBy: { lastSeenAt: 'desc' }
    });
  }

  async getTeamMembers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, profilePicUrl: true }
    });
  }

  async updateLead(tenantId: string, id: string, data: any) {
    const updateData: any = {
      stageId: data.stageId,
      phone: data.phone,
      email: data.email,
      company: data.company,
      address: data.address,
      assignedUserId: data.assignedUserId,
    };

    if (data.followUpAt !== undefined) {
      updateData.followUpAt = data.followUpAt ? new Date(data.followUpAt) : null;
      updateData.followUpNotified = false; // Reset notification flag when date changes
    }

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    return this.prisma.contact.update({
      where: { id, tenantId },
      data: updateData,
      include: { 
        stage: true, 
        assignedUser: { select: { id: true, name: true, profilePicUrl: true } }
      }
    });
  }

  async createLead(tenantId: string, data: any) {
    let stageId = data.stageId;
    if (!stageId) {
      const first = await this.prisma.kanbanStage.findFirst({
        where: { tenantId },
        orderBy: { order: 'asc' }
      });
      stageId = first?.id || null;
    }

    return this.prisma.contact.create({
      data: {
        tenantId,
        channel: 'manual',
        externalContactId: `manual_${Date.now()}`,
        name: data.name,
        phone: data.phone,
        email: data.email,
        company: data.company,
        address: data.address,
        assignedUserId: data.assignedUserId,
        stageId: stageId,
        followUpAt: data.followUpAt ? new Date(data.followUpAt) : null,
      },
      include: {
        stage: true,
        assignedUser: { select: { id: true, name: true } }
      }
    });
  }

  async addNote(tenantId: string, contactId: string, content: string, userId?: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId }
    });
    if (!contact) throw new NotFoundException('Lead not found');

    return this.prisma.contactNote.create({
      data: {
        contactId,
        content,
        createdBy: userId || null
      }
    });
  }

  async deleteContact(contactId: string, tenantId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId }
    });
    if (!contact) throw new NotFoundException('Lead not found');

    return this.prisma.$transaction(async (tx) => {
      const conversations = await tx.conversation.findMany({ where: { contactId } });
      const convIds = conversations.map(c => c.id);

      if (convIds.length > 0) {
        await tx.order.updateMany({
          where: { conversationId: { in: convIds } },
          data: { conversationId: null }
        });
        await tx.message.deleteMany({ where: { conversationId: { in: convIds } } });
        await tx.conversationLabel.deleteMany({ where: { conversationId: { in: convIds } } });
      }
      
      await tx.broadcastRecipient.deleteMany({ where: { contactId } });
      await tx.conversation.deleteMany({ where: { contactId } });
      
      await tx.contact.delete({ where: { id: contactId } });
      
      return { success: true };
    });
  }

  async exportLeadsToExcel(tenantId: string): Promise<Buffer> {
    const leads = await this.prisma.contact.findMany({
      where: { tenantId },
      include: {
        stage: true,
        assignedUser: true,
        notes: true,
        conversations: {
          include: {
            labels: { include: { label: true } }
          }
        }
      },
      orderBy: { lastSeenAt: 'desc' }
    });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Stage', key: 'stage', width: 15 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Company', key: 'company', width: 20 },
      { header: 'Tags', key: 'tags', width: 20 },
      { header: 'Labels', key: 'labels', width: 30 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Last Seen', key: 'lastSeenAt', width: 20 }
    ];

    leads.forEach(lead => {
      // Gather labels across all conversations
      const labelNames = new Set<string>();
      lead.conversations?.forEach(c => {
        c.labels?.forEach(l => {
          if (l.label && l.label.name) labelNames.add(l.label.name);
        });
      });

      worksheet.addRow({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        stage: lead.stage?.name || 'No Stage',
        assignedTo: lead.assignedUser?.name || '',
        company: lead.company || '',
        tags: lead.tags?.join(', ') || '',
        labels: Array.from(labelNames).join(', '),
        notes: lead.notes?.map((n: any) => n.content).join(' | ') || '',
        lastSeenAt: lead.lastSeenAt ? lead.lastSeenAt.toLocaleDateString() : ''
      });
    });

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }
}


import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../inbox/activity-log.service';
import { InboxGateway } from '../inbox/inbox.gateway';

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ActivityLogService)) private activityLogService: ActivityLogService,
    @Inject(forwardRef(() => InboxGateway)) private inboxGateway: InboxGateway
  ) {}

  async getContacts(tenantId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { tenantId },
      include: {
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastSeenAt: 'desc' }
    });

    return contacts.map(c => ({
      id: c.id,
      name: c.name || 'Unknown',
      channel: c.channel,
      externalContactId: c.externalContactId,
      lastSeenAt: c.lastSeenAt,
      tags: c.tags,
      latestConversationId: c.conversations[0]?.id || null,
      latestConversationStatus: c.conversations[0]?.status || 'closed'
    }));
  }

  async getContact(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
      include: {
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 5
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, profilePicUrl: true } } }
        }
      }
    });

    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async getContactNotes(tenantId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId }
    });
    if (!contact) throw new NotFoundException('Contact not found');

    return this.prisma.contactNote.findMany({
      where: { contactId },
      include: {
        user: { select: { id: true, name: true, profilePicUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createContactNote(tenantId: string, contactId: string, content: string, actionUser: any) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId },
      include: { conversations: { orderBy: { lastMessageAt: 'desc' }, take: 1 } }
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const note = await this.prisma.contactNote.create({
      data: {
        contactId,
        createdBy: actionUser.userId || actionUser.id,
        content
      },
      include: {
        user: { select: { id: true, name: true, profilePicUrl: true } }
      }
    });

    const conversationId = contact.conversations[0]?.id;
    if (conversationId) {
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId,
        type: 'NOTE_ADDED',
        actorUserId: actionUser.userId || actionUser.id,
        metadataJson: { noteId: note.id, preview: content.slice(0, 50) }
      });

      this.inboxGateway.broadcastToTenant(tenantId, 'note:added', {
        conversationId,
        contactId,
        note
      });
    }

    return note;
  }

  async deleteContactNote(tenantId: string, contactId: string, noteId: string, actionUser: any) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId }
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const note = await this.prisma.contactNote.findUnique({
      where: { id: noteId }
    });
    if (!note || note.contactId !== contactId) throw new NotFoundException('Note not found');

    // Only allow author or owner/admin to delete note
    const userId = actionUser.userId || actionUser.id;
    if (note.createdBy !== userId && actionUser.role !== 'owner' && actionUser.role !== 'admin' && actionUser.role !== 'superadmin') {
      throw new ForbiddenException('You can only delete your own notes');
    }

    await this.prisma.contactNote.delete({
      where: { id: noteId }
    });

    return { success: true };
  }

  async updateContact(tenantId: string, contactId: string, data: any) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId }
    });
    if (!contact) throw new NotFoundException('Contact not found');

    return this.prisma.contact.update({
      where: { id: contactId },
      data: {
        name: data.name !== undefined ? data.name : contact.name,
        phone: data.phone !== undefined ? data.phone : contact.phone,
        email: data.email !== undefined ? data.email : contact.email,
        company: data.company !== undefined ? data.company : contact.company,
        address: data.address !== undefined ? data.address : contact.address,
        stageId: data.stageId !== undefined ? data.stageId : contact.stageId,
        followUpAt: data.followUpAt !== undefined ? (data.followUpAt ? new Date(data.followUpAt) : null) : contact.followUpAt,
        assignedUserId: data.assignedUserId !== undefined ? data.assignedUserId : contact.assignedUserId,
      }
    });
  }
}

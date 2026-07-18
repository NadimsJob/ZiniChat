import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async getContacts(tenantId: string) {
    // Fetch contacts with their latest conversation for this tenant
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
        }
      }
    });

    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }
}

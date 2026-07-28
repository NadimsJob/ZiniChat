import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import * as path from 'path';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('whatsapp-outbound') private whatsappQueue: Queue,
    @InjectQueue('messenger-outbound') private messengerQueue: Queue,
    private aiService: AiService,
    @Inject(forwardRef(() => OrchestratorService))
    private orchestratorService: OrchestratorService
  ) {}

  async getActiveChannels(tenantId: string) {
    const connections = await this.prisma.channelConnection.findMany({
      where: { tenantId },
      select: {
        id: true,
        channelType: true,
        displayName: true,
        phoneNumber: true,
        provider: true,
        status: true,
        qrStatus: true,
        isAiAutoReplyEnabled: true,
        connectionMethod: true,
        createdAt: true,
      }
    });

    return connections.map(conn => {
      const isConnected = conn.status === 'active' || conn.qrStatus === 'CONNECTED';
      return {
        ...conn,
        status: isConnected ? 'active' : 'disconnected',
        isConnected
      };
    });
  }

  async toggleChannelAiReply(tenantId: string, id: string, isAiAutoReplyEnabled: boolean) {
    return this.prisma.channelConnection.update({
      where: { id },
      data: { isAiAutoReplyEnabled }
    });
  }

  async deleteChannel(tenantId: string, id: string) {
    return this.prisma.channelConnection.delete({
      where: { id }
    });
  }

  async reconnectChannel(tenantId: string, id: string) {
    const conn = await this.prisma.channelConnection.findFirst({
      where: { id, tenantId }
    });
    if (!conn) throw new Error('Channel not found');

    await this.prisma.channelConnection.update({
      where: { id },
      data: { status: 'active', qrStatus: 'CONNECTING' }
    });

    return { message: 'Reconnection initiated' };
  }


  async getConversations(tenantId: string, user: any) {
    let whereClause: any = { tenantId };

    if (user.role === 'agent' && user.agentAccessMode === 'ASSIGNED_CHANNELS') {
      const assignments = await this.prisma.agentChannelAssignment.findMany({
        where: { userId: user.id },
        include: { channelConnection: true }
      });
      const assignedConnectionIds = assignments.map(a => a.channelConnectionId);

      whereClause = {
        ...whereClause,
        OR: [
          { assignedAgentId: user.id }, // Assigned explicitly to this conversation
          { channelConnectionId: { in: assignedConnectionIds } } // Belongs to an assigned channel
        ]
      };
    }

    return this.prisma.conversation.findMany({
      where: whereClause,
      include: {
        contact: true,
        assignedAgent: {
          select: { id: true, name: true, profilePicUrl: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get the latest message for the list view
        },
        labels: {
          include: {
            label: true
          }
        },
        channelConnection: true // Include connection to show channel details in UI
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getUnreadCount(tenantId: string, user: any) {
    let whereClause: any = { tenantId, unreadCount: { gt: 0 } };

    if (user.role === 'agent' && user.agentAccessMode === 'ASSIGNED_CHANNELS') {
      const assignments = await this.prisma.agentChannelAssignment.findMany({
        where: { userId: user.id },
        include: { channelConnection: true }
      });
      const assignedConnectionIds = assignments.map(a => a.channelConnectionId);

      whereClause = {
        ...whereClause,
        OR: [
          { assignedAgentId: user.id }, // Assigned explicitly to this conversation
          { channelConnectionId: { in: assignedConnectionIds } } // Belongs to an assigned channel
        ]
      };
    } else if (user.role === 'admin' || user.role === 'superadmin') {
      // Admins only see badge for unassigned conversations, as per requirement
      whereClause.assignedAgentId = null;
    }

    const unreadConversations = await this.prisma.conversation.aggregate({
      where: whereClause,
      _sum: { unreadCount: true }
    });

    return { unreadCount: unreadConversations._sum.unreadCount || 0 };
  }

  async assignAgent(tenantId: string, conversationId: string, agentId: string | null, actionUser: any) {
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId, tenantId },
      data: { assignedAgentId: agentId },
      include: { contact: true, assignedAgent: { select: { id: true, name: true } } }
    });

    if (agentId) {
      // Create a web notification for the assigned agent
      await this.prisma.notification.create({
        data: {
          userId: agentId,
          type: 'inbox',
          title: 'Conversation Assigned',
          message: `You were assigned to a conversation with ${conversation.contact.name || 'a customer'}.`,
          isRead: false
        }
      });
      
      // Track in Contact History
      await this.prisma.contactNote.create({
        data: {
          contactId: conversation.contactId,
          createdBy: actionUser.id,
          content: `Assigned conversation to ${conversation.assignedAgent?.name || 'Agent'}.`
        }
      });
    } else {
      // Unassigned
      await this.prisma.contactNote.create({
        data: {
          contactId: conversation.contactId,
          createdBy: actionUser.id,
          content: `Unassigned conversation.`
        }
      });
    }

    return conversation;
  }

  async toggleAiReply(tenantId: string, conversationId: string, isAiEnabled: boolean, actionUser: any) {
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId, tenantId },
      data: { isAiEnabled },
      include: { contact: true }
    });

    // Track in Contact History
    await this.prisma.contactNote.create({
      data: {
        contactId: conversation.contactId,
        createdBy: actionUser.id,
        content: `AI Auto-Reply turned ${isAiEnabled ? 'ON' : 'OFF'} for this conversation.`
      }
    });

    return conversation;
  }

  async getMessages(tenantId: string, conversationId: string) {
    // Reset unread count when conversation is opened
    await this.prisma.conversation.updateMany({
      where: { id: conversationId, tenantId },
      data: { unreadCount: 0 }
    });

    return this.prisma.message.findMany({
      where: { 
        conversationId,
        conversation: { tenantId }
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Used by the webhook pipeline to save incoming messages
  async handleIncomingMessage(data: {
    tenantId: string;
    channel: string;
    channelConnectionId?: string;
    externalContactId: string;
    contactName?: string;
    messageType: string;
    content: any;
    externalMessageId: string;
    timestamp: Date;
  }) {
    // 1. Upsert Contact (Robust matching to prevent duplicate contacts on format variations like +, @c.us, etc.)
    const cleanId = (data.externalContactId || '').split('@')[0].trim();
    const strippedId = cleanId.replace(/^\+/, '');
    const withPlusId = `+${strippedId}`;

    let contact = await this.prisma.contact.findFirst({
      where: { 
        tenantId: data.tenantId, 
        channel: data.channel,
        OR: [
          { externalContactId: cleanId },
          { externalContactId: strippedId },
          { externalContactId: withPlusId },
          ...(data.channel === 'whatsapp' ? [
            { phone: cleanId },
            { phone: strippedId },
            { phone: withPlusId }
          ] : [])
        ]
      }
    });
    
    if (!contact) {
      const firstStage = await this.prisma.kanbanStage.findFirst({
        where: { tenantId: data.tenantId },
        orderBy: { order: 'asc' }
      });

      contact = await this.prisma.contact.create({
        data: {
          tenantId: data.tenantId,
          channel: data.channel,
          externalContactId: cleanId,
          name: data.contactName || cleanId,
          phone: data.channel === 'whatsapp' ? strippedId : undefined,
          lastSeenAt: data.timestamp,
          stageId: firstStage?.id || null
        }
      });
    } else {
      contact = await this.prisma.contact.update({
        where: { id: contact.id },
        data: { 
          lastSeenAt: data.timestamp, 
          name: (data.contactName && data.contactName !== data.externalContactId) ? data.contactName : contact.name,
          phone: data.channel === 'whatsapp' && !contact.phone ? strippedId : contact.phone
        }
      });
    }

    // 2. Upsert Conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: { 
        tenantId: data.tenantId, 
        contactId: contact.id, 
        channel: data.channel
      }
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId: data.tenantId,
          contactId: contact.id,
          channel: data.channel,
          channelConnectionId: data.channelConnectionId,
          lastMessageAt: data.timestamp,
          unreadCount: 1
        }
      });
    } else {
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { 
          lastMessageAt: data.timestamp, 
          status: 'open',
          unreadCount: { increment: 1 },
          ...(data.channelConnectionId && { channelConnectionId: data.channelConnectionId })
        }
      });
    }

    // 3. Process media if necessary
    let contentToSave = data.content;
    try {
      if (data.messageType === 'audio' && data.content?.localUrl) {
        const filePath = path.join(process.cwd(), data.content.localUrl);
        const transcript = await this.aiService.transcribeAudio(filePath, data.tenantId);
        contentToSave = { ...contentToSave, transcript };
      } else if (data.messageType === 'document' && data.content?.localUrl) {
        const filePath = path.join(process.cwd(), data.content.localUrl);
        if (filePath.endsWith('.pdf')) {
          const extractedText = await this.aiService.extractTextFromPdf(filePath);
          contentToSave = { ...contentToSave, extractedText };
        }
      }
    } catch (err) {
      this.logger.error(`Media processing failed for incoming message: ${err.message}`);
    }

    // 4. Save Message
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        externalMessageId: data.externalMessageId,
        direction: 'inbound',
        type: data.messageType,
        content: contentToSave,
        status: 'delivered', // Incoming is always delivered to us
        createdAt: data.timestamp
      }
    });

    // Trigger AI Orchestrator asynchronously (fire-and-forget)
    this.orchestratorService.processMessage(message.id).catch(err => {
      this.logger.error(`Orchestrator failed for message ${message.id}: ${err.message}`);
    });

    return {
      message,
      conversation,
      contact
    };
  }

  // Used by frontend to mock-send a message out
  async saveOutboundMessage(tenantId: string, conversationId: string, content: string, type: string = 'text') {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { contact: true }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check Global Message Quota
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    // Get quota limits
    const activeSub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'active', currentPeriodEnd: { gt: new Date() } },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' }
    });
    const messageQuota = activeSub?.plan?.messageQuota || 100; // Free tier default

    // Count messages used
    const messagesUsed = await this.prisma.message.count({
      where: {
        conversation: { tenantId },
        createdAt: { gte: startOfMonth }
      }
    });

    if (messagesUsed >= messageQuota) {
      throw new Error('MESSAGE_QUOTA_EXCEEDED');
    }

    // Save as pending initially
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        type,
        content: content,
        status: 'pending', // Will be updated by BullMQ worker
      }
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() }
    });

    // Ensure active channelConnectionId
    let channelConnId: string | null = conversation.channelConnectionId;
    if (!channelConnId) {
      const activeConn = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: conversation.channel, status: 'active' }
      });
      channelConnId = activeConn?.id || null;
      if (channelConnId) {
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { channelConnectionId: channelConnId }
        }).catch(() => {});
      }
    }

    // Add to BullMQ Queue
    if (conversation.channel === 'whatsapp') {
      await this.whatsappQueue.add(
        'send-message',
        {
          tenantId,
          messageId: message.id,
          to: conversation.contact.externalContactId,
          type,
          content,
          conversationId,
          channelConnectionId: channelConnId,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        }
      );
    } else if (conversation.channel === 'messenger') {
      await this.messengerQueue.add(
        'send-message',
        {
          tenantId,
          messageId: message.id,
          to: conversation.contact.externalContactId,
          type,
          content,
          conversationId,
          channelConnectionId: conversation.channelConnectionId,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        }
      );
    }

    return { message, conversation };
  }

  async toggleLabel(tenantId: string, conversationId: string, labelId: string) {
    // Verify conversation belongs to tenant
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    
    if (!conv) {
      throw new Error('Conversation not found');
    }

    // Check if label exists
    const existing = await this.prisma.conversationLabel.findUnique({
      where: {
        conversationId_labelId: {
          conversationId,
          labelId
        }
      }
    });

    if (existing) {
      await this.prisma.conversationLabel.delete({
        where: {
          conversationId_labelId: {
            conversationId,
            labelId
          }
        }
      });
      return { added: false };
    } else {
      await this.prisma.conversationLabel.create({
        data: {
          conversationId,
          labelId
        }
      });
      return { added: true };
    }
  }

  async deleteConversation(conversationId: string, tenantId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    
    if (!conv) {
      throw new Error('Conversation not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { conversationId },
        data: { conversationId: null }
      });
      
      await tx.message.deleteMany({
        where: { conversationId }
      });
      
      await tx.conversationLabel.deleteMany({
        where: { conversationId }
      });
      
      await tx.conversation.delete({
        where: { id: conversationId }
      });
      
      return { success: true };
    });
  }
}

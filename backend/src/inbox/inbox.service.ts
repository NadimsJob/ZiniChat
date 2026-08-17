import { Injectable, Logger, Inject, forwardRef, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { ActivityLogService } from './activity-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as path from 'path';

import { InboxGateway } from './inbox.gateway';
import { QuotaService } from '../tenants/quota.service';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('whatsapp-outbound') private whatsappQueue: Queue,
    @InjectQueue('messenger-outbound') private messengerQueue: Queue,
    private aiService: AiService,
    @Inject(forwardRef(() => OrchestratorService))
    private orchestratorService: OrchestratorService,
    private activityLogService: ActivityLogService,
    private notificationsService: NotificationsService,
    private quotaService: QuotaService,
    @Inject(forwardRef(() => InboxGateway))
    private inboxGateway: InboxGateway
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
        ignoreGroupMessages: true,
        connectionMethod: true,
        createdAt: true,
      }
    });

    const websiteWidgets = await this.prisma.websiteWidget.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        type: true,
        widgetToken: true,
        domain: true,
        primaryColor: true,
        heading: true,
        whatsappInboxId: true,
        isAiAutoReplyEnabled: true,
        isActive: true,
        createdAt: true,
      }
    });

    const mappedConnections = connections.map(conn => {
      const isInactive = conn.status === 'inactive';
      const isConnected = !isInactive && (conn.status === 'active' || conn.qrStatus === 'CONNECTED');
      return {
        ...conn,
        status: isInactive ? 'inactive' : (isConnected ? 'active' : 'disconnected'),
        isConnected,
        isActive: !isInactive,
      };
    });

    const mappedWidgets = websiteWidgets.map(w => {
      let aiEnabled = w.isAiAutoReplyEnabled ?? true;
      if (w.whatsappInboxId) {
        const linkedConn = connections.find(c => c.id === w.whatsappInboxId);
        if (linkedConn) {
          aiEnabled = linkedConn.isAiAutoReplyEnabled;
        }
      }
      const isWidgetActive = w.isActive ?? true;
      return {
        id: w.id,
        channelType: 'website',
        displayName: w.name || 'Website Widget',
        phoneNumber: w.type === 'WHATSAPP' ? 'WhatsApp Widget' : 'Live Chat Widget',
        provider: w.type,
        status: isWidgetActive ? 'active' : 'inactive',
        qrStatus: 'CONNECTED',
        isAiAutoReplyEnabled: aiEnabled,
        ignoreGroupMessages: false,
        connectionMethod: 'embed_script',
        createdAt: w.createdAt,
        isConnected: isWidgetActive,
        isActive: isWidgetActive,
        widgetToken: w.widgetToken,
        domain: w.domain,
        primaryColor: w.primaryColor,
        heading: w.heading,
        type: w.type,
        whatsappInboxId: w.whatsappInboxId,
      };
    });

    return [...mappedConnections, ...mappedWidgets];
  }

  async toggleChannelAiReply(tenantId: string, id: string, isAiAutoReplyEnabled: boolean) {
    const conn = await this.prisma.channelConnection.findFirst({
      where: { id, tenantId }
    });

    if (conn) {
      return this.prisma.channelConnection.update({
        where: { id },
        data: { isAiAutoReplyEnabled }
      });
    }

    const widget = await this.prisma.websiteWidget.findFirst({
      where: { id, tenantId }
    });

    if (widget) {
      await this.prisma.websiteWidget.update({
        where: { id },
        data: { isAiAutoReplyEnabled }
      });
      return { id: widget.id, isAiAutoReplyEnabled };
    }

    throw new NotFoundException('Channel or Widget not found');
  }

  async toggleChannelActiveStatus(tenantId: string, id: string, isActive: boolean) {
    const conn = await this.prisma.channelConnection.findFirst({
      where: { id, tenantId }
    });

    if (conn) {
      const nextStatus = isActive ? 'active' : 'inactive';
      return this.prisma.channelConnection.update({
        where: { id },
        data: { status: nextStatus }
      });
    }

    const widget = await this.prisma.websiteWidget.findFirst({
      where: { id, tenantId }
    });

    if (widget) {
      return this.prisma.websiteWidget.update({
        where: { id },
        data: { isActive }
      });
    }

    throw new NotFoundException('Channel or Widget not found');
  }

  async toggleIgnoreGroupMessages(tenantId: string, id: string, ignoreGroupMessages: boolean) {
    return this.prisma.channelConnection.update({
      where: { id },
      data: { ignoreGroupMessages }
    });
  }

  async deleteChannel(tenantId: string, id: string) {
    const conn = await this.prisma.channelConnection.findFirst({
      where: { id, tenantId }
    });

    if (conn) {
      return this.prisma.channelConnection.delete({
        where: { id }
      });
    }

    const widget = await this.prisma.websiteWidget.findFirst({
      where: { id, tenantId }
    });

    if (widget) {
      return this.prisma.websiteWidget.update({
        where: { id },
        data: { isActive: false }
      });
    }

    throw new Error('Channel or Widget not found');
  }

  async testPingWebsiteWidget(tenantId: string, widgetId: string) {
    const widget = await this.prisma.websiteWidget.findFirst({
      where: { id: widgetId, tenantId, isActive: true }
    });

    if (!widget) {
      throw new Error('Website Widget not found or inactive');
    }

    const pingTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return this.handleIncomingMessage({
      tenantId,
      channel: 'website',
      externalContactId: `test_widget_${widget.id.slice(0, 8)}`,
      contactName: `Website Widget Tester ⚡`,
      messageType: 'text',
      content: { body: `⚡ Connection Established! Test message sent from website widget "${widget.name}" at ${pingTime}.` },
      externalMessageId: `ping_${Date.now()}`,
      timestamp: new Date()
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

  async getConversations(tenantId: string, user: any, view: string = 'all', channel: string = 'all') {
    if (view && view !== 'all') {
      const allowed = await this.quotaService.checkFeature(tenantId, 'inbox_smart_tabs').catch(() => false);
      if (!allowed) {
        throw new ForbiddenException('Your current plan does not allow Smart Inbox Tabs filtering.');
      }
    }

    let whereClause: any = { tenantId };

    // Exclude conversations belonging to inactive channel connections
    const inactiveConnections = await this.prisma.channelConnection.findMany({
      where: { tenantId, status: 'inactive' },
      select: { id: true }
    });
    const inactiveConnectionIds = inactiveConnections.map(c => c.id);

    if (inactiveConnectionIds.length > 0) {
      whereClause.channelConnectionId = { notIn: inactiveConnectionIds };
    }

    if (user.role === 'agent' && user.agentAccessMode === 'ASSIGNED_CHANNELS') {
      const assignments = await this.prisma.agentChannelAssignment.findMany({
        where: { userId: user.id },
        include: { channelConnection: true }
      });
      const assignedConnectionIds = assignments.map(a => a.channelConnectionId);

      whereClause = {
        ...whereClause,
        OR: [
          { assignedAgentId: user.id },
          { channelConnectionId: { in: assignedConnectionIds } }
        ]
      };
    }

    // View filters
    if (view === 'archived') {
      whereClause.isArchived = true;
    } else {
      whereClause.isArchived = false;
      if (view === 'order_requests') {
        whereClause.hasOrderRequest = true;
      } else if (view === 'unreplied') {
        whereClause.unreadCount = { gt: 0 };
      } else if (view === 'tickets') {
        whereClause.requiresFollowUp = true;
      } else if (view === 'resolved') {
        whereClause.status = 'resolved';
      }
    }

    // Channel filter
    if (channel !== 'all') {
      whereClause.channel = channel;
    }

    const conversations = await this.prisma.conversation.findMany({
      where: whereClause,
      include: {
        contact: true,
        assignedAgent: {
          select: { id: true, name: true, profilePicUrl: true }
        },
        aiAssistant: {
          select: { id: true, agentName: true, modelProvider: true, modelName: true }
        },
        collaborators: {
          include: {
            user: { select: { id: true, name: true, profilePicUrl: true } }
          }
        } as any,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        labels: {
          include: {
            label: true
          }
        },
        channelConnection: true
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Auto-fetch Meta User Profile in background for any contact with generic default name
    for (const conv of conversations) {
      if (conv.contact && ['messenger', 'instagram'].includes(conv.contact.channel)) {
        const isGeneric = !conv.contact.name || 
          conv.contact.name === 'Messenger User' || 
          conv.contact.name === 'Instagram User' || 
          conv.contact.name === conv.contact.externalContactId;
        if (isGeneric) {
          this.fetchAndUpdateMetaUserProfile(tenantId, conv.contact.id, conv.contact.externalContactId, conv.contact.channel).catch(() => {});
        }
      }
    }

    return conversations;
  }

  async fetchAndUpdateMetaUserProfile(tenantId: string, contactId: string, externalContactId: string, channel: string) {
    try {
      if (!['messenger', 'instagram'].includes(channel)) return;

      const connection = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: channel, status: { in: ['active', 'connected'] } }
      });

      if (!connection || !connection.accessTokenEncrypted) return;

      const pageToken = connection.accessTokenEncrypted;
      let fullName: string | null = null;

      if (channel === 'messenger') {
        const res = await fetch(`https://graph.facebook.com/v21.0/${externalContactId}?fields=first_name,last_name,name,profile_pic&access_token=${pageToken}`);
        if (res.ok) {
          const data = await res.json();
          if (data.name) {
            fullName = data.name;
          } else if (data.first_name || data.last_name) {
            fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
          }
        }
      } else if (channel === 'instagram') {
        const res = await fetch(`https://graph.facebook.com/v21.0/${externalContactId}?fields=name,username,profile_pic&access_token=${pageToken}`);
        if (res.ok) {
          const data = await res.json();
          if (data.name) {
            fullName = data.name;
          } else if (data.username) {
            fullName = data.username;
          }
        }
      }

      if (fullName && fullName.trim() !== '') {
        const updatedContact = await this.prisma.contact.update({
          where: { id: contactId },
          data: { name: fullName.trim() }
        });
        this.logger.log(`Fetched Meta User Profile for ${channel} contact ${contactId}: ${fullName}`);

        if (this.inboxGateway) {
          this.inboxGateway.broadcastToTenant(tenantId, 'contact:updated', updatedContact);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed fetching Meta user profile for ${externalContactId}: ${err.message}`);
    }
  }

  async getInboxCounts(tenantId: string, user: any) {
    let baseWhere: any = { tenantId };

    if (user.role === 'agent' && user.agentAccessMode === 'ASSIGNED_CHANNELS') {
      const assignments = await this.prisma.agentChannelAssignment.findMany({
        where: { userId: user.id },
        include: { channelConnection: true }
      });
      const assignedConnectionIds = assignments.map(a => a.channelConnectionId);

      baseWhere.OR = [
        { assignedAgentId: user.id },
        { channelConnectionId: { in: assignedConnectionIds } }
      ];
    }

    const [all, order_requests, unreplied, tickets, resolved, archived] = await Promise.all([
      this.prisma.conversation.count({ where: { ...baseWhere, isArchived: false } }),
      this.prisma.conversation.count({ where: { ...baseWhere, isArchived: false, hasOrderRequest: true } }),
      this.prisma.conversation.count({ where: { ...baseWhere, isArchived: false, unreadCount: { gt: 0 } } }),
      this.prisma.conversation.count({ where: { ...baseWhere, isArchived: false, requiresFollowUp: true } }),
      this.prisma.conversation.count({ where: { ...baseWhere, isArchived: false, status: 'resolved' } }),
      this.prisma.conversation.count({ where: { ...baseWhere, isArchived: true } }),
    ]);

    return { all, order_requests, unreplied, tickets, resolved, archived };
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
          { assignedAgentId: user.id },
          { channelConnectionId: { in: assignedConnectionIds } }
        ]
      };
    } else if (user.role === 'admin' || user.role === 'superadmin') {
      whereClause.assignedAgentId = null;
    }

    const unreadConversations = await this.prisma.conversation.aggregate({
      where: whereClause,
      _sum: { unreadCount: true }
    });

    return { unreadCount: unreadConversations._sum.unreadCount || 0 };
  }

  async toggleStar(tenantId: string, conversationId: string, actionUser: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const updated: any = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { isStarred: !(conv as any).isStarred } as any
    });

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conv.contactId,
      type: 'STARRED',
      actorUserId: actionUser.id,
      metadataJson: { isStarred: updated.isStarred }
    });

    return updated;
  }

  async archiveConversation(tenantId: string, conversationId: string, actionUser: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const updated: any = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { isArchived: true } as any
    });

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conv.contactId,
      type: 'ARCHIVED',
      actorUserId: actionUser.id
    });

    return updated;
  }

  async unarchiveConversation(tenantId: string, conversationId: string, actionUser: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const updated: any = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { isArchived: false } as any
    });

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conv.contactId,
      type: 'REOPENED',
      actorUserId: actionUser.id,
      metadataJson: { action: 'unarchive' }
    });

    return updated;
  }

  async resolveConversation(tenantId: string, conversationId: string, actionUser: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const updated: any = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'resolved', resolvedAt: new Date() } as any
    });

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conv.contactId,
      type: 'RESOLVED',
      actorUserId: actionUser.id
    });

    return updated;
  }

  async reopenConversation(tenantId: string, conversationId: string, actionUser: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const updated: any = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'open', resolvedAt: null } as any
    });

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conv.contactId,
      type: 'REOPENED',
      actorUserId: actionUser.id
    });

    return updated;
  }

  async toggleBlockConversation(tenantId: string, conversationId: string, actionUser: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { contact: true }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const newBlockedState = !(conv as any).isBlocked;

    const [updated] = await Promise.all([
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { isBlocked: newBlockedState } as any
      }),
      this.prisma.contact.update({
        where: { id: conv.contactId },
        data: { isBlocked: newBlockedState } as any
      })
    ]);

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conv.contactId,
      type: newBlockedState ? 'BLOCKED' : 'UNBLOCKED',
      actorUserId: actionUser.id
    });

    return updated;
  }

  async toggleFollowUp(tenantId: string, conversationId: string, actionUser: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const updated: any = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { requiresFollowUp: !(conv as any).requiresFollowUp } as any
    });

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conv.contactId,
      type: 'FOLLOW_UP_FLAGGED',
      actorUserId: actionUser.id,
      metadataJson: { requiresFollowUp: updated.requiresFollowUp }
    });

    return updated;
  }

  async addCollaborator(tenantId: string, conversationId: string, targetUserId: string, actionUser: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { contact: true }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const collaborator = await (this.prisma as any).conversationCollaborator.upsert({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId }
      },
      update: {},
      create: { conversationId, userId: targetUserId }
    });

    await this.notificationsService.createNotification(
      targetUserId,
      'Added as Collaborator',
      `You were added as a collaborator on a conversation with ${conv.contact.name || 'a customer'}.`,
      'inbox'
    ).catch(() => {});

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conv.contactId,
      type: 'COLLABORATOR_ADDED',
      actorUserId: actionUser.id,
      metadataJson: { targetUserId }
    });

    return collaborator;
  }

  async removeCollaborator(tenantId: string, conversationId: string, targetUserId: string, actionUser: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    await (this.prisma as any).conversationCollaborator.delete({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId }
      }
    }).catch(() => {});

    return { success: true };
  }

  async setConversationAssistant(tenantId: string, conversationId: string, aiAssistantId: string | null) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    if (aiAssistantId) {
      const assistant = await this.prisma.aiAssistant.findFirst({
        where: { id: aiAssistantId, tenantId }
      });
      if (!assistant) throw new NotFoundException('AI Assistant not found for this tenant');
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { aiAssistantId } as any
    });
  }

  async generateSummary(tenantId: string, conversationId: string, force: boolean = false) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { contact: true }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    // Return cached if within 1 hour and not forced
    if (!force && (conv as any).summary && (conv as any).summaryGeneratedAt) {
      const ageMs = Date.now() - new Date((conv as any).summaryGeneratedAt).getTime();
      if (ageMs < 3600000) {
        return { summary: (conv as any).summary, summaryGeneratedAt: (conv as any).summaryGeneratedAt, cached: true };
      }
    }

    // 1. Enforce AI Quota Limit Check
    await this.quotaService.checkAiQuota(tenantId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    if (messages.length === 0) {
      return { summary: 'No messages to summarize yet.', summaryGeneratedAt: new Date() };
    }

    const reversed = messages.reverse();
    const formattedTranscript = reversed.map(m => {
      const sender = m.direction === 'inbound' ? (conv.contact.name || 'Customer') : 'Agent/AI';
      const text = typeof m.content === 'object' && m.content !== null ? (m.content as any).body || (m.content as any).text || JSON.stringify(m.content) : String(m.content);
      return `${sender}: ${text}`;
    }).join('\n');

    const prompt = `You are a CRM assistant. Provide a concise, bullet-point summary in Bengali and English of the following conversation between customer and business. Focus on main intent, questions asked, resolution/status, and key next actions:\n\n${formattedTranscript}`;

    const summaryText = await this.aiService.generateCompletion(prompt);

    // 2. Track & Deduct 1 AI Response Credit
    let assistant = await this.prisma.aiAssistant.findFirst({
      where: { tenantId, isActive: true }
    });
    if (!assistant) {
      assistant = await this.prisma.aiAssistant.findFirst({
        where: { tenantId }
      });
    }

    if (!assistant) {
      assistant = await this.prisma.aiAssistant.create({
        data: {
          tenantId,
          modelProvider: 'openai',
          modelName: 'gpt-4o-mini',
          apiKeyMode: 'platform',
          routingMode: 'system_only'
        }
      });
    }

    await this.prisma.aiUsageLog.create({
      data: {
        tenantId,
        assistantId: assistant.id,
        tokensUsed: 250,
        costUsd: 0.0005
      }
    });

    const updated: any = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        summary: summaryText,
        summaryGeneratedAt: new Date()
      } as any
    });

    return { summary: updated.summary, summaryGeneratedAt: updated.summaryGeneratedAt, cached: false };
  }

  async getSharedFiles(tenantId: string, conversationId: string, page: number = 1, pageSize: number = 20) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const skip = (page - 1) * pageSize;
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          conversationId,
          type: { notIn: ['text', 'button'] }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.message.count({
        where: {
          conversationId,
          type: { notIn: ['text', 'button'] }
        }
      })
    ]);

    const items = messages.map(m => {
      const content: any = m.content;
      return {
        id: m.id,
        type: m.type,
        mediaUrl: content?.mediaUrl || content?.localUrl || null,
        caption: content?.body || content?.caption || '',
        createdAt: m.createdAt,
        direction: m.direction
      };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async assignAgent(tenantId: string, conversationId: string, agentId: string | null, actionUser: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedAgentId: agentId },
      include: { contact: true, assignedAgent: { select: { id: true, name: true } } }
    });

    if (agentId) {
      await this.prisma.notification.create({
        data: {
          userId: agentId,
          type: 'inbox',
          title: 'Conversation Assigned',
          message: `You were assigned to a conversation with ${conversation.contact.name || 'a customer'}.`,
          isRead: false
        }
      });
      
      await this.prisma.contactNote.create({
        data: {
          contactId: conversation.contactId,
          createdBy: actionUser.id,
          content: `Assigned conversation to ${conversation.assignedAgent?.name || 'Agent'}.`
        }
      });
    } else {
      await this.prisma.contactNote.create({
        data: {
          contactId: conversation.contactId,
          createdBy: actionUser.id,
          content: `Unassigned conversation.`
        }
      });
    }

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conversation.contactId,
      type: 'ASSIGNED',
      actorUserId: actionUser.id,
      metadataJson: { agentId, agentName: conversation.assignedAgent?.name || null }
    });

    return conversation;
  }

  async toggleAiReply(tenantId: string, conversationId: string, isAiEnabled: boolean, actionUser: any) {
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId, tenantId },
      data: { isAiEnabled },
      include: { contact: true }
    });

    await this.prisma.contactNote.create({
      data: {
        contactId: conversation.contactId,
        createdBy: actionUser.id,
        content: `AI Auto-Reply turned ${isAiEnabled ? 'ON' : 'OFF'} for this conversation.`
      }
    });

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conversation.contactId,
      type: 'AI_HANDOVER',
      actorUserId: actionUser.id,
      metadataJson: { isAiEnabled }
    });

    return conversation;
  }

  async getMessages(tenantId: string, conversationId: string) {
    await this.prisma.conversation.updateMany({
      where: { id: conversationId, tenantId },
      data: { unreadCount: 0 }
    });

    return this.prisma.message.findMany({
      where: { 
        conversationId,
        conversation: { tenantId }
      },
      include: {
        senderUser: { select: { id: true, name: true, profilePicUrl: true } },
        aiAssistant: { select: { id: true, agentName: true } }
      } as any,
      orderBy: { createdAt: 'asc' },
    });
  }

  async markMessagesRead(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId }
    });
    if (!conversation) return;

    if (conversation.channel === 'whatsapp') {
      await this.whatsappQueue.add('mark-read', { tenantId, conversationId });
    } else if (conversation.channel === 'messenger' || conversation.channel === 'instagram') {
      await this.messengerQueue.add('mark-read', { tenantId, conversationId });
    }
  }

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
    direction?: string;
  }) {
    // ── Subscription Security Guard ──────────────────────────────────────────
    // Verify tenant has an active subscription or valid trial before processing
    // any message. This prevents DB writes, WebSocket broadcasts, and AI triggers
    // for expired/suspended tenants while still returning 200 OK to Meta/webhook
    // senders so they do not retry indefinitely.
    const subStatus = await this.quotaService.isTenantSubscriptionActive(data.tenantId);
    if (!subStatus.isActive) {
      this.logger.warn(
        `[Webhook Security Guard] Dropped incoming ${data.channel} message for Tenant ${data.tenantId}: Subscription/Trial Inactive (${subStatus.reason}).`
      );
      return { dropped: true, reason: 'SUBSCRIPTION_INACTIVE' };
    }
    // ─────────────────────────────────────────────────────────────────────────

    const isOutboundFromPhone = data.direction === 'outbound';
    const direction = isOutboundFromPhone ? 'outbound' : 'inbound';
    const senderType = isOutboundFromPhone ? 'agent' : 'customer';
    const status = isOutboundFromPhone ? 'sent' : 'delivered';

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

    // Auto-extract phone number from message content if contact.phone is missing
    if (!contact.phone && typeof data.content === 'object' && data.content !== null) {
      const textVal = data.content.text || data.content.body || '';
      const phoneMatch = textVal.match(/(?:\+?88)?01[3-9]\d{8}/);
      if (phoneMatch) {
        const extractedPhone = phoneMatch[0];
        contact = await this.prisma.contact.update({
          where: { id: contact.id },
          data: { phone: extractedPhone }
        });
        if (this.inboxGateway) {
          this.inboxGateway.broadcastToTenant(data.tenantId, 'contact:updated', contact);
        }
      }
    }

    // Trigger Meta User Profile fetch (name) asynchronously if generic or missing
    if (['messenger', 'instagram'].includes(data.channel)) {
      const isGeneric = !contact.name || 
        contact.name === 'Messenger User' || 
        contact.name === 'Instagram User' || 
        contact.name === cleanId;
      if (isGeneric) {
        this.fetchAndUpdateMetaUserProfile(data.tenantId, contact.id, cleanId, data.channel).catch(() => {});
      }
    }

    let conversation = await this.prisma.conversation.findFirst({
      where: { 
        tenantId: data.tenantId, 
        contactId: contact.id, 
        channel: data.channel
      }
    });

    if ((contact as any).isBlocked || (conversation && (conversation as any).isBlocked)) {
      this.logger.warn(`Message dropped for blocked contact/conversation: ${contact.id}`);
      return { dropped: true, reason: 'blocked' };
    }

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId: data.tenantId,
          contactId: contact.id,
          channel: data.channel,
          channelConnectionId: data.channelConnectionId,
          lastMessageAt: data.timestamp,
          unreadCount: isOutboundFromPhone ? 0 : 1
        }
      });
    } else {
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { 
          lastMessageAt: data.timestamp, 
          status: conversation.status === 'resolved' ? 'open' : conversation.status,
          ...(!isOutboundFromPhone && { unreadCount: { increment: 1 } }),
          ...(data.channelConnectionId && { channelConnectionId: data.channelConnectionId })
        }
      });
    }

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

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        externalMessageId: data.externalMessageId,
        direction,
        type: data.messageType,
        content: contentToSave,
        status,
        senderType,
        createdAt: data.timestamp
      } as any
    });

    if (!isOutboundFromPhone) {
      this.orchestratorService.processMessage(message.id).catch(err => {
        this.logger.error(`Orchestrator failed for message ${message.id}: ${err.message}`);
      });
    }

    this.checkAndTriggerSummarization(conversation.id);

    return {
      message,
      conversation,
      contact
    };
  }

  private async checkAndTriggerSummarization(conversationId: string) {
    try {
      const count = await this.prisma.message.count({ where: { conversationId } });
      if (count >= 12 && (count === 12 || (count - 12) % 10 === 0)) {
        this.aiService.generateConversationSummary(conversationId).catch(err => {
          this.logger.error(`Failed to generate conversation summary for ${conversationId}: ${err.message}`);
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed checking message count for summarization: ${err.message}`);
    }
  }

  async checkBotLoopSafeguard(conversationId: string): Promise<boolean> {
    try {
      const last5Messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      if (last5Messages.length < 5) {
        return false;
      }

      const allAi = last5Messages.every(
        (m: any) => m.senderType === 'ai' || m.senderType === 'bot' || Boolean(m.aiAssistantId)
      );

      if (!allAi) {
        return false;
      }

      const newestTime = new Date(last5Messages[0].createdAt).getTime();
      const oldestTime = new Date(last5Messages[4].createdAt).getTime();
      const timeDiffMs = Math.abs(newestTime - oldestTime);

      if (timeDiffMs <= 30000) {
        const conversation = await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { isAiEnabled: false }
        });

        this.logger.warn(`AI Auto-Reply paused due to rapid back-to-front messaging loop for conversation ${conversationId}`);

        await this.notificationsService.createNotificationForTenantAdmins(
          conversation.tenantId,
          'AI Auto-Reply Paused',
          'AI Auto-Reply paused due to rapid back-to-front messaging loop.',
          'warning'
        ).catch((err: any) => {
          this.logger.error(`Failed to send bot loop notification: ${err.message}`);
        });

        await this.activityLogService.record({
          tenantId: conversation.tenantId,
          conversationId,
          contactId: conversation.contactId,
          type: 'AI_HANDOVER',
          actorUserId: undefined,
          metadataJson: { isAiEnabled: false, reason: 'bot_loop_detected' }
        }).catch(() => {});

        return true;
      }
    } catch (err: any) {
      this.logger.error(`Error in checkBotLoopSafeguard for conversation ${conversationId}: ${err.message}`);
    }

    return false;
  }

  async saveOutboundMessage(tenantId: string, conversationId: string, content: string, type: string = 'text', senderUserId?: string, aiAssistantId?: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { contact: true }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if ((conversation as any).isBlocked || (conversation.contact as any)?.isBlocked) {
      throw new Error('Cannot send messages to a blocked contact');
    }

    const senderType = aiAssistantId ? 'ai' : (senderUserId ? 'agent' : 'agent');

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        type,
        content: content,
        status: 'pending',
        senderType,
        senderUserId: senderUserId || null,
        aiAssistantId: aiAssistantId || (conversation as any).aiAssistantId || null,
      } as any
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() }
    });

    this.checkAndTriggerSummarization(conversation.id);

    if (senderType === 'ai' || aiAssistantId) {
      await this.checkBotLoopSafeguard(conversation.id);
    }


    let channelConnId: string | null = null;
    const activeConn = await this.prisma.channelConnection.findFirst({
      where: { tenantId, channelType: conversation.channel, status: 'active' }
    });
    if (activeConn) {
      channelConnId = activeConn.id;
      if (conversation.channelConnectionId !== activeConn.id) {
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { channelConnectionId: activeConn.id }
        }).catch(() => {});
      }
    } else {
      channelConnId = conversation.channelConnectionId;
    }

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
    } else if (conversation.channel === 'messenger' || conversation.channel === 'instagram') {
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
          channel: conversation.channel, // Pass channel so processor knows if it's instagram or messenger
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        }
      );
    }

    // Real-time WebSocket broadcast for outbound AI/Agent messages
    if (this.inboxGateway) {
      this.inboxGateway.broadcastToTenant(tenantId, 'new_message', {
        message,
        conversation,
        contact: conversation.contact,
        conversationId: conversation.id
      });
    }

    return { message, conversation };
  }

  async toggleLabel(tenantId: string, conversationId: string, labelId: string, actionUser?: any) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    
    if (!conv) {
      throw new Error('Conversation not found');
    }

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
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId: conv.contactId,
        type: 'TAG_REMOVED',
        actorUserId: actionUser?.id,
        metadataJson: { labelId }
      });
      return { added: false };
    } else {
      await this.prisma.conversationLabel.create({
        data: {
          conversationId,
          labelId
        }
      });
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId: conv.contactId,
        type: 'TAG_ADDED',
        actorUserId: actionUser?.id,
        metadataJson: { labelId }
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
      
      await (tx as any).conversationCollaborator.deleteMany({
        where: { conversationId }
      });

      await (tx as any).conversationActivity.deleteMany({
        where: { conversationId }
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

import { Injectable, Logger, Inject, forwardRef, NotFoundException, ForbiddenException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { ActivityLogService } from './activity-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as path from 'path';
import * as fs from 'fs';

import { InboxGateway } from './inbox.gateway';
import { QuotaService } from '../tenants/quota.service';

@Injectable()
export class InboxService implements OnModuleInit {
  private readonly logger = new Logger(InboxService.name);

  async onModuleInit() {
    try {
      // Retroactive sync: mark conversations with AI demo/inquiry notes as hasOrderRequest = true
      const demoNotes = await this.prisma.contactNote.findMany({
        where: {
          content: { startsWith: '[AI ' }
        },
        select: { contactId: true }
      });
      const contactIds = Array.from(new Set(demoNotes.map(n => n.contactId)));
      if (contactIds.length > 0) {
        const updated = await this.prisma.conversation.updateMany({
          where: {
            contactId: { in: contactIds },
            hasOrderRequest: false
          },
          data: { hasOrderRequest: true }
        });
        if (updated.count > 0) {
          this.logger.log(`Retroactively marked ${updated.count} conversation(s) with hasOrderRequest = true.`);
        }
      }
    } catch (e: any) {
      this.logger.error(`Retroactive hasOrderRequest sync failed: ${e.message}`);
    }
  }

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
        externalAccountId: true,
        verifyToken: true,
      }
    });

    const websiteWidgets = await this.prisma.websiteWidget.findMany({
      where: { tenantId, isActive: true },
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

  async renameChannel(tenantId: string, id: string, name: string) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new BadRequestException('Inbox name cannot be empty');
    }

    const conn = await this.prisma.channelConnection.findFirst({
      where: { id, tenantId }
    });

    if (conn) {
      return this.prisma.channelConnection.update({
        where: { id },
        data: { displayName: trimmedName }
      });
    }

    const widget = await this.prisma.websiteWidget.findFirst({
      where: { id, tenantId }
    });

    if (widget) {
      return this.prisma.websiteWidget.update({
        where: { id },
        data: { name: trimmedName }
      });
    }

    throw new NotFoundException('Channel or Widget not found');
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
      if (!isActive) {
        return this.prisma.websiteWidget.delete({
          where: { id }
        });
      }
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
      return this.prisma.websiteWidget.delete({
        where: { id }
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

    // Auto-fetch Meta User Profile for any contact with generic default name
    const genericConvs = conversations.filter(conv => {
      if (!conv.contact || !['messenger', 'instagram'].includes(conv.contact.channel)) return false;
      const name = conv.contact.name;
      return !name || name === 'Messenger User' || name === 'Instagram User' || name === conv.contact.externalContactId;
    });

    if (genericConvs.length > 0) {
      await Promise.allSettled(
        genericConvs.slice(0, 5).map(async conv => {
          const updated = await this.fetchAndUpdateMetaUserProfile(
            tenantId,
            conv.contact.id,
            conv.contact.externalContactId,
            conv.contact.channel,
            conv.channelConnectionId || undefined
          ).catch(() => null);
          if (updated && updated.name) {
            conv.contact.name = updated.name;
          }
        })
      );
      // Run background sync for remaining generic contacts
      if (genericConvs.length > 5) {
        for (const conv of genericConvs.slice(5)) {
          this.fetchAndUpdateMetaUserProfile(
            tenantId,
            conv.contact.id,
            conv.contact.externalContactId,
            conv.contact.channel,
            conv.channelConnectionId || undefined
          ).catch(() => {});
        }
      }
    }

    return conversations;
  }

  async fetchAndUpdateMetaUserProfile(
    tenantId: string, 
    contactId: string, 
    externalContactId: string, 
    channel: string,
    channelConnectionId?: string
  ) {
    try {
      if (!['messenger', 'instagram'].includes(channel)) return null;

      let connection: any = null;
      if (channelConnectionId) {
        connection = await this.prisma.channelConnection.findUnique({
          where: { id: channelConnectionId }
        });
      }

      if (!connection) {
        connection = await this.prisma.channelConnection.findFirst({
          where: {
            tenantId,
            channelType: channel,
            status: { in: ['active', 'connected', 'ACTIVE', 'CONNECTED'] }
          }
        });
      }

      if (!connection) {
        connection = await this.prisma.channelConnection.findFirst({
          where: { tenantId, channelType: channel }
        });
      }

      if (!connection || !connection.accessTokenEncrypted) {
        this.logger.debug(`No valid channel connection found for tenant ${tenantId} and channel ${channel}`);
        return null;
      }

      const pageToken = connection.accessTokenEncrypted;
      const pageId = connection.externalAccountId;
      let fullName: string | null = null;
      let profilePic: string | null = null;

      if (channel === 'messenger') {
        // Strategy 1: Direct PSID query with first_name,last_name,profile_pic
        // NOTE: Do NOT include 'name' field as Meta Graph API rejects it with error 100 on PSID
        try {
          const res = await fetch(`https://graph.facebook.com/v21.0/${externalContactId}?fields=first_name,last_name,profile_pic&access_token=${pageToken}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3500)
          });
          if (res.ok) {
            const data = await res.json();
            if (data.first_name || data.last_name) {
              fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
            }
            if (data.profile_pic) {
              profilePic = data.profile_pic;
            }
          } else {
            const errJson = await res.json().catch(() => ({}));
            this.logger.debug(`Direct PSID query returned status ${res.status}: ${JSON.stringify(errJson)}`);
          }
        } catch (err: any) {
          this.logger.debug(`Direct PSID profile fetch failed: ${err.message}`);
        }

        // Strategy 2: Query conversation thread participants via t_<PSID>
        if (!fullName) {
          try {
            const threadRes = await fetch(`https://graph.facebook.com/v21.0/t_${externalContactId}?fields=participants,senders&access_token=${pageToken}`, {
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(3500)
            });
            if (threadRes.ok) {
              const threadData = await threadRes.json();
              const parts = threadData.participants?.data || threadData.senders?.data || [];
              const userPart = parts.find((p: any) => p.id === externalContactId) || 
                               parts.find((p: any) => p.id !== pageId && p.name && p.name !== 'Facebook User');
              if (userPart?.name) {
                fullName = userPart.name.trim();
                this.logger.log(`Resolved Messenger name via thread t_${externalContactId}: "${fullName}"`);
              }
            }
          } catch (err: any) {
            this.logger.debug(`Thread lookup error: ${err.message}`);
          }
        }

        // Strategy 3: Query Page's recent conversations list
        if (!fullName && pageId) {
          try {
            const convRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/conversations?fields=participants,senders&limit=25&access_token=${pageToken}`, {
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(3500)
            });
            if (convRes.ok) {
              const convData = await convRes.json();
              for (const convItem of convData.data || []) {
                const parts = convItem.participants?.data || convItem.senders?.data || [];
                const match = parts.find((p: any) => p.id === externalContactId);
                if (match?.name) {
                  fullName = match.name.trim();
                  this.logger.log(`Resolved Messenger name via Page conversations list: "${fullName}"`);
                  break;
                }
              }
            }
          } catch (err: any) {
            this.logger.debug(`Page conversations lookup error: ${err.message}`);
          }
        }

        // Strategy 4: Check FacebookCommentLog
        if (!fullName) {
          try {
            const commentLog = await this.prisma.facebookCommentLog.findFirst({
              where: {
                tenantId,
                userExternalId: externalContactId,
                userName: { notIn: ['Facebook User', 'Messenger User', 'Instagram User', ''] }
              },
              select: { userName: true }
            });
            if (commentLog?.userName) {
              fullName = commentLog.userName.trim();
              this.logger.log(`Resolved Messenger name via facebookCommentLog: "${fullName}"`);
            }
          } catch (err: any) {
            // ignore
          }
        }
      } else if (channel === 'instagram') {
        // Strategy 1: Direct Instagram User query
        try {
          const res = await fetch(`https://graph.facebook.com/v21.0/${externalContactId}?fields=name,username,profile_pic&access_token=${pageToken}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3500)
          });
          if (res.ok) {
            const data = await res.json();
            if (data.name) fullName = data.name.trim();
            else if (data.username) fullName = data.username.trim();
            if (data.profile_pic) profilePic = data.profile_pic;
          }
        } catch (err: any) {
          this.logger.debug(`Instagram direct profile fetch error: ${err.message}`);
        }

        // Strategy 2: Thread lookup via t_<PSID>
        if (!fullName) {
          try {
            const threadRes = await fetch(`https://graph.facebook.com/v21.0/t_${externalContactId}?fields=participants&access_token=${pageToken}`, {
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(3500)
            });
            if (threadRes.ok) {
              const threadData = await threadRes.json();
              const parts = threadData.participants?.data || [];
              const userPart = parts.find((p: any) => p.id === externalContactId) || 
                               parts.find((p: any) => p.id !== pageId && (p.name || p.username));
              const name = userPart?.name || userPart?.username;
              if (name) {
                fullName = name.trim();
              }
            }
          } catch (err: any) {
            // ignore
          }
        }
      }

      if (fullName && fullName.trim() !== '') {
        const updatedContact = await this.prisma.contact.update({
          where: { id: contactId },
          data: { name: fullName.trim() }
        });
        this.logger.log(`Successfully updated Meta User Profile for ${channel} contact ${contactId}: "${fullName}"`);

        if (this.inboxGateway) {
          this.inboxGateway.broadcastToTenant(tenantId, 'contact:updated', updatedContact);
        }
        return updatedContact;
      }
    } catch (err: any) {
      this.logger.warn(`Failed fetching Meta user profile for ${externalContactId}: ${err.message}`);
    }
    return null;
  }

  async syncContactMetaProfile(tenantId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId }
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    const updated = await this.fetchAndUpdateMetaUserProfile(
      tenantId,
      contact.id,
      contact.externalContactId,
      contact.channel
    );
    return updated || contact;
  }

  extractPhoneFromText(text: string): string | null {
    if (!text || typeof text !== 'string') return null;

    const bnToEnMap: { [key: string]: string } = {
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
      '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    const convertedText = text.replace(/[০-৯]/g, m => bnToEnMap[m] || m);
    const normalized = convertedText.replace(/[\s\-\(\)]/g, '');

    const match = normalized.match(/(?:\+?88)?(01[3-9]\d{8})/);
    if (match && match[1]) {
      return match[1];
    }

    return null;
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
    const updateData: any = { isAiEnabled };
    if (isAiEnabled) {
      updateData.aiAutoPausedUntil = null;
    }
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId, tenantId },
      data: updateData,
      include: { contact: true }
    });

    await this.prisma.contactNote.create({
      data: {
        contactId: conversation.contactId,
        createdBy: actionUser?.id || actionUser?.userId,
        content: `AI Auto-Reply turned ${isAiEnabled ? 'ON' : 'OFF'} for this conversation.`
      }
    });

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conversation.contactId,
      type: 'AI_HANDOVER',
      actorUserId: actionUser?.id || actionUser?.userId,
      metadataJson: { isAiEnabled }
    });

    if (isAiEnabled) {
      this.inboxGateway.broadcastToTenant(tenantId, 'conversation:ai_resumed', {
        conversationId: conversation.id,
        isAiEnabled: true,
        aiAutoPausedUntil: null
      });
    }

    return conversation;
  }

  async resumeConversationAi(tenantId: string, conversationId: string, actionUser: any) {
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId, tenantId },
      data: { 
        isAiEnabled: true,
        aiAutoPausedUntil: null 
      },
      include: { contact: true }
    });

    await this.activityLogService.record({
      tenantId,
      conversationId,
      contactId: conversation.contactId,
      type: 'AI_HANDOVER',
      actorUserId: actionUser?.id || actionUser?.userId,
      metadataJson: { isAiEnabled: true, manualResume: true }
    });

    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:ai_resumed', {
      conversationId: conversation.id,
      isAiEnabled: true,
      aiAutoPausedUntil: null
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
          { tags: { has: `ext:${cleanId}` } },
          { tags: { has: `ext:${strippedId}` } },
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
          name: isOutboundFromPhone ? cleanId : (data.contactName || cleanId),
          phone: data.channel === 'whatsapp' ? strippedId : undefined,
          lastSeenAt: data.timestamp,
          stageId: firstStage?.id || null
        }
      });
    } else {
      const isGenericCurrent = !contact.name || 
        contact.name === 'Messenger User' || 
        contact.name === 'Instagram User' || 
        contact.name === contact.externalContactId;
      const isNewNameReal = data.contactName && 
        data.contactName !== data.externalContactId && 
        data.contactName !== 'Messenger User' && 
        data.contactName !== 'Instagram User';

      const newName = (!isOutboundFromPhone && isNewNameReal)
                        ? data.contactName 
                        : (isGenericCurrent && isNewNameReal ? data.contactName : contact.name);

      contact = await this.prisma.contact.update({
        where: { id: contact.id },
        data: { 
          lastSeenAt: data.timestamp, 
          name: newName,
          phone: data.channel === 'whatsapp' && !contact.phone ? strippedId : contact.phone
        }
      });
    }

    // Auto-extract phone number from message content if contact.phone is missing
    const textContent = typeof data.content === 'string' 
      ? data.content 
      : (data.content?.text || data.content?.body || data.content?.caption || '');
    
    if (!contact.phone && textContent) {
      const extractedPhone = this.extractPhoneFromText(textContent);
      if (extractedPhone) {
        contact = await this.prisma.contact.update({
          where: { id: contact.id },
          data: { phone: extractedPhone }
        });
        this.logger.log(`Auto-extracted phone number for contact ${contact.id}: ${extractedPhone}`);
        if (this.inboxGateway) {
          this.inboxGateway.broadcastToTenant(data.tenantId, 'contact:updated', contact);
        }
      }
    }

    // Auto-consolidation: Check if another contact exists in the same tenant with the same phone on this channel
    if (contact.phone) {
      try {
        const normalizedPhone = contact.phone.replace(/[\s\-\+]/g, '').slice(-10);
        const existingSamePhoneContact: any = await this.prisma.contact.findFirst({
          where: {
            tenantId: data.tenantId,
            channel: data.channel,
            id: { not: contact.id },
            OR: [
              { phone: contact.phone },
              { phone: { endsWith: normalizedPhone } }
            ]
          },
          include: {
            conversations: {
              where: { channel: data.channel },
              orderBy: { lastMessageAt: 'asc' }
            }
          }
        });

        if (existingSamePhoneContact && existingSamePhoneContact.conversations?.length > 0) {
          const primaryConv = existingSamePhoneContact.conversations[0];
          const currentConv = await this.prisma.conversation.findFirst({
            where: { tenantId: data.tenantId, contactId: contact.id, channel: data.channel }
          });

          if (currentConv && currentConv.id !== primaryConv.id) {
            this.logger.log(`Auto-consolidating duplicate conversation ${currentConv.id} into primary conversation ${primaryConv.id} for phone ${contact.phone}`);
            await this.mergeConversations(data.tenantId, primaryConv.id, currentConv.id);
            if (this.inboxGateway) {
              this.inboxGateway.broadcastToTenant(data.tenantId, 'conversation:deleted', { id: currentConv.id });
              this.inboxGateway.broadcastToTenant(data.tenantId, 'conversation:merged', {
                primaryConversationId: primaryConv.id,
                secondaryConversationId: currentConv.id
              });
            }
          }
          contact = existingSamePhoneContact;
        }
      } catch (autoMergeErr: any) {
        this.logger.warn(`Auto-consolidation by phone warning: ${autoMergeErr.message}`);
      }
    }

    if (!contact) {
      return { dropped: true, reason: 'contact_not_found' };
    }

    // Trigger Meta User Profile fetch (name) asynchronously if generic or missing
    if (['messenger', 'instagram'].includes(data.channel)) {
      const isGeneric = !contact.name || 
        contact.name === 'Messenger User' || 
        contact.name === 'Instagram User' || 
        contact.name === cleanId;
      if (isGeneric) {
        this.fetchAndUpdateMetaUserProfile(data.tenantId, contact.id, cleanId, data.channel, data.channelConnectionId).catch(() => {});
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
      if (data.messageType === 'audio') {
        // --- Check if AI auto-reply is enabled before running Whisper (cost saving) ---
        // If AI is explicitly turned off on the channel connection, skip transcription entirely.
        let isAiEnabled = true;
        if (data.channelConnectionId) {
          const channelConn = await this.prisma.channelConnection?.findUnique({
            where: { id: data.channelConnectionId },
            select: { isAiAutoReplyEnabled: true }
          });
          if (channelConn && channelConn.isAiAutoReplyEnabled === false) {
            isAiEnabled = false;
          }
        }

        if (!isAiEnabled) {
          this.logger.debug(`AI is disabled for channel connection ${data.channelConnectionId ?? 'unknown'}, skipping audio transcription.`);
        } else {
          // --- Unified audio transcription for ALL channels ---
          // Priority 1: localUrl — WhatsApp Cloud API & WhatsApp Web (file already on disk)
          const diskPath = data.content?.localUrl || data.content?.mediaUrl;
          // Priority 2: remote url — Messenger / Instagram (CDN URL, no local file yet)
          const remoteUrl = !diskPath ? (data.content?.url) : null;

          if (diskPath) {
            const normalizedPath = diskPath.startsWith('/') ? diskPath.slice(1) : diskPath;
            const filePath = path.join(process.cwd(), normalizedPath);
            if (fs.existsSync(filePath)) {
              this.logger.log(`Transcribing audio from disk for tenant ${data.tenantId}: ${filePath}`);
              const transcript = await this.aiService.transcribeAudio(filePath, data.tenantId);
              contentToSave = { ...contentToSave, transcript };
              // Audio file kept on disk: counts toward tenant storage, agent can play it back
            } else {
              this.logger.warn(`Audio file not found on disk, skipping transcription: ${filePath}`);
            }
          } else if (remoteUrl) {
            // Messenger / Instagram: download to OS tmpdir, transcribe, auto-delete temp file
            this.logger.log(`Transcribing audio from CDN URL for tenant ${data.tenantId}`);
            const transcript = await this.aiService.transcribeFromUrl(remoteUrl, data.tenantId);
            contentToSave = { ...contentToSave, transcript };
          }
        }

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

    if (isOutboundFromPhone) {
      if (typeof contentToSave === 'object' && contentToSave !== null) {
        contentToSave = { ...contentToSave, isExternalSync: true };
      } else {
        contentToSave = { body: contentToSave, isExternalSync: true };
      }
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

    // Broadcast real-time Socket.io event to tenant dashboard
    if (this.inboxGateway) {
      this.inboxGateway.broadcastToTenant(data.tenantId, 'new_message', {
        message,
        conversation,
        contact,
        conversationId: conversation.id
      });
    }

    return {
      message,
      conversation,
      contact
    };
  }

  async checkBotLoopSafeguard(conversationId: string): Promise<boolean> {
    try {
      const recentMessages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (recentMessages.length < 5) {
        return false;
      }

      // Filter out media/image messages (e.g. multi-product photo catalog dispatches)
      // Batch product photos sent in a single customer inquiry turn must NEVER count as runaway bot loop
      const nonMediaMessages = recentMessages.filter(
        (m: any) => m.type !== 'image' && m.type !== 'audio' && m.type !== 'video'
      );

      if (nonMediaMessages.length < 5) {
        return false;
      }

      const last5 = nonMediaMessages.slice(0, 5);

      const allAi = last5.every(
        (m: any) => m.senderType === 'ai' || m.senderType === 'bot' || Boolean(m.aiAssistantId)
      );

      if (!allAi) {
        // Also check: Is there a ping-pong loop with an external customer bot?
        // E.g. alternating messages where customer bot sends the exact same text 3+ times in a row within 30s
        const inboundTextMessages = recentMessages.filter((m: any) => m.direction === 'inbound' && m.type === 'text');
        if (inboundTextMessages.length >= 3) {
          const firstText = (typeof inboundTextMessages[0].content === 'string' ? inboundTextMessages[0].content : '').trim().toLowerCase();
          const isIdenticalBotSpam = firstText.length > 5 && inboundTextMessages.slice(0, 3).every(
            (m: any) => (typeof m.content === 'string' ? m.content : '').trim().toLowerCase() === firstText
          );
          const timeSpan = Math.abs(new Date(inboundTextMessages[0].createdAt).getTime() - new Date(inboundTextMessages[2].createdAt).getTime());
          if (isIdenticalBotSpam && timeSpan <= 30000) {
            const conversation = await this.prisma.conversation.update({
              where: { id: conversationId },
              data: { isAiEnabled: false }
            });

            this.logger.warn(`AI Auto-Reply paused due to external bot auto-responder ping-pong loop for conversation ${conversationId}`);

            await this.notificationsService.createNotificationForTenantAdmins(
              conversation.tenantId,
              'AI Auto-Reply Paused',
              'AI Auto-Reply paused: External automated bot auto-responder loop detected.',
              'warning'
            ).catch(() => {});

            await this.activityLogService.record({
              tenantId: conversation.tenantId,
              conversationId,
              contactId: conversation.contactId,
              type: 'AI_HANDOVER',
              actorUserId: undefined,
              metadataJson: { isAiEnabled: false, reason: 'external_bot_loop_detected' }
            }).catch(() => {});

            return true;
          }
        }

        return false;
      }

      const newestTime = new Date(last5[0].createdAt).getTime();
      const oldestTime = new Date(last5[4].createdAt).getTime();
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

    const convUpdateData: any = { lastMessageAt: new Date() };

    // Smart Human Takeover: When a human agent sends a message, auto-pause AI for this conversation
    if (!aiAssistantId && senderUserId) {
      convUpdateData.lastHumanMessageAt = new Date();
      try {
        const assistant = await this.prisma.aiAssistant.findFirst({
          where: { tenantId },
          select: { smartAutoPauseEnabled: true, smartAutoPauseMinutes: true }
        });
        const isPauseEnabled = assistant ? assistant.smartAutoPauseEnabled !== false : true;
        if (isPauseEnabled) {
          const pauseMinutes = assistant?.smartAutoPauseMinutes || 5;
          const pauseUntil = new Date(Date.now() + pauseMinutes * 60 * 1000);
          convUpdateData.aiAutoPausedUntil = pauseUntil;

          this.inboxGateway.broadcastToTenant(tenantId, 'conversation:ai_paused', {
            conversationId: conversation.id,
            aiAutoPausedUntil: pauseUntil,
            pauseMinutes
          });
        }
      } catch (err: any) {
        this.logger.error(`Failed to calculate smart auto-pause for conversation ${conversation.id}: ${err.message}`);
      }
    }

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: convUpdateData
    });

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
      throw new NotFoundException('Conversation not found');
    }

    // 1. Fetch all messages in this conversation to find physical media files on disk
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      select: { content: true }
    });

    // 2. Extract disk paths of media files and physically delete them from disk storage
    for (const msg of messages) {
      let contentObj: any = msg.content;
      if (typeof contentObj === 'string' && contentObj.trim().startsWith('{')) {
        try { contentObj = JSON.parse(contentObj); } catch (e) {}
      }
      if (typeof contentObj === 'object' && contentObj !== null) {
        const mediaUrls = [
          contentObj.mediaUrl,
          contentObj.localUrl,
          contentObj.url,
          contentObj.fileUrl,
        ].filter(Boolean);

        for (const relUrl of mediaUrls) {
          if (typeof relUrl === 'string' && (relUrl.includes('/uploads/') || relUrl.startsWith('uploads/'))) {
            const cleanRelPath = relUrl.startsWith('/') ? relUrl.slice(1) : relUrl;
            const absoluteFilePath = path.join(process.cwd(), cleanRelPath);
            if (fs.existsSync(absoluteFilePath)) {
              try {
                const fileStats = fs.statSync(absoluteFilePath);
                fs.unlinkSync(absoluteFilePath);
                
                if (fileStats.size > 0) {
                  await this.prisma.tenant.update({
                    where: { id: tenantId },
                    data: {
                      storageUsedBytes: {
                        decrement: BigInt(fileStats.size)
                      }
                    }
                  }).catch(() => {});
                }
              } catch (unlinkErr) {
                this.logger.warn(`Failed to unlink media file ${absoluteFilePath}: ${unlinkErr.message}`);
              }
            }
          }
        }
      }
    }

    // 3. Database transaction to hard-delete all conversation records
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

  async mergeConversations(
    tenantId: string,
    primaryConversationId: string,
    secondaryConversationId: string,
    actorUser?: any
  ) {
    if (!primaryConversationId || !secondaryConversationId || primaryConversationId === secondaryConversationId) {
      throw new BadRequestException('Cannot merge a conversation into itself or invalid conversation IDs');
    }

    const [primary, secondary] = await Promise.all([
      this.prisma.conversation.findFirst({
        where: { id: primaryConversationId, tenantId },
        include: { contact: true, labels: true }
      }),
      this.prisma.conversation.findFirst({
        where: { id: secondaryConversationId, tenantId },
        include: { contact: true, labels: true }
      })
    ]);

    if (!primary) throw new NotFoundException('Primary conversation not found');
    if (!secondary) throw new NotFoundException('Secondary conversation not found');

    const primaryContactId = primary.contactId;
    const secondaryContactId = secondary.contactId;

    return this.prisma.$transaction(async (tx) => {
      // 1. Re-point messages from secondary conversation to primary conversation
      await tx.message.updateMany({
        where: { conversationId: secondaryConversationId },
        data: { conversationId: primaryConversationId }
      });

      // 2. Re-point orders linked to secondary conversation
      await tx.order.updateMany({
        where: { conversationId: secondaryConversationId },
        data: { conversationId: primaryConversationId, contactId: primaryContactId }
      });

      // 3. Merge conversation labels
      const existingLabelIds = new Set(primary.labels.map(l => l.labelId));
      for (const secLabel of secondary.labels) {
        if (!existingLabelIds.has(secLabel.labelId)) {
          try {
            await tx.conversationLabel.create({
              data: {
                conversationId: primaryConversationId,
                labelId: secLabel.labelId
              }
            });
          } catch (e) {}
        }
      }

      // 4. Update primary conversation timestamps & unread count
      const primaryLast = new Date(primary.lastMessageAt).getTime();
      const secondaryLast = new Date(secondary.lastMessageAt).getTime();
      const latestMessageAt = new Date(Math.max(primaryLast, secondaryLast));

      const updatedPrimaryConv = await tx.conversation.update({
        where: { id: primaryConversationId },
        data: {
          lastMessageAt: latestMessageAt,
          unreadCount: (primary.unreadCount || 0) + (secondary.unreadCount || 0),
          hasOrderRequest: primary.hasOrderRequest || secondary.hasOrderRequest,
          requiresFollowUp: primary.requiresFollowUp || secondary.requiresFollowUp
        },
        include: {
          contact: true,
          labels: { include: { label: true } },
          assignedAgent: { select: { id: true, name: true, email: true, profilePicUrl: true } }
        }
      });

      // 5. Delete secondary conversation records (collaborators & activities cascade)
      try {
        await (tx as any).conversationCollaborator?.deleteMany?.({
          where: { conversationId: secondaryConversationId }
        });
      } catch (e) {}

      try {
        await (tx as any).conversationActivity?.deleteMany?.({
          where: { conversationId: secondaryConversationId }
        });
      } catch (e) {}

      await tx.conversationLabel.deleteMany({
        where: { conversationId: secondaryConversationId }
      });

      await tx.conversation.delete({
        where: { id: secondaryConversationId }
      });

      // 6. If secondary contact differs from primary contact, merge contact records
      if (primaryContactId !== secondaryContactId) {
        // Transfer notes
        await tx.contactNote.updateMany({
          where: { contactId: secondaryContactId },
          data: { contactId: primaryContactId }
        });

        // Transfer campaign leads
        await tx.campaignLead.updateMany({
          where: { contactId: secondaryContactId },
          data: { contactId: primaryContactId }
        });

        // Transfer broadcast recipients
        await tx.broadcastRecipient.updateMany({
          where: { contactId: secondaryContactId },
          data: { contactId: primaryContactId }
        });

        // Transfer any remaining orders on secondary contact
        await tx.order.updateMany({
          where: { contactId: secondaryContactId },
          data: { contactId: primaryContactId }
        });

        // Consolidate contact profile info (phone, address, email)
        const secContact = secondary.contact;
        const priContact = primary.contact;
        const updateData: any = {};
        if (!priContact.phone && secContact.phone) updateData.phone = secContact.phone;
        if (!priContact.email && secContact.email) updateData.email = secContact.email;
        if (!priContact.address && secContact.address) updateData.address = secContact.address;
        if (!priContact.company && secContact.company) updateData.company = secContact.company;

        // Preserve external ID alias as tags on primary contact so future incoming messages auto-route here
        const priTags = Array.isArray(priContact.tags) ? [...priContact.tags] : [];
        if (secContact.externalContactId && !priTags.includes(`ext:${secContact.externalContactId}`)) {
          priTags.push(`ext:${secContact.externalContactId}`);
          updateData.tags = priTags;
        }

        if (Object.keys(updateData).length > 0) {
          await tx.contact.update({
            where: { id: primaryContactId },
            data: updateData
          });
        }

        // Check if secondary contact has any other conversations
        const remainingConvs = await tx.conversation.count({
          where: { contactId: secondaryContactId }
        });

        if (remainingConvs === 0) {
          try {
            await tx.contact.delete({
              where: { id: secondaryContactId }
            });
          } catch (err: any) {
            this.logger.warn(`Could not delete orphaned contact ${secondaryContactId}: ${err.message}`);
          }
        }
      }

      this.logger.log(`Merged conversation ${secondaryConversationId} into ${primaryConversationId} for tenant ${tenantId}`);

      return {
        success: true,
        primaryConversationId,
        secondaryConversationId,
        conversation: updatedPrimaryConv
      };
    });
  }

  async handleMessageStatusUpdate(statusObj: any) {
    if (!statusObj?.id || !statusObj?.status) return;

    try {
      const externalMessageId = statusObj.id;
      const newStatus = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
      
      let errorMessage: string | undefined = undefined;
      
      if (newStatus === 'failed' && statusObj.errors && statusObj.errors.length > 0) {
        const err = statusObj.errors[0];
        errorMessage = err.title || err.message || err.error_data?.details || 'Unknown Error';
      }

      // Update Message Table
      const updatedMessage = await this.prisma.message.findFirst({
        where: { externalMessageId }
      });

      if (updatedMessage) {
        await this.prisma.message.updateMany({
          where: { externalMessageId },
          data: { 
            status: newStatus,
            ...(errorMessage ? { errorMessage } : {})
          }
        });
        
        // Broadcast UI update
        if (this.inboxGateway) {
          const conversation = await this.prisma.conversation.findUnique({
            where: { id: updatedMessage.conversationId }
          });
          if (conversation) {
            this.inboxGateway.broadcastToTenant(conversation.tenantId, 'message:status', {
              messageId: updatedMessage.id,
              conversationId: conversation.id,
              status: newStatus,
              errorMessage
            });
          }
        }
      }

      // Update BroadcastRecipient Table if applicable
      await this.prisma.broadcastRecipient.updateMany({
        where: { externalMessageId },
        data: { 
          status: newStatus,
          ...(errorMessage ? { errorMessage } : {})
        }
      });
      
    } catch (err) {
      this.logger.error(`Error in handleMessageStatusUpdate: ${err.message}`);
    }
  }
}

import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, UseInterceptors, UploadedFile, Delete, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { InboxService } from './inbox.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGuard, RequireFeature } from '../auth/guards/feature.guard';
import { InboxGateway } from './inbox.gateway';
import { QuotaService } from '../tenants/quota.service';
import { ActivityLogService } from './activity-log.service';
import { UserPresenceService } from './user-presence.service';
import { StorageService } from '../storage/storage.service';

@Controller('inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(
    private readonly inboxService: InboxService,
    private readonly inboxGateway: InboxGateway,
    private readonly quotaService: QuotaService,
    private readonly activityLogService: ActivityLogService,
    private readonly userPresenceService: UserPresenceService,
    private readonly storageService: StorageService,
  ) {}

  @Get('channels')
  async getActiveChannels(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.inboxService.getActiveChannels(tenantId);
  }

  @Patch('channels/:id/rename')
  async renameChannel(
    @Request() req: any,
    @Param('id') channelId: string,
    @Body() body: { displayName?: string; name?: string }
  ) {
    const tenantId = req.user.tenantId;
    const nameToUse = body.displayName || body.name || '';
    return this.inboxService.renameChannel(tenantId, channelId, nameToUse);
  }

  @Patch('channels/:id/ai-reply')
  async toggleChannelAiReply(
    @Request() req: any,
    @Param('id') channelConnectionId: string,
    @Body() body: { isAiAutoReplyEnabled: boolean }
  ) {
    const tenantId = req.user.tenantId;
    return this.inboxService.toggleChannelAiReply(tenantId, channelConnectionId, body.isAiAutoReplyEnabled);
  }

  @Patch('channels/:id/status')
  async toggleChannelActiveStatus(
    @Request() req: any,
    @Param('id') channelConnectionId: string,
    @Body() body: { isActive: boolean }
  ) {
    const tenantId = req.user.tenantId;
    return this.inboxService.toggleChannelActiveStatus(tenantId, channelConnectionId, body.isActive);
  }

  @Patch('channels/:id/ignore-groups')
  async toggleIgnoreGroupMessages(
    @Request() req: any,
    @Param('id') channelConnectionId: string,
    @Body() body: { ignoreGroupMessages: boolean }
  ) {
    const tenantId = req.user.tenantId;
    return this.inboxService.toggleIgnoreGroupMessages(tenantId, channelConnectionId, body.ignoreGroupMessages);
  }

  @Post('channels/:id/reconnect')
  async reconnectChannel(@Request() req: any, @Param('id') channelConnectionId: string) {
    const tenantId = req.user.tenantId;
    return this.inboxService.reconnectChannel(tenantId, channelConnectionId);
  }

  @Delete('channels/:id')
  async deleteChannel(@Request() req: any, @Param('id') channelConnectionId: string) {
    const tenantId = req.user.tenantId;
    return this.inboxService.deleteChannel(tenantId, channelConnectionId);
  }

  @Post('channels/website-widget/:id/test-ping')
  async testPingWebsiteWidget(@Request() req: any, @Param('id') widgetId: string) {
    const tenantId = req.user.tenantId;
    const result = await this.inboxService.testPingWebsiteWidget(tenantId, widgetId);
    if (result && result.message) {
      this.inboxGateway.broadcastToTenant(tenantId, 'new_message', {
        message: result.message,
        conversation: result.conversation,
        contact: result.contact,
        conversationId: result.conversation.id
      });
    }
    return { success: true, message: 'Test ping message sent to Inbox' };
  }

  @Get('conversations')
  async getConversations(
    @Request() req: any,
    @Query('view') view?: string,
    @Query('channel') channel?: string
  ) {
    const tenantId = req.user.tenantId;
    return this.inboxService.getConversations(tenantId, req.user, view, channel);
  }

  @Get('counts')
  async getInboxCounts(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.inboxService.getInboxCounts(tenantId, req.user);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.inboxService.getUnreadCount(tenantId, req.user);
  }

  @Get('conversations/:id/messages')
  async getMessages(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const messages = await this.inboxService.getMessages(tenantId, id);
    
    // Broadcast conversation read event to update UI badge in real-time
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:read', { conversationId: id });
    
    // Send read receipts to the messaging provider (e.g. Baileys WhatsApp)
    await this.inboxService.markMessagesRead(tenantId, id);
    
    return messages;
  }

  @Post('messages')
  async sendMessage(@Request() req: any, @Body() body: { conversationId: string, content: string }) {
    const tenantId = req.user.tenantId;
    await this.quotaService.checkMessageQuota(tenantId);

    const { message, conversation } = await this.inboxService.saveOutboundMessage(
      tenantId,
      body.conversationId,
      body.content,
      'text',
      req.user.userId || req.user.id
    );
    
    this.inboxGateway.broadcastToTenant(tenantId, 'new_message', {
      message,
      conversationId: conversation.id
    });

    return message;
  }

  @Post('messages/media')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }
  }))
  async sendMediaMessage(
    @Request() req: any, 
    @Body() body: { conversationId: string, content?: string, type?: string },
    @UploadedFile() file: Express.Multer.File
  ) {
    const tenantId = req.user.tenantId;

    // 1. Upload, compress images via progressive JPEG, and track quota in tenant storage
    const uploadResult = await this.storageService.uploadChatMedia(file, tenantId);

    // 2. Derive channel message type
    const type = body.type || (
      uploadResult.mimeType.startsWith('video') ? 'video' :
      uploadResult.mimeType.startsWith('image') ? 'image' :
      uploadResult.mimeType.startsWith('audio') ? 'audio' : 'document'
    );

    // 3. Quota calculation based on media type & duration/size:
    // Text: 1, Image: 1, Long Audio (>250KB): 2, Short Audio (<=250KB): 1, Other media: 1
    const isAudio = type === 'audio' || uploadResult.mimeType.startsWith('audio');
    const isLongAudio = isAudio && (uploadResult.sizeBytes > 250 * 1024);
    const quotaCost = isLongAudio ? 2 : 1;

    // 4. Check message quota with required units
    if (quotaCost > 1) {
      await this.quotaService.checkMessageQuota(tenantId, quotaCost);
    } else {
      await this.quotaService.checkMessageQuota(tenantId);
    }

    const contentPayload = {
      body: body.content || '',
      mediaUrl: uploadResult.publicUrl,
      fileName: uploadResult.fileName,
      mimeType: uploadResult.mimeType,
      sizeBytes: uploadResult.sizeBytes,
      quotaCost,
    };

    const { message, conversation } = await this.inboxService.saveOutboundMessage(
      tenantId,
      body.conversationId,
      contentPayload as any,
      type,
      req.user.userId || req.user.id
    );
    
    this.inboxGateway.broadcastToTenant(tenantId, 'new_message', {
      message,
      conversationId: conversation.id
    });

    return message;
  }

  @Patch('conversations/:id/assign')
  async assignAgent(@Request() req: any, @Param('id') conversationId: string, @Body() body: { agentId: string | null }) {
    const tenantId = req.user.tenantId;
    const conversation = await this.inboxService.assignAgent(tenantId, conversationId, body.agentId, req.user);
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:collaboratorAdded', { conversationId });
    return conversation;
  }

  @Patch('conversations/:id/toggle-ai')
  async toggleAiReply(@Request() req: any, @Param('id') conversationId: string, @Body() body: { isAiEnabled: boolean }) {
    const tenantId = req.user.tenantId;
    return this.inboxService.toggleAiReply(tenantId, conversationId, body.isAiEnabled, req.user);
  }

  @Post('conversations/:id/resume-ai')
  async resumeConversationAi(@Request() req: any, @Param('id') conversationId: string) {
    const tenantId = req.user.tenantId;
    return this.inboxService.resumeConversationAi(tenantId, conversationId, req.user);
  }

  @Post('conversations/:id/labels')
  async toggleLabel(@Request() req: any, @Param('id') conversationId: string, @Body() body: { labelId: string }) {
    const tenantId = req.user.tenantId;
    return this.inboxService.toggleLabel(tenantId, conversationId, body.labelId, req.user);
  }

  @Patch('conversations/:id/star')
  async toggleStar(@Request() req: any, @Param('id') conversationId: string) {
    const tenantId = req.user.tenantId;
    const updated: any = await this.inboxService.toggleStar(tenantId, conversationId, req.user);
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:starred', {
      conversationId,
      isStarred: updated.isStarred
    });
    return updated;
  }

  @Patch('conversations/:id/archive')
  async archiveConversation(@Request() req: any, @Param('id') conversationId: string) {
    const tenantId = req.user.tenantId;
    const updated: any = await this.inboxService.archiveConversation(tenantId, conversationId, req.user);
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:archived', {
      conversationId,
      isArchived: true
    });
    return updated;
  }

  @Patch('conversations/:id/unarchive')
  async unarchiveConversation(@Request() req: any, @Param('id') conversationId: string) {
    const tenantId = req.user.tenantId;
    const updated: any = await this.inboxService.unarchiveConversation(tenantId, conversationId, req.user);
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:archived', {
      conversationId,
      isArchived: false
    });
    return updated;
  }

  @Patch('conversations/:id/block')
  async toggleBlock(@Request() req: any, @Param('id') conversationId: string) {
    const tenantId = req.user.tenantId;
    const updated: any = await this.inboxService.toggleBlockConversation(tenantId, conversationId, req.user);
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:blocked', {
      conversationId,
      isBlocked: updated.isBlocked
    });
    return updated;
  }

  @Patch('conversations/:id/resolve')
  async resolveConversation(@Request() req: any, @Param('id') conversationId: string) {
    const tenantId = req.user.tenantId;
    const updated: any = await this.inboxService.resolveConversation(tenantId, conversationId, req.user);
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:resolved', {
      conversationId,
      resolvedAt: updated.resolvedAt
    });
    return updated;
  }

  @Patch('conversations/:id/reopen')
  async reopenConversation(@Request() req: any, @Param('id') conversationId: string) {
    const tenantId = req.user.tenantId;
    const updated: any = await this.inboxService.reopenConversation(tenantId, conversationId, req.user);
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:resolved', {
      conversationId,
      resolvedAt: null
    });
    return updated;
  }

  @Patch('conversations/:id/follow-up')
  async toggleFollowUp(@Request() req: any, @Param('id') conversationId: string) {
    const tenantId = req.user.tenantId;
    const updated: any = await this.inboxService.toggleFollowUp(tenantId, conversationId, req.user);
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:followUpFlagged', {
      conversationId,
      requiresFollowUp: updated.requiresFollowUp
    });
    return updated;
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('inbox_multi_agent_collaborators')
  @Post('conversations/:id/collaborators')
  async addCollaborator(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() body: { userId: string }
  ) {
    const tenantId = req.user.tenantId;
    const collaborator = await this.inboxService.addCollaborator(tenantId, conversationId, body.userId, req.user);
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:collaboratorAdded', {
      conversationId,
      userId: body.userId
    });
    return collaborator;
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('inbox_multi_agent_collaborators')
  @Delete('conversations/:id/collaborators/:userId')
  async removeCollaborator(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Param('userId') targetUserId: string
  ) {
    const tenantId = req.user.tenantId;
    return this.inboxService.removeCollaborator(tenantId, conversationId, targetUserId, req.user);
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('inbox_multi_ai_assistant_picker')
  @Patch('conversations/:id/assistant')
  async setConversationAssistant(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() body: { aiAssistantId: string | null }
  ) {
    const tenantId = req.user.tenantId;
    return this.inboxService.setConversationAssistant(tenantId, conversationId, body.aiAssistantId);
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('inbox_ai_summary')
  @Post('conversations/:id/summary')
  async generateSummary(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() body: { force?: boolean }
  ) {
    const tenantId = req.user.tenantId;
    const result = await this.inboxService.generateSummary(tenantId, conversationId, !!body?.force);
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:summaryReady', {
      conversationId,
      summary: result.summary,
      summaryGeneratedAt: result.summaryGeneratedAt
    });
    return result;
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('inbox_activity_timeline')
  @Get('conversations/:id/activity')
  async getActivity(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const tenantId = req.user.tenantId;
    return this.activityLogService.getActivityForConversation(
      tenantId,
      conversationId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20
    );
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('inbox_shared_files')
  @Get('conversations/:id/files')
  async getSharedFiles(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const tenantId = req.user.tenantId;
    return this.inboxService.getSharedFiles(
      tenantId,
      conversationId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20
    );
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('agent_presence')
  @Patch('presence')
  async updatePresence(@Request() req: any, @Body() body: { status: string }) {
    const userId = req.user.userId || req.user.id;
    const tenantId = req.user.tenantId;
    const result = await this.userPresenceService.updatePresence(userId, body.status);
    if (tenantId) {
      this.inboxGateway.broadcastToTenant(tenantId, 'presence:changed', {
        userId,
        status: result.status
      });
    }
    return result;
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('agent_presence')
  @Get('presence')
  async getTeamPresence(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.userPresenceService.getTeamPresence(tenantId);
  }

  @Delete('conversations/:id')
  async deleteConversation(@Request() req: any, @Param('id') conversationId: string) {
    const tenantId = req.user.tenantId;
    return this.inboxService.deleteConversation(conversationId, tenantId);
  }

  @Post('contacts/:id/sync-meta-profile')
  async syncContactMetaProfile(@Request() req: any, @Param('id') contactId: string) {
    const tenantId = req.user.tenantId;
    return this.inboxService.syncContactMetaProfile(tenantId, contactId);
  }

  @Post('conversations/:id/merge')
  async mergeConversations(
    @Request() req: any,
    @Param('id') primaryConversationId: string,
    @Body() body: { secondaryConversationId: string }
  ) {
    const tenantId = req.user.tenantId;
    const result = await this.inboxService.mergeConversations(tenantId, primaryConversationId, body.secondaryConversationId, req.user);
    if (this.inboxGateway) {
      this.inboxGateway.broadcastToTenant(tenantId, 'conversation:merged', {
        primaryConversationId,
        secondaryConversationId: body.secondaryConversationId,
        primaryConversation: result.conversation,
        deletedConversationId: body.secondaryConversationId
      });
      this.inboxGateway.broadcastToTenant(tenantId, 'conversation:deleted', {
        id: body.secondaryConversationId
      });
    }
    return result;
  }
}

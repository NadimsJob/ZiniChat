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

@Controller('inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(
    private readonly inboxService: InboxService,
    private readonly inboxGateway: InboxGateway,
    private readonly quotaService: QuotaService,
    private readonly activityLogService: ActivityLogService,
    private readonly userPresenceService: UserPresenceService
  ) {}

  @Get('channels')
  async getActiveChannels(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.inboxService.getActiveChannels(tenantId);
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
    storage: diskStorage({
      destination: (req: any, file, cb) => {
        const tenantId = req.user?.tenantId || 'general';
        const uploadPath = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `out_${uniqueSuffix}${ext}`);
      }
    })
  }))
  async sendMediaMessage(
    @Request() req: any, 
    @Body() body: { conversationId: string, content?: string, type?: string },
    @UploadedFile() file: Express.Multer.File
  ) {
    const tenantId = req.user.tenantId;

    if (file && file.mimetype.startsWith('image/')) {
      try {
        const compressedBuffer = await sharp(file.path)
          .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75, progressive: true })
          .toBuffer();
        fs.writeFileSync(file.path, compressedBuffer);
        file.size = compressedBuffer.length;
      } catch (err) {
        console.error('Failed to compress outbound image:', err);
      }
    }

    await this.quotaService.checkMessageQuota(tenantId);
    await this.quotaService.checkStorageQuota(tenantId, file.size);

    const mediaUrl = `/uploads/tenants/${tenantId}/${file.filename}`;
    const type = body.type || (file.mimetype.startsWith('video') ? 'video' : (file.mimetype.startsWith('image') ? 'image' : 'document'));
    const contentPayload = {
      body: body.content || '',
      mediaUrl
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

    await this.quotaService.incrementStorage(tenantId, file.size);
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
}

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MessengerAuthService } from './messenger-auth.service';
import { FacebookCommentsService } from './facebook-comments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('channels/messenger')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequirePermissions('manage:settings')
export class MessengerAuthController {
  constructor(
    private readonly messengerAuthService: MessengerAuthService,
    private readonly facebookCommentsService: FacebookCommentsService,
  ) {}

  @Get('connections')
  getConnections(@Request() req: any) {
    return this.messengerAuthService.getConnections(req.user.tenantId);
  }

  @Post('connect/manual')
  connectManual(@Request() req: any, @Body() body: any) {
    return this.messengerAuthService.connectManual(req.user.tenantId, body);
  }

  @Post('connect/facebook')
  connectFacebook(@Request() req: any, @Body() body: { code: string; pageId?: string }) {
    return this.messengerAuthService.connectViaFacebook(req.user.tenantId, body.code, body.pageId);
  }

  @Delete('connections/:id')
  deleteConnection(@Request() req: any, @Param('id') id: string) {
    return this.messengerAuthService.deleteConnection(req.user.tenantId, id);
  }

  @Post('connections/:id/ai-reply')
  async toggleAiReply(@Request() req: any, @Param('id') id: string, @Body('isEnabled') isEnabled: boolean) {
    const result = await this.messengerAuthService.toggleAiReply(req.user.tenantId, id, isEnabled);
    return { success: true, isAiAutoReplyEnabled: result.isAiAutoReplyEnabled };
  }

  @Get('connections/:id/comment-settings')
  getCommentSettings(@Request() req: any, @Param('id') id: string) {
    return this.facebookCommentsService.getCommentSettings(req.user.tenantId, id);
  }

  @Patch('connections/:id/comment-settings')
  updateCommentSettings(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.facebookCommentsService.updateCommentSettings(req.user.tenantId, id, body);
  }

  @Get('connections/:id/comment-logs')
  getCommentLogs(
    @Request() req: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.facebookCommentsService.getCommentLogs(
      req.user.tenantId,
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('comments/all')
  getAllCommentLogs(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.facebookCommentsService.getAllTenantCommentLogs(
      req.user.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('comments/:commentId/human-reply')
  replyToCommentHuman(
    @Request() req: any,
    @Param('commentId') commentId: string,
    @Body('replyText') replyText: string,
    @Body('replyType') replyType?: 'public' | 'private' | 'both',
  ) {
    return this.facebookCommentsService.replyToCommentHuman(
      req.user.tenantId,
      commentId,
      replyText,
      replyType || 'public',
    );
  }

  @Post('connections/:id/resubscribe-webhooks')
  resubscribeWebhooks(@Request() req: any, @Param('id') id: string) {
    return this.messengerAuthService.resubscribeWebhooks(req.user.tenantId, id);
  }
}

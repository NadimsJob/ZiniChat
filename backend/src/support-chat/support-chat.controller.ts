import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SupportChatService, DEFAULT_SUPPORT_AI_SYSTEM_PROMPT } from './support-chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('support-chat')
export class SupportChatController {
  constructor(private readonly supportChatService: SupportChatService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getConversation(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.supportChatService.getConversation(tenantId);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  sendMessage(@Req() req: any, @Body('message') message: string) {
    const tenantId = req.user.tenantId;
    return this.supportChatService.sendMessage(tenantId, message);
  }

  @Post('close')
  @UseGuards(JwtAuthGuard)
  closeSession(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.supportChatService.closeSession(tenantId);
  }

  // Superadmin Endpoints
  @Get('admin/default-prompt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  getDefaultPrompt() {
    return { prompt: DEFAULT_SUPPORT_AI_SYSTEM_PROMPT };
  }

  @Get('admin/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  getConversationsForSuperadmin() {
    return this.supportChatService.getConversationsForSuperadmin();
  }

  @Post('admin/conversation-details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  getConversationMessagesForSuperadmin(@Body('conversationId') conversationId: string) {
    return this.supportChatService.getConversationMessagesForSuperadmin(conversationId);
  }
}

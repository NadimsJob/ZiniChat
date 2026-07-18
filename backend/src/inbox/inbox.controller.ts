import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { InboxService } from './inbox.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InboxGateway } from './inbox.gateway';
import { QuotaService } from '../tenants/quota.service';

@Controller('inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(
    private readonly inboxService: InboxService,
    private readonly inboxGateway: InboxGateway,
    private readonly quotaService: QuotaService
  ) {}

  @Get('channels')
  async getActiveChannels(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.inboxService.getActiveChannels(tenantId);
  }

  @Get('conversations')
  async getConversations(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.inboxService.getConversations(tenantId, req.user);
  }

  @Get('conversations/:id/messages')
  async getMessages(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.inboxService.getMessages(tenantId, id);
  }

  @Post('messages')
  async sendMessage(@Request() req: any, @Body() body: { conversationId: string, content: string }) {
    const tenantId = req.user.tenantId;
    await this.quotaService.checkMessageQuota(tenantId);

    const { message, conversation } = await this.inboxService.saveOutboundMessage(tenantId, body.conversationId, body.content);
    
    // Broadcast the new outbound message to all agents in the tenant (so their UI updates)
    this.inboxGateway.broadcastToTenant(tenantId, 'new_message', {
      message,
      conversationId: conversation.id
    });

    await this.quotaService.incrementMessageCount(tenantId);
    return message;
  }

  @Post('messages/media')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads');
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
    await this.quotaService.checkMessageQuota(tenantId);
    await this.quotaService.checkStorageQuota(tenantId, file.size);

    const mediaUrl = `/uploads/${file.filename}`;
    const type = body.type || (file.mimetype.startsWith('video') ? 'video' : (file.mimetype.startsWith('image') ? 'image' : 'document'));
    const contentPayload = {
      body: body.content || '',
      mediaUrl
    };
    const { message, conversation } = await this.inboxService.saveOutboundMessage(tenantId, body.conversationId, contentPayload as any, type);
    
    this.inboxGateway.broadcastToTenant(tenantId, 'new_message', {
      message,
      conversationId: conversation.id
    });

    await this.quotaService.incrementMessageCount(tenantId);
    await this.quotaService.incrementStorage(tenantId, file.size);
    return message;
  }

  @Patch('conversations/:id/assign')
  async assignAgent(@Request() req: any, @Param('id') conversationId: string, @Body() body: { agentId: string | null }) {
    const tenantId = req.user.tenantId;
    return this.inboxService.assignAgent(tenantId, conversationId, body.agentId, req.user);
  }

  @Post('conversations/:id/labels')
  async toggleLabel(@Request() req: any, @Param('id') conversationId: string, @Body() body: { labelId: string }) {
    const tenantId = req.user.tenantId;
    return this.inboxService.toggleLabel(tenantId, conversationId, body.labelId);
  }
}

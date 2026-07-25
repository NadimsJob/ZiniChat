import { Controller, Get, Post, Body, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { InstagramAuthService } from './instagram-auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('channels/instagram')
export class InstagramAuthController {
  constructor(private readonly instagramAuthService: InstagramAuthService) {}

  @Get()
  getConnections(@Request() req: any) {
    return this.instagramAuthService.getConnections(req.user.tenantId);
  }

  @Post('manual')
  connectManual(@Request() req: any, @Body() data: any) {
    return this.instagramAuthService.connectManual(req.user.tenantId, data);
  }

  @Post('connections/:id/ai-reply')
  async toggleAiReply(@Request() req: any, @Param('id') id: string, @Body('isEnabled') isEnabled: boolean) {
    const result = await this.instagramAuthService.toggleAiReply(req.user.tenantId, id, isEnabled);
    return { success: true, isAiAutoReplyEnabled: result.isAiAutoReplyEnabled };
  }

  @Post('connect/facebook')
  connectFacebook(@Request() req: any, @Body() body: { code: string }) {
    return this.instagramAuthService.connectViaFacebook(req.user.tenantId, body.code);
  }

  @Delete('connections/:id')
  deleteConnection(@Request() req: any, @Param('id') id: string) {
    return this.instagramAuthService.deleteConnection(req.user.tenantId, id);
  }
}

import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { WhatsappAuthService } from './whatsapp-auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('channels/whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappAuthController {
  constructor(private readonly authService: WhatsappAuthService) {}

  @Get('connections')
  async getConnections(@Req() req: any, @Res() res: Response) {
    try {
      const connections = await this.authService.getConnections(req.user.tenantId);
      return res.status(HttpStatus.OK).json(connections);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  @Post('connect/manual')
  async connectManual(@Req() req: any, @Body() data: any, @Res() res: Response) {
    try {
      const result = await this.authService.connectManual(req.user.tenantId, data);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({ error: error.message });
    }
  }

  @Get('config/facebook')
  async getFacebookConfig(@Res() res: Response) {
    try {
      const config = await this.authService.getFacebookConfig();
      return res.status(HttpStatus.OK).json(config);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  @Post('connect/facebook')
  async connectFacebook(@Req() req: any, @Body() data: any, @Res() res: Response) {
    const payload = typeof data === 'string' ? { code: data } : data;
    if (!payload || !payload.code) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'OAuth code is required' });
    }
    try {
      const result = await this.authService.connectViaFacebook(req.user.tenantId, payload);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({ error: error.message });
    }
  }

  @Post('connections/:id/test')
  async testConnection(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.authService.testConnection(req.user.tenantId, id);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({ error: error.message });
    }
  }

  @Delete('connections/:id')
  async deleteConnection(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    try {
      const result = await this.authService.deleteConnection(req.user.tenantId, id);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({ error: error.message });
    }
  }

  @Post('connections/:id/ai-reply')
  async toggleAiReply(@Req() req: any, @Param('id') id: string, @Body('isEnabled') isEnabled: boolean, @Res() res: Response) {
    try {
      const result = await this.authService.toggleAiReply(req.user.tenantId, id, isEnabled);
      return res.status(HttpStatus.OK).json({ success: true, isAiAutoReplyEnabled: result.isAiAutoReplyEnabled });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({ error: error.message });
    }
  }
}

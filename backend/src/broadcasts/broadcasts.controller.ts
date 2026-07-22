import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Get('templates')
  getTemplates(@Request() req: any) {
    return this.broadcastsService.getTemplates(req.user.tenantId);
  }

  @Post('templates')
  createTemplate(@Request() req: any, @Body() data: any) {
    return this.broadcastsService.createTemplate(req.user.tenantId, data);
  }

  @Get()
  getBroadcasts(@Request() req: any) {
    return this.broadcastsService.getBroadcasts(req.user.tenantId);
  }

  @Post()
  createBroadcast(@Request() req: any, @Body() data: any) {
    return this.broadcastsService.createBroadcast(req.user.tenantId, data);
  }
}

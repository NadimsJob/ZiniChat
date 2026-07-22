import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
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
}

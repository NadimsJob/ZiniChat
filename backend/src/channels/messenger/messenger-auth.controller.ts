import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MessengerAuthService } from './messenger-auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('channels/messenger')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequirePermissions('manage:settings')
export class MessengerAuthController {
  constructor(private readonly messengerAuthService: MessengerAuthService) {}

  @Get('connections')
  getConnections(@Request() req: any) {
    return this.messengerAuthService.getConnections(req.user.tenantId);
  }

  @Post('connect/manual')
  connectManual(@Request() req: any, @Body() body: any) {
    return this.messengerAuthService.connectManual(req.user.tenantId, body);
  }

  @Post('connect/facebook')
  connectFacebook(@Request() req: any, @Body() body: { code: string }) {
    return this.messengerAuthService.connectViaFacebook(req.user.tenantId, body.code);
  }

  @Delete('connections/:id')
  deleteConnection(@Request() req: any, @Param('id') id: string) {
    return this.messengerAuthService.deleteConnection(req.user.tenantId, id);
  }
}

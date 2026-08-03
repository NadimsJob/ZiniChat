import { Body, Controller, Get, Patch, Post, Param, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService
  ) {}

  @Get()
  getUserNotifications(@Request() req: any) {
    return this.notificationsService.getUserNotifications(req.user.id, req.user.role);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id, req.user.role);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Post('read-all')
  markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.pushNotificationService.getPublicKey() };
  }

  @Post('push-subscribe')
  subscribe(@Request() req: any, @Body() dto: PushSubscriptionDto) {
    return this.pushNotificationService.subscribe(req.user.id, dto);
  }

  @Post('push-unsubscribe')
  unsubscribe(@Body('endpoint') endpoint: string) {
    return this.pushNotificationService.unsubscribe(endpoint);
  }
}


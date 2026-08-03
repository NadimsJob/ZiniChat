import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { PushNotificationService } from './push-notification.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, PushNotificationService],
  exports: [NotificationsService, NotificationsGateway, PushNotificationService]
})
export class NotificationsModule {}


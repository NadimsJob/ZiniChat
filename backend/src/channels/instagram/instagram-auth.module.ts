import { Module } from '@nestjs/common';
import { InstagramAuthService } from './instagram-auth.service';
import { InstagramAuthController } from './instagram-auth.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { BillingModule } from '../../billing/billing.module';

@Module({
  imports: [PrismaModule, NotificationsModule, BillingModule],
  controllers: [InstagramAuthController],
  providers: [InstagramAuthService],
  exports: [InstagramAuthService],
})
export class InstagramAuthModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { QuotaService } from './quota.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SmtpModule } from '../smtp/smtp.module';

@Module({
  imports: [
    PrismaModule,
    BillingModule,
    NotificationsModule,
    SmtpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key_here',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [TenantsController],
  providers: [TenantsService, QuotaService],
  exports: [TenantsService, QuotaService]
})
export class TenantsModule {}



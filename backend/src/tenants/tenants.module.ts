import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { QuotaService } from './quota.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SmtpModule } from '../smtp/smtp.module';

@Module({
  imports: [PrismaModule, BillingModule, NotificationsModule, SmtpModule],
  controllers: [TenantsController],
  providers: [TenantsService, QuotaService],
  exports: [TenantsService, QuotaService]
})
export class TenantsModule {}


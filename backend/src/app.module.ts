import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SubscriptionGuard } from './auth/guards/subscription.guard';
import { PrismaModule } from './prisma/prisma.module';
import { ChannelsModule } from './channels/channels.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MessengerModule } from './channels/messenger/messenger.module';
import { TenantsModule } from './tenants/tenants.module';
import { BillingModule } from './billing/billing.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { StatsModule } from './stats/stats.module';
import { LandingPageModule } from './landing-page/landing-page.module';
import { TeamModule } from './team/team.module';
import { CurrencyModule } from './currency/currency.module';
import { PackagesModule } from './packages/packages.module';
import { SmtpModule } from './smtp/smtp.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { InboxModule } from './inbox/inbox.module';
import { BullModule } from '@nestjs/bullmq';
import { AiTrainingModule } from './ai-training/ai-training.module';
import { ContactsModule } from './contacts/contacts.module';
import { LabelsModule } from './labels/labels.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { LeadsModule } from './leads/leads.module';
import { BusinessNatureModule } from './business-nature/business-nature.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { ScheduleModule } from '@nestjs/schedule';

import { StorageModule } from './storage/storage.module';
import { PaymentsModule } from './payments/payments.module';
import { SupportChatModule } from './support-chat/support-chat.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule, 
    ChannelsModule,  
    AuthModule, 
    UsersModule, 
    TenantsModule, 
    BillingModule, 
    AuditLogsModule, 
    StatsModule, 
    LandingPageModule, 
    TeamModule, 
    CurrencyModule, 
    PackagesModule, 
    SmtpModule, 
    NotificationsModule, 
    AiModule, 
    InboxModule,
    AiTrainingModule,
    ContactsModule,
    LabelsModule,
    ProductsModule,
    OrdersModule,
    MessengerModule,
    OrchestratorModule,
    StorageModule,
    PaymentsModule,
    SupportChatModule,
    LeadsModule,
    InquiriesModule,
    TicketsModule,
    BusinessNatureModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule {}

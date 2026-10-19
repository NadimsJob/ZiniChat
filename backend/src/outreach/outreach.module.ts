import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TenantsModule } from '../tenants/tenants.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillingModule } from '../billing/billing.module';
import { SpadminOutreachService } from './spadmin-outreach.service';
import { SpadminOutreachController } from './spadmin-outreach.controller';
import { TenantSmtpService } from './tenant-smtp.service';
import { TenantSmtpController } from './tenant-smtp.controller';
import { WaterfallEnricherService } from './waterfall-enricher.service';
import { LeadHarvestService } from './lead-harvest.service';
import { LeadHarvestController } from './lead-harvest.controller';
import { OutreachAiService } from './outreach-ai.service';
import { OutreachAiController } from './outreach-ai.controller';
import { OutreachProcessor } from './outreach.processor';
import { OutreachDispatchService } from './outreach-dispatch.service';
import { OutreachDispatchController } from './outreach-dispatch.controller';
import { OutreachAttributionService } from './outreach-attribution.service';
import { OutreachAttributionController } from './outreach-attribution.controller';
import { OutreachCampaignService } from './outreach-campaign.service';
import { OutreachCampaignController } from './outreach-campaign.controller';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    TenantsModule,
    NotificationsModule,
    BillingModule,
    BullModule.registerQueue({
      name: 'outreach-email-queue',
    }),
  ],
  controllers: [
    SpadminOutreachController,
    TenantSmtpController,
    LeadHarvestController,
    OutreachAiController,
    OutreachDispatchController,
    OutreachAttributionController,
    OutreachCampaignController,
  ],
  providers: [
    SpadminOutreachService,
    TenantSmtpService,
    WaterfallEnricherService,
    LeadHarvestService,
    OutreachAiService,
    OutreachProcessor,
    OutreachDispatchService,
    OutreachAttributionService,
    OutreachCampaignService,
  ],
  exports: [
    SpadminOutreachService,
    TenantSmtpService,
    WaterfallEnricherService,
    LeadHarvestService,
    OutreachAiService,
    OutreachProcessor,
    OutreachDispatchService,
    OutreachAttributionService,
    OutreachCampaignService,
  ],
})
export class OutreachModule {}

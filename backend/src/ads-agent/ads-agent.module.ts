import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantsModule } from '../tenants/tenants.module';
import { McpAdsModule } from '../mcp-ads/mcp-ads.module';
import { SmtpModule } from '../smtp/smtp.module';
import { MetaMarketingConfigModule } from '../meta-marketing-config/meta-marketing-config.module';
import { AdsAgentService } from './ads-agent.service';
import { AdsAgentController } from './ads-agent.controller';
import { AdsAgentProcessor } from './ads-agent.processor';

@Module({
  imports: [
    PrismaModule,
    TenantsModule,
    McpAdsModule,
    SmtpModule,
    MetaMarketingConfigModule,
  ],
  controllers: [AdsAgentController],
  providers: [AdsAgentService, AdsAgentProcessor],
  exports: [AdsAgentService],
})
export class AdsAgentModule {}


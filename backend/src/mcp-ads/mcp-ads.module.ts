import { Module } from '@nestjs/common';
import { McpAdsService } from './mcp-ads.service';
import { McpAdsServer } from './mcp-ads.server';
import { McpAdsController } from './mcp-ads.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CryptoModule } from '../crypto/crypto.module';
import { MetaMarketingConfigModule } from '../meta-marketing-config/meta-marketing-config.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [PrismaModule, CryptoModule, MetaMarketingConfigModule, TenantsModule],
  controllers: [McpAdsController],
  providers: [McpAdsService, McpAdsServer],
  exports: [McpAdsService, McpAdsServer],
})
export class McpAdsModule {}

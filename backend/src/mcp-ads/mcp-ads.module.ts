import { Module } from '@nestjs/common';
import { McpAdsService } from './mcp-ads.service';
import { McpAdsServer } from './mcp-ads.server';
import { McpAdsController } from './mcp-ads.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CryptoModule } from '../crypto/crypto.module';
import { MetaMarketingConfigModule } from '../meta-marketing-config/meta-marketing-config.module';

@Module({
  imports: [PrismaModule, CryptoModule, MetaMarketingConfigModule],
  controllers: [McpAdsController],
  providers: [McpAdsService, McpAdsServer],
  exports: [McpAdsService, McpAdsServer],
})
export class McpAdsModule {}

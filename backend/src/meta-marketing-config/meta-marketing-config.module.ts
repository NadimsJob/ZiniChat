import { Module } from '@nestjs/common';
import { MetaMarketingConfigService } from './meta-marketing-config.service';
import { MetaMarketingConfigController } from './meta-marketing-config.controller';

import { PrismaModule } from '../prisma/prisma.module';
import { CryptoModule } from '../crypto/crypto.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, CryptoModule, AuditLogsModule],
  controllers: [MetaMarketingConfigController],
  providers: [MetaMarketingConfigService],
  exports: [MetaMarketingConfigService],
})
export class MetaMarketingConfigModule {}

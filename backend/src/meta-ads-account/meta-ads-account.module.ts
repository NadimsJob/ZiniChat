import { Module } from '@nestjs/common';
import { MetaAdsAccountService } from './meta-ads-account.service';
import { MetaAdsAccountController } from './meta-ads-account.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CryptoModule } from '../crypto/crypto.module';
import { MetaMarketingConfigModule } from '../meta-marketing-config/meta-marketing-config.module';

@Module({
  imports: [PrismaModule, CryptoModule, MetaMarketingConfigModule],
  controllers: [MetaAdsAccountController],
  providers: [MetaAdsAccountService],
  exports: [MetaAdsAccountService],
})
export class MetaAdsAccountModule {}

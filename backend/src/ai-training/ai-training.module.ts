import { Module } from '@nestjs/common';
import { AiTrainingController } from './ai-training.controller';
import { AiTrainingService } from './ai-training.service';
import { WebsiteCrawlerService } from './website-crawler.service';
import { TenantsModule } from '../tenants/tenants.module';
import { CryptoModule } from '../crypto/crypto.module';
import { AiModule } from '../ai/ai.module';
import { FileValidationService } from '../file-validation/file-validation.service';
import { ToolConfigValidatorService } from './services/tool-config-validator.service';

@Module({
  imports: [TenantsModule, CryptoModule, AiModule],
  controllers: [AiTrainingController],
  providers: [AiTrainingService, WebsiteCrawlerService, FileValidationService, ToolConfigValidatorService],
  exports: [AiTrainingService, WebsiteCrawlerService],
})
export class AiTrainingModule {}

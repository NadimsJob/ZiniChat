import { Module } from '@nestjs/common';
import { AiTrainingController } from './ai-training.controller';
import { AiTrainingService } from './ai-training.service';
import { TenantsModule } from '../tenants/tenants.module';
import { CryptoModule } from '../crypto/crypto.module';
import { AiModule } from '../ai/ai.module';
import { FileValidationService } from '../file-validation/file-validation.service';
import { ToolConfigValidatorService } from './services/tool-config-validator.service';

@Module({
  imports: [TenantsModule, CryptoModule, AiModule],
  controllers: [AiTrainingController],
  providers: [AiTrainingService, FileValidationService, ToolConfigValidatorService],
})
export class AiTrainingModule {}

import { Module } from '@nestjs/common';
import { AiTrainingController } from './ai-training.controller';
import { AiTrainingService } from './ai-training.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule],
  controllers: [AiTrainingController],
  providers: [AiTrainingService],
})
export class AiTrainingModule {}

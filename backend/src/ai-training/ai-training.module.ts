import { Module } from '@nestjs/common';
import { AiTrainingController } from './ai-training.controller';
import { AiTrainingService } from './ai-training.service';

@Module({
  controllers: [AiTrainingController],
  providers: [AiTrainingService],
})
export class AiTrainingModule {}

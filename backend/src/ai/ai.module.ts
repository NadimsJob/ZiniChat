import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiCacheService } from './ai-cache.service';
import { GeminiCacheAdapter } from './adapters/gemini-cache.adapter';
import { OpenAICacheAdapter } from './adapters/openai-cache.adapter';
import { AnthropicCacheAdapter } from './adapters/anthropic-cache.adapter';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiCacheService,
    GeminiCacheAdapter,
    OpenAICacheAdapter,
    AnthropicCacheAdapter
  ],
  exports: [
    AiService,
    AiCacheService,
    GeminiCacheAdapter,
    OpenAICacheAdapter,
    AnthropicCacheAdapter
  ]
})
export class AiModule {}


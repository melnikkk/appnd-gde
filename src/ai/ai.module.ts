import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiAiService } from './services/gemini-ai.service';
import { PromptService } from './prompts/prompt.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [GeminiAiService, PromptService],
  exports: [GeminiAiService, PromptService],
})
export class AiModule {}

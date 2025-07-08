import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerateContentResult,
  SchemaType,
} from '@google/generative-ai';
import { AiService } from '../interfaces/ai-service.interface';
import { RecordingEventDataDto } from '../dto/recording-event-data.dto';
import { GeneratedContentDto } from '../dto/generated-content.dto';
import { PromptService } from '../prompts/prompt.service';
import {
  AiServiceUnavailableException,
  AiGenerateContentException,
  AiConfigMissingException,
  AiRateLimitException,
} from '../exceptions';

@Injectable()
export class GeminiAiService implements AiService {
  private readonly logger = new Logger(GeminiAiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model = 'gemini-2.5-flash';

  constructor(
    private readonly configService: ConfigService,
    private readonly promptService: PromptService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new AiConfigMissingException('GEMINI_API_KEY');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateRecordingEventsContent(
    eventsData: Array<RecordingEventDataDto>,
  ): Promise<Record<string, GeneratedContentDto>> {
    try {
      const prompt =
        this.promptService.constructJsonBatchRecordingEventPrompt(eventsData);

      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              events: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    eventId: { type: SchemaType.STRING },
                    title: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                  },
                  required: ['eventId', 'title', 'description'],
                },
              },
            },
          },
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      const result = await model.generateContent(prompt);
      this.logger.log(`Generated content`, result);
      return this.parseBatchResponse(result);
    } catch (error) {
      if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
        throw new AiRateLimitException(error.message, { error });
      }

      if (
        error.message?.includes('unavailable') ||
        error.message?.includes('connection')
      ) {
        throw new AiServiceUnavailableException(error.message, { error });
      }

      throw new AiGenerateContentException(error.message, { error });
    }
  }

  private parseResponse(result: GenerateContentResult): GeneratedContentDto {
    try {
      const responseText = result.response.text();

      if (!responseText) {
        throw new AiGenerateContentException('Response text is empty or undefined');
      }

      const parsedJson = JSON.parse(responseText);

      if (parsedJson.title && parsedJson.description) {
        return {
          title: parsedJson.title,
          description: parsedJson.description,
        };
      }

      throw new AiGenerateContentException(
        'Failed to parse response: missing title or description',
      );
    } catch (error) {
      throw new AiGenerateContentException('Failed to parse response', error.message);
    }
  }

  private parseBatchResponse(
    result: GenerateContentResult,
  ): Record<string, GeneratedContentDto> {
    try {
      const responseText = result.response.text();

      if (!responseText) {
        throw new AiGenerateContentException('Batch response text is empty or undefined');
      }

      const parsedJson = JSON.parse(responseText);
      const recordingEventsContent: Record<string, GeneratedContentDto> = {};

      if (parsedJson.events && Array.isArray(parsedJson.events)) {
        for (const event of parsedJson.events) {
          if (event.eventId && event.title && event.description) {
            recordingEventsContent[event.eventId] = {
              title: event.title,
              description: event.description,
            };
          }
        }
      }

      return recordingEventsContent;
    } catch (error) {
      throw new AiGenerateContentException(
        'Failed to parse batch response',
        error.message,
      );
    }
  }
}

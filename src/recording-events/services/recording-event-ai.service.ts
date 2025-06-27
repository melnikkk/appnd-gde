import { Injectable, Logger } from '@nestjs/common';
import { GeminiAiService } from '../../ai/services/gemini-ai.service';
import { RecordingEventDataDto } from '../../ai/dto/recording-event-data.dto';
import { GeneratedContentDto } from '../../ai/dto/generated-content.dto';
import {
  RecordingEvent,
  RecordingEventsRecord,
  RecordingEventData,
} from '../entities/recording-events.types';
import { RecordingEventType } from '../recording-event.constants';
import { AppBaseException } from '../../common/exceptions/base.exception';

@Injectable()
export class RecordingEventAiService {
  private readonly logger = new Logger(RecordingEventAiService.name);

  constructor(private readonly geminiAiService: GeminiAiService) {}

  async fillRecordingEventsWithAiContent(
    events: RecordingEventsRecord,
    additionalContext?: {
      companyName?: string;
      industry?: string;
      productContext?: string;
      recordingPurpose?: string;
      recordingDescription?: string;
    },
  ): Promise<Record<string, GeneratedContentDto>> {
    try {
      const eventsArray = Object.values(events);
      const eventsData = eventsArray.map((event) =>
        this.mapRecordingEventToAiData(event, additionalContext),
      );

      return await this.geminiAiService.generateRecordingEventsContent(eventsData);
    } catch (error) {
      this.logger.error(
        `Error generating titles and descriptions for batch: ${error.message}`,
        error.stack,
      );

      throw new AppBaseException(
        `Error generating titles and descriptions for batch`,
        500,
        'AI_CONTENT_GENERATION_FAILED',
        {
          eventCount: Object.keys(events).length,
          originalError: error.message,
        },
      );
    }
  }

  private mapRecordingEventToAiData(
    event: RecordingEvent,
    additionalContext?: {
      companyName?: string;
      industry?: string;
      productContext?: string;
      recordingPurpose?: string;
      recordingDescription?: string;
    },
  ): RecordingEventDataDto {
    let targetElementData: RecordingEventDataDto['targetElement'];
    let pageContextData: RecordingEventDataDto['pageContext'];
    let userInteractionData: RecordingEventDataDto['userInteraction'];

    const extendedData = event.data as RecordingEventData;

    if (extendedData.targetElement) {
      targetElementData = {
        elementType: extendedData.targetElement.elementType || 'unknown',
        elementId: extendedData.targetElement.elementId,
        elementName: extendedData.targetElement.elementName,
        elementClass: extendedData.targetElement.elementClass,
        textContent: extendedData.targetElement.textContent,
        placeholder: extendedData.targetElement.placeholder,
        ariaLabel: extendedData.targetElement.ariaLabel,
      };
    } else {
      targetElementData = { elementType: 'unknown' };
    }

    if (extendedData.pageContext) {
      pageContextData = {
        url: extendedData.pageContext.url ?? '',
        title: extendedData.pageContext.title ?? '',
        parentElements:
          extendedData.pageContext.parentElements?.map((element) => ({
            elementType: element.tagName || 'unknown',
            textContent: element.className,
          })) ?? [],
      };
    } else {
      pageContextData = { url: '', title: '' };
    }

    userInteractionData = extendedData.userInteraction || {
      inputValue: event.type === RecordingEventType.CLICK ? 'clicked' : undefined,
      selectedOptions: undefined,
      isChecked: undefined,
    };

    return {
      eventId: event.id,
      eventType: event.type,
      targetElement: targetElementData,
      pageContext: pageContextData,
      userInteraction: userInteractionData,
      timestamp: new Date(event.timestamp).toISOString(),
      additionalContext: additionalContext || {},
    };
  }
}

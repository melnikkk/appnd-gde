import { Injectable, Logger } from '@nestjs/common';
import { GeminiAiService } from '../../ai/services/gemini-ai.service';
import { RecordingEventDataDto } from '../../ai/dto/recording-event-data.dto';
import { GeneratedContentDto } from '../../ai/dto/generated-content.dto';
import {
  RecordingEvent,
  UrlChangeRecordingEventData,
} from '../entities/recording-events.types';
import { RecordingEventType } from '../recording-event.constants';
import { AppBaseException } from '../../common/exceptions/base.exception';
import { isAiGeneratableEvent } from '../utils/recording-event.type-guards';
import { RecordingEventFactoryService } from './recording-event-factory.service';

@Injectable()
export class RecordingEventAiService {
  private readonly logger = new Logger(RecordingEventAiService.name);

  constructor(
    private readonly geminiAiService: GeminiAiService,
    private readonly recordingEventFactoryService: RecordingEventFactoryService,
  ) {}

  async fillRecordingEventsWithAiContent(
    eventsArray: Array<RecordingEvent>,
  ): Promise<Record<string, GeneratedContentDto>> {
    try {
      const eventsData = eventsArray.map((event) =>
        this.mapRecordingEventToAiData(event),
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
          eventCount: eventsArray.length,
          originalError: error.message,
        },
      );
    }
  }

  private mapRecordingEventToAiData(event: RecordingEvent): RecordingEventDataDto {
    let targetElementData: RecordingEventDataDto['targetElement'] = {
      elementType: 'unknown',
    };
    let pageContextData: RecordingEventDataDto['pageContext'] = { url: '', title: '' };
    let userInteractionData: RecordingEventDataDto['userInteraction'] = {};

    const recordingEventModel =
      this.recordingEventFactoryService.createRecordingEvent(event);

    if (isAiGeneratableEvent(recordingEventModel)) {
      const clickData = recordingEventModel.data;

      if (clickData.targetElement) {
        targetElementData = {
          elementType: clickData.targetElement.elementType || 'unknown',
          elementId: clickData.targetElement.elementId,
          elementName: clickData.targetElement.elementName,
          elementClass: clickData.targetElement.elementClass,
          textContent: clickData.targetElement.textContent,
          placeholder: clickData.targetElement.placeholder,
          ariaLabel: clickData.targetElement.ariaLabel,
        };
      } else {
        targetElementData = { elementType: 'unknown' };
      }

      if (clickData.pageContext) {
        pageContextData = {
          url: clickData.pageContext.url ?? '',
          title: clickData.pageContext.title ?? '',
          parentElements:
            clickData.pageContext.parentElements?.map((element) => ({
              elementType: element.tagName || 'unknown',
              textContent: element.className,
            })) ?? [],
        };
      } else {
        pageContextData = { url: '', title: '' };
      }

      userInteractionData = clickData.userInteraction || {
        inputValue: 'clicked',
        selectedOptions: undefined,
        isChecked: undefined,
      };
    } else if (recordingEventModel.type === RecordingEventType.URL_CHANGE) {
      // Handle URL_CHANGE specific data if needed for AI
      targetElementData = { elementType: 'unknown' };
      pageContextData = {
        url: (recordingEventModel.data as UrlChangeRecordingEventData).newUrl,
        title: '',
      };
      userInteractionData = {};
    }

    targetElementData = targetElementData || { elementType: 'unknown' };
    pageContextData = pageContextData || { url: '', title: '' };
    userInteractionData = userInteractionData || {};

    return {
      eventId: event.id,
      eventType: event.type,
      targetElement: targetElementData,
      pageContext: pageContextData,
      userInteraction: userInteractionData,
      timestamp: new Date(event.timestamp).toISOString(),
    };
  }
}

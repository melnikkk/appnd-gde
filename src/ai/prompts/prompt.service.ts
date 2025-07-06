import * as ejs from 'ejs';
import { Injectable } from '@nestjs/common';
import { RECORDING_EVENT_PROMPT } from './templates/recording-event.prompt';
import { RecordingEventDataDto } from '../dto/recording-event-data.dto';
import { AiInvalidPromptException } from '../exceptions';
import { RECORDING_EVENTS_BATCH_PROMPT } from './templates/recording-events-batch.prompt';

@Injectable()
export class PromptService {
  constructJsonBatchRecordingEventPrompt(
    recordingEventsData: Array<RecordingEventDataDto>,
  ): string {
    try {
      const recordingEventsJson = JSON.stringify(
        recordingEventsData.map((recordingEvent) => ({
          eventId: recordingEvent.eventId,
          eventType: recordingEvent.eventType,
          targetElement: recordingEvent.targetElement,
          pageContext: recordingEvent.pageContext,
          userInteraction: recordingEvent.userInteraction,
          timestamp: recordingEvent.timestamp,
        })),
        null,
        2,
      );

      const prompt = ejs.render(RECORDING_EVENTS_BATCH_PROMPT, {
        recordingEventsData,
        recordingEventsJson,
        recordingEventPrompt: RECORDING_EVENT_PROMPT,
      });

      return prompt;
    } catch (error) {
      throw new AiInvalidPromptException('Failed to construct batch prompt', {
        eventCount: recordingEventsData.length,
        error: error.message,
      });
    }
  }
}

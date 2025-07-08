import { RecordingEvent, RecordingEventData } from '../entities/recording-events.types';
import { RecordingEventType } from '../recording-event.constants';

export abstract class BaseRecordingEvent implements RecordingEvent {
  abstract readonly type: RecordingEventType;
  abstract data: RecordingEventData;
  readonly id: string;
  timestamp: number;
  title: string;
  description: string | null;
  screenshotUrl: string | null;

  constructor(event: RecordingEvent) {
    Object.assign(this, event);
  }

  abstract isAiGeneratable(): boolean;

  abstract isScreenshotAvailable(): boolean;
}

import { BaseRecordingEvent } from './base-recording-event.model';
import {
  ClickRecordingEventData,
  RecordingEvent,
} from '../entities/recording-events.types';
import { RecordingEventType } from '../recording-event.constants';

export class ClickRecordingEvent extends BaseRecordingEvent {
  readonly type = RecordingEventType.CLICK;
  data: ClickRecordingEventData;

  constructor({ data, ...rest }: RecordingEvent) {
    super({ data, ...rest });

    this.data = data as ClickRecordingEventData;
  }

  isAiGeneratable(): boolean {
    return true;
  }

  isScreenshotAvailable(): boolean {
    return true;
  }
}

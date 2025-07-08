import { BaseRecordingEvent } from './base-recording-event.model';
import {
  RecordingEvent,
  UrlChangeRecordingEventData,
} from '../entities/recording-events.types';
import { RecordingEventType } from '../recording-event.constants';

export class UrlChangeRecordingEvent extends BaseRecordingEvent {
  readonly type = RecordingEventType.URL_CHANGE;
  data: UrlChangeRecordingEventData;

  constructor({ data, ...rest }: RecordingEvent) {
    super({ data, ...rest });

    this.data = data as UrlChangeRecordingEventData;
  }

  isAiGeneratable(): boolean {
    return false;
  }

  isScreenshotAvailable(): boolean {
    return false;
  }
}

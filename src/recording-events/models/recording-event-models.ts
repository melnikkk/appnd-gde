import { BaseRecordingEvent } from './base-recording-event.model';
import { ClickRecordingEvent } from './click-recording-event.model';
import { UrlChangeRecordingEvent } from './url-change-recording-event.model';
import { RecordingEventType } from '../recording-event.constants';
import { RecordingEvent } from '../entities/recording-events.types';

export const RecordingEventModels: Record<
  RecordingEventType,
  { new (event: RecordingEvent): BaseRecordingEvent }
> = {
  [RecordingEventType.CLICK]: ClickRecordingEvent,
  [RecordingEventType.URL_CHANGE]: UrlChangeRecordingEvent,
};

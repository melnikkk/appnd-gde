import { RecordingEventType } from './recording-event.constants';

export interface ClickRecordingEventData {
  coordinates: {
    x: number;
    y: number;
  };
}

export type RecordingEventData = ClickRecordingEventData

export interface RecordingEvent {
  id: string;
  type: RecordingEventType | string;
  timestamp: number;
  data?: RecordingEventData;
  screenshotUrl?: string | null;
}

export type RecordingEventsRecord = Record<string, RecordingEvent>;

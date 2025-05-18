import { RecordingEventType } from './recording-event.constants';

export interface ClickRecordingEventData {
  coordinates: {
    x: number;
    y: number;
  };
  view: {
    innerWidth: number;
    innerHeight: number;
  };
}

export type RecordingEventData = ClickRecordingEventData;

export interface RecordingEventsRecord {
  [recordingId: string]: RecordingEvent;
}

export interface RecordingEvent {
  id: string;
  timestamp: number;
  index: number;
  screenshotUrl?: string | null;
  data: RecordingEventData;
  type: RecordingEventType;
}

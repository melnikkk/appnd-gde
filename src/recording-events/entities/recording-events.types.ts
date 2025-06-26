import { RecordingEventType } from '../recording-event.constants';

export interface ClickRecordingEventData {
  coordinates: {
    x: number;
    y: number;
  };
}

export type RecordingEventData = ClickRecordingEventData;

export interface RecordingEventsRecord {
  [recordingId: string]: RecordingEvent;
}

export interface RecordingEvent {
  id: string;
  timestamp: number;
  screenshotUrl?: string | null;
  data: RecordingEventData;
  type: RecordingEventType;
}

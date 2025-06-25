import { RecordingEvent } from './recording-events.types';

export class RecordingEventEntity implements RecordingEvent {
  id: string;
  type: string;
  timestamp: number;
  data?: Record<string, unknown>;
  screenshotUrl?: string;
}

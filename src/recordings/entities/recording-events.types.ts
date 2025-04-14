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

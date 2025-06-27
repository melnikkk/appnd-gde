import { RecordingEventType } from '../recording-event.constants';

export interface TargetElement {
  elementType?: string;
  elementId?: string;
  elementName?: string;
  elementClass?: string;
  textContent?: string;
  placeholder?: string;
  ariaLabel?: string;
}

export interface ParentElement {
  tagName?: string;
  id?: string;
  className?: string;
}

export type ParentElements = Array<ParentElement>;

export interface PageContext {
  url?: string;
  title?: string;
  parentElements?: ParentElements;
}

export interface Interaction {
  inputValue?: string;
  selectedOptions?: Array<string>;
  isChecked?: boolean;
}

export interface ClickRecordingEventData {
  coordinates: {
    x: number;
    y: number;
  };
  targetElement?: TargetElement;
  pageContext?: PageContext;
  userInteraction?: Interaction;
  additionalContext?: Record<string, unknown>;
}

export type RecordingEventData = ClickRecordingEventData;

export type RecordingEventsRecord = Record<string, RecordingEvent>;

export interface RecordingEvent {
  id: string;
  timestamp: number;
  screenshotUrl?: string | null;
  data: RecordingEventData;
  type: RecordingEventType;
  title: string;
  description: string | null;
}

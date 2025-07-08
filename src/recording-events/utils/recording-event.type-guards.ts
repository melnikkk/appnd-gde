import { BaseRecordingEvent } from '../models/base-recording-event.model';
import {
  AiGeneratableRecordingEvent,
  ScreenshotAvailableRecordingEvent,
} from '../entities/recording-events.types';

export function isAiGeneratableEvent(
  event: BaseRecordingEvent,
): event is AiGeneratableRecordingEvent {
  return event.isAiGeneratable();
}

export function isScreenshotAvailableEvent(
  event: BaseRecordingEvent,
): event is ScreenshotAvailableRecordingEvent {
  return event.isScreenshotAvailable();
}

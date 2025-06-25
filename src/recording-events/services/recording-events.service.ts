import { Injectable, Logger } from '@nestjs/common';
import {
  RecordingEvent,
  RecordingEventsRecord,
} from '../entities/recording-events.types';
import { CreateRecordingEventDto } from '../dto/create-recording-event.dto';
import { AppBaseException } from '../../common/exceptions/base.exception';
import { UpdateRecordingEventDto } from '../dto/update-recording-event.dto';
import { ScreenshotService } from './screenshot.service';

@Injectable()
export class RecordingEventsService {
  private readonly logger = new Logger(RecordingEventsService.name);

  constructor(private readonly screenshotService: ScreenshotService) {}

  async addEvents(
    recordingId: string,
    videoPath: string,
    startTime: number,
    events: Record<string, CreateRecordingEventDto>,
    existingEvents: RecordingEventsRecord = {},
  ): Promise<RecordingEventsRecord> {
    try {
      const updatedEvents = { ...existingEvents };

      for (const [eventId, event] of Object.entries(events)) {
        try {
          if (isNaN(event.timestamp) || event.timestamp < 0) {
            event.timestamp = 0;
          }

          const relativeTimestamp = Math.max(0, event.timestamp - startTime) / 1000;

          await this.screenshotService.generateScreenshotAtTimestamp(
            videoPath,
            eventId,
            relativeTimestamp,
          );

          updatedEvents[eventId] = {
            ...event,
            id: eventId,
            screenshotUrl: `/recordings/${recordingId}/events/${eventId}/screenshot`,
          };
        } catch (screenshotError) {
          this.logger.warn(
            `Failed to generate screenshot for event ${eventId}: ${screenshotError.message}`,
            screenshotError.stack,
          );

          updatedEvents[eventId] = {
            ...event,
            id: eventId,
          };
        }
      }

      return this.formatEventsForResponse(updatedEvents, recordingId);
    } catch (error) {
      this.logger.error(
        `Failed to add events to recording ${recordingId}: ${error.message}`,
        error.stack,
      );

      throw new AppBaseException(
        `Failed to add events to recording with ID ${recordingId}`,
        500,
        'ADD_EVENTS_FAILED',
        { recordingId, eventCount: Object.keys(events).length },
      );
    }
  }

  formatEventsForResponse(
    events: RecordingEventsRecord,
    recordingId: string,
  ): RecordingEventsRecord {
    const result: RecordingEventsRecord = {};

    for (const [eventId, event] of Object.entries(events)) {
      try {
        result[eventId] = {
          id: event.id,
          data: event.data,
          timestamp: event.timestamp,
          type: event.type,
          screenshotUrl:
            event.screenshotUrl ??
            `/recordings/${recordingId}/events/${eventId}/screenshot`,
        };
      } catch (error) {
        this.logger.error(
          `Error formatting event ${eventId} for response: ${error.message}`,
          error.stack,
        );
      }
    }

    return result;
  }

  async updateEvent(
    recordingId: string,
    eventId: string,
    videoPath: string,
    startTime: number,
    updateEventDto: UpdateRecordingEventDto,
    existingEvent: RecordingEvent,
  ): Promise<RecordingEvent> {
    try {
      if (
        updateEventDto.timestamp !== undefined &&
        updateEventDto.timestamp !== existingEvent.timestamp
      ) {
        const relativeTimestamp =
          Math.max(0, updateEventDto.timestamp - startTime) / 1000;

        try {
          await this.screenshotService.generateScreenshotAtTimestamp(
            videoPath,
            eventId,
            relativeTimestamp,
          );
        } catch (screenshotError) {
          this.logger.warn(
            `Failed to regenerate screenshot for event ${eventId}: ${screenshotError.message}`,
            screenshotError.stack,
          );
        }
      }

      return {
        ...existingEvent,
        ...updateEventDto,
        id: eventId,
        screenshotUrl: `/recordings/${recordingId}/events/${eventId}/screenshot`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update event ${eventId} in recording ${recordingId}: ${error.message}`,
        error.stack,
      );

      throw new AppBaseException(
        `Failed to update event with ID ${eventId} in recording with ID ${recordingId}`,
        500,
        'UPDATE_EVENT_FAILED',
        { recordingId, eventId },
      );
    }
  }

  async addEventScreenshot(
    recordingId: string,
    eventId: string,
    file: Express.Multer.File,
    existingEvent: RecordingEvent,
  ): Promise<RecordingEvent> {
    try {
      await this.screenshotService.saveEventScreenshot(eventId, file);

      const updatedEvent = {
        ...existingEvent,
        screenshotUrl: `/recordings/${recordingId}/events/${eventId}/screenshot`,
      };

      return updatedEvent;
    } catch (error) {
      throw new AppBaseException(
        `Failed to add screenshot for event ${eventId}`,
        500,
        'ADD_SCREENSHOT_FAILED',
        { recordingId, eventId },
      );
    }
  }

  async deleteEventScreenshot(eventId: string): Promise<void> {
    await this.screenshotService.deleteScreenshotByEventId(eventId);
  }

  getEventScreenshotPath(eventId: string): string | null {
    return this.screenshotService.getEventScreenshotPath(eventId);
  }
}

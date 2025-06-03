import { Injectable, Logger, Inject } from '@nestjs/common';
import { RecordingCoreService } from './recording-core.service';
import { RecordingEvent } from '../entities/recording-events.types';
import { CreateRecordingEventDto } from '../dto/create-recording-event.dto';
import { RecordingNotFoundException } from '../exceptions/recording-not-found.exception';
import { RecordingEventNotFoundException } from '../exceptions/recording-event-not-found.exceptions';
import { AppBaseException } from '../../common/exceptions/base.exception';
import { ScreenshotService } from './screenshot.service';

@Injectable()
export class RecordingEventService {
  private readonly logger = new Logger(RecordingEventService.name);

  constructor(
    private readonly recordingCoreService: RecordingCoreService,
    private readonly screenshotService: ScreenshotService,
  ) {}

  async addEvents(
    recordingId: string,
    events: Record<string, CreateRecordingEventDto>,
  ): Promise<Record<string, RecordingEvent>> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    try {
      if (!recording.events) {
        recording.events = {};
      }

      const videoPath = this.recordingCoreService.getFilePath(recording.s3Key);

      for (const [eventId, eventData] of Object.entries(events)) {
        try {
          if (isNaN(eventData.timestamp) || eventData.timestamp < 0) {
            this.logger.warn(
              `Invalid timestamp for event ${eventId}: ${eventData.timestamp}. Using default value of 0.`,
            );

            eventData.timestamp = 0;
          }

          const relativeTimestamp =
            Math.max(0, eventData.timestamp - recording.startTime) / 1000;

          await this.screenshotService.generateScreenshotAtTimestamp(
            videoPath,
            eventId,
            relativeTimestamp,
          );

          recording.events[eventId] = {
            ...eventData,
            id: eventId,
            screenshotUrl: `/recordings/${recordingId}/events/${eventId}/screenshot`,
          };

          this.logger.log(
            `Generated screenshot for event ${eventId} at timestamp ${eventData.timestamp}`,
          );
        } catch (screenshotError) {
          this.logger.warn(
            `Failed to generate screenshot for event ${eventId}: ${screenshotError.message}`,
            screenshotError.stack,
          );

          recording.events[eventId] = {
            ...eventData,
            id: eventId,
          };
        }
      }

      await this.recordingCoreService.save(recording);

      return this.formatEventsForResponse(recording.events, recordingId);
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
    events: Record<string, RecordingEvent>,
    recordingId: string,
  ): Record<string, RecordingEvent> {
    const result: Record<string, RecordingEvent> = {};

    for (const [eventId, event] of Object.entries(events)) {
      try {
        if (!event || typeof event !== 'object') {
          this.logger.warn(
            `Skipping invalid event ${eventId} for recording ${recordingId}`,
          );

          continue;
        }

        if (!event.id || !event.type || event.timestamp === undefined) {
          this.logger.warn(
            `Event ${eventId} is missing required properties: ${JSON.stringify(event)}`,
          );

          result[eventId] = {
            id: event.id || eventId,
            data: event.data || {},
            timestamp: event.timestamp,
            type: event.type || 'unknown',
            screenshotUrl:
              event.screenshotUrl ??
              `/recordings/${recordingId}/events/${eventId}/screenshot`,
          };

          continue;
        }

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

  async getEventById(
    recordingId: string,
    eventId: string,
  ): Promise<RecordingEvent | null> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || !recording.events[eventId]) {
      return null;
    }

    return recording.events[eventId];
  }

  async deleteEvent(recordingId: string, eventId: string): Promise<void> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      await this.screenshotService.deleteScreenshotByEventId(eventId);

      delete recording.events[eventId];

      await this.recordingCoreService.save(recording);

      this.logger.log(
        `Successfully deleted event ${eventId} from recording ${recordingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete event ${eventId} from recording ${recordingId}: ${error.message}`,
        error.stack,
      );

      throw new AppBaseException(
        `Failed to delete event with ID ${eventId} from recording with ID ${recordingId}`,
        500,
        'DELETE_EVENT_FAILED',
        { recordingId, eventId },
      );
    }
  }

  async addEventScreenshot(
    recordingId: string,
    eventId: string,
    file: Express.Multer.File,
  ): Promise<RecordingEvent> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording?.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      await this.screenshotService.saveEventScreenshot(eventId, file);

      recording.events[eventId].screenshotUrl =
        `/recordings/${recordingId}/events/${eventId}/screenshot`;

      await this.recordingCoreService.save(recording);

      return {
        id: recording.events[eventId].id,
        data: recording.events[eventId].data,
        timestamp: recording.events[eventId].timestamp,
        type: recording.events[eventId].type,
        screenshotUrl: recording.events[eventId].screenshotUrl,
      };
    } catch (error) {
      this.logger.error(
        `Failed to add screenshot to event ${eventId} for recording ${recordingId}: ${error.message}`,
        error.stack,
      );

      throw new AppBaseException(
        `Failed to add screenshot to event with ID ${eventId} for recording with ID ${recordingId}`,
        500,
        'ADD_EVENT_SCREENSHOT_FAILED',
        { recordingId, eventId },
      );
    }
  }

  async regenerateEventScreenshot(
    recordingId: string,
    eventId: string,
  ): Promise<RecordingEvent> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      const recordingEvent = recording.events[eventId];
      const videoPath = this.recordingCoreService.getFilePath(recording.s3Key);

      if (isNaN(recordingEvent.timestamp) || recordingEvent.timestamp < 0) {
        this.logger.warn(
          `Invalid timestamp for event ${eventId}: ${recordingEvent.timestamp}. Using default value of 0.`,
        );

        recordingEvent.timestamp = 0;
      }

      const relativeTimestamp =
        Math.max(0, recordingEvent.timestamp - recording.startTime) / 1000;

      await this.screenshotService.generateScreenshotAtTimestamp(
        videoPath,
        eventId,
        relativeTimestamp,
      );

      recording.events[eventId].screenshotUrl =
        `/recordings/${recordingId}/events/${eventId}/screenshot`;

      await this.recordingCoreService.save(recording);

      return {
        id: recordingEvent.id,
        data: recordingEvent.data,
        timestamp: recordingEvent.timestamp,
        type: recordingEvent.type,
        screenshotUrl: `/recordings/${recordingId}/events/${eventId}/screenshot`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to regenerate screenshot for event ${eventId}: ${error.message}`,
        error.stack,
      );

      throw new AppBaseException(
        `Failed to regenerate screenshot for event ${eventId}`,
        500,
        'REGENERATE_SCREENSHOT_FAILED',
        { recordingId, eventId, error: error.message },
      );
    }
  }

  async generateRecordingEventsScreenshots(recordingId: string): Promise<void> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || Object.keys(recording.events).length === 0) {
      return;
    }

    try {
      const videoPath = this.recordingCoreService.getFilePath(recording.s3Key);

      for (const [eventId, event] of Object.entries(recording.events)) {
        try {
          if (isNaN(event.timestamp) || event.timestamp < 0) {
            this.logger.warn(
              `Invalid timestamp for event ${eventId}: ${event.timestamp}. Using default value of 0.`,
            );

            event.timestamp = 0;
          }

          const relativeTimestamp =
            Math.max(0, event.timestamp - recording.startTime) / 1000;

          await this.screenshotService.generateScreenshotAtTimestamp(
            videoPath,
            eventId,
            relativeTimestamp,
          );

          recording.events[eventId].screenshotUrl =
            `/recordings/${recordingId}/events/${eventId}/screenshot`;
        } catch (screenshotError) {
          this.logger.warn(
            `Failed to generate screenshots for event ${eventId}: ${screenshotError.message}`,
            screenshotError.stack,
          );
        }
      }

      await this.recordingCoreService.save(recording);
    } catch (error) {
      this.logger.error(
        `Failed to generate screenshots for recording ${recordingId}: ${error.message}`,
        error.stack,
      );

      throw new AppBaseException(
        `Failed to generate screenshots for recording ${recordingId}`,
        500,
        'GENERATE_SCREENSHOTS_FAILED',
        { recordingId, error: error.message },
      );
    }
  }

  async deleteAllEventsByRecordingId(recordingId: string): Promise<void> {
    try {
      const recording = await this.recordingCoreService.findOne(recordingId);

      if (!recording || !recording.events) {
        return;
      }

      const eventIds = Object.keys(recording.events);

      if (eventIds.length === 0) {
        return;
      }

      this.logger.log(`Deleting ${eventIds.length} events for recording ${recordingId}`);

      for (const eventId of eventIds) {
        await this.screenshotService.deleteScreenshotByEventId(eventId);
      }

      recording.events = {};

      await this.recordingCoreService.save(recording);

      this.logger.log(`Successfully deleted all events for recording ${recordingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete events for recording ${recordingId}: ${error.message}`,
        error.stack,
      );
    }
  }
}

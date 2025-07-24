import { Injectable, Logger } from '@nestjs/common';
import { RecordingStoreService } from '../../recordings-shared/services/recording-store.service';
import {
  RecordingEvent,
  RecordingEventsRecord,
} from '../entities/recording-events.types';
import { CreateRecordingEventDto } from '../dto/create-recording-event.dto';
import { RecordingNotFoundException } from '../../recordings/exceptions/recording-not-found.exception';
import { RecordingEventNotFoundException } from '../exceptions/recording-event-not-found.exceptions';
import { AppBaseException } from '../../common/exceptions/base.exception';
import { ScreenshotsService } from '../../screenshots/services/screenshots.service';
import { RecordingEventAiService } from './recording-event-ai.service';
import { RecordingEventFactoryService } from './recording-event-factory.service';

@Injectable()
export class RecordingEventsService {
  private readonly logger = new Logger(RecordingEventsService.name);

  constructor(
    private readonly recordingStoreService: RecordingStoreService,
    private readonly screenshotService: ScreenshotsService,
    private readonly recordingEventAiService: RecordingEventAiService,
    private readonly recordingEventFactoryService: RecordingEventFactoryService,
  ) {}

  async addEvents(
    recordingId: string,
    events: Record<string, CreateRecordingEventDto>,
  ): Promise<Record<string, RecordingEvent>> {
    const userId = Object.values(events)[0]?.userId;
    const recording = await this.recordingStoreService.findOne(recordingId, userId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    try {
      if (!recording.events) {
        recording.events = {};
      }

      const videoPath = this.recordingStoreService.getFilePath(recording.s3Key);

      for (const [eventId, eventData] of Object.entries(events)) {
        const eventModel = this.recordingEventFactoryService.createRecordingEvent(
          eventData as unknown as RecordingEvent,
        );

        if (eventModel.isScreenshotAvailable()) {
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
              title: eventData.title || eventId,
              description: eventData.description || null,
              screenshotUrl: `/recordings/${recordingId}/events/${eventId}/screenshot`,
            };
          } catch (screenshotError) {
            this.logger.warn(
              `Failed to generate screenshot for event ${eventId}: ${screenshotError.message}`,
              screenshotError.stack,
            );

            recording.events[eventId] = {
              ...eventData,
              id: eventId,
              title: eventData.title || eventId,
              description: eventData.description ?? null,
              screenshotUrl: null,
            };
          }
        } else {
          recording.events[eventId] = {
            ...eventData,
            id: eventId,
            title: eventData.title || eventId,
            description: eventData.description ?? null,
            screenshotUrl: null,
          };
        }
      }

      await this.recordingStoreService.save(recording);

      return this.formatEventsForResponse(recording.events);
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
  ): Record<string, RecordingEvent> {
    const result: Record<string, RecordingEvent> = {};

    for (const [eventId, event] of Object.entries(events)) {
      try {
        result[eventId] = {
          id: event.id,
          data: event.data,
          timestamp: event.timestamp,
          type: event.type,
          title: event.title ?? eventId,
          description: event.description ?? null,
          screenshotUrl: event.screenshotUrl,
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
    userId: string,
  ): Promise<RecordingEvent | null> {
    const recording = await this.recordingStoreService.findOne(recordingId, userId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || !recording.events[eventId]) {
      return null;
    }

    return this.recordingEventFactoryService.createRecordingEvent(
      recording.events[eventId],
    );
  }

  async deleteEvent(recordingId: string, eventId: string, userId: string): Promise<void> {
    const recording = await this.recordingStoreService.findOne(recordingId, userId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      await this.screenshotService.deleteScreenshotByEventId(eventId);

      delete recording.events[eventId];

      await this.recordingStoreService.save(recording);
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

  async updateEvent(
    recordingId: string,
    eventId: string,
    updateEventDto: Partial<RecordingEvent>,
    userId: string,
  ): Promise<RecordingEvent> {
    const recording = await this.recordingStoreService.findOne(recordingId, userId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      const currentEvent = recording.events[eventId];

      const eventModel = this.recordingEventFactoryService.createRecordingEvent({
        ...currentEvent,
        ...updateEventDto,
      });

      if (
        updateEventDto.timestamp !== undefined &&
        updateEventDto.timestamp !== currentEvent.timestamp &&
        eventModel.isScreenshotAvailable()
      ) {
        const videoPath = this.recordingStoreService.getFilePath(recording.s3Key);
        const relativeTimestamp =
          Math.max(0, updateEventDto.timestamp - recording.startTime) / 1000;

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

      recording.events[eventId] = {
        ...currentEvent,
        ...updateEventDto,
        id: eventId,
        screenshotUrl: `/recordings/${recordingId}/events/${eventId}/screenshot`,
      };

      await this.recordingStoreService.save(recording);

      return this.recordingEventFactoryService.createRecordingEvent(
        recording.events[eventId],
      );
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
    userId: string,
  ): Promise<RecordingEvent> {
    const recording = await this.recordingStoreService.findOne(recordingId, userId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording?.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      const eventModel = this.recordingEventFactoryService.createRecordingEvent(
        recording.events[eventId],
      );

      if (!eventModel.isScreenshotAvailable()) {
        return {
          ...recording.events[eventId],
          screenshotUrl: null,
        };
      }

      await this.screenshotService.saveEventScreenshot(eventId, file);

      recording.events[eventId].screenshotUrl =
        `/recordings/${recordingId}/events/${eventId}/screenshot`;

      await this.recordingStoreService.save(recording);

      return {
        id: recording.events[eventId].id,
        data: recording.events[eventId].data,
        timestamp: recording.events[eventId].timestamp,
        type: recording.events[eventId].type,
        title: recording.events[eventId].title ?? eventId,
        description: recording.events[eventId].description ?? null,
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
    userId: string,
  ): Promise<RecordingEvent> {
    const recording = await this.recordingStoreService.findOne(recordingId, userId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      const recordingEvent = recording.events[eventId];

      const eventModel =
        this.recordingEventFactoryService.createRecordingEvent(recordingEvent);

      if (!eventModel.isScreenshotAvailable()) {
        return {
          ...recordingEvent,
          screenshotUrl: null,
        };
      }

      const videoPath = this.recordingStoreService.getFilePath(recording.s3Key);

      if (isNaN(recordingEvent.timestamp) || recordingEvent.timestamp < 0) {
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

      await this.recordingStoreService.save(recording);

      return {
        ...recordingEvent,
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

  async generateRecordingEventsScreenshots(
    recordingId: string,
    userId: string,
  ): Promise<void> {
    const recording = await this.recordingStoreService.findOne(recordingId, userId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || Object.keys(recording.events).length === 0) {
      return;
    }

    try {
      const videoPath = this.recordingStoreService.getFilePath(recording.s3Key);

      for (const [eventId, event] of Object.entries(recording.events)) {
        try {
          const eventModel =
            this.recordingEventFactoryService.createRecordingEvent(event);

          if (eventModel.isScreenshotAvailable()) {
            if (isNaN(event.timestamp) || event.timestamp < 0) {
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
          }
        } catch (screenshotError) {
          this.logger.warn(
            `Failed to generate screenshots for event ${eventId}: ${screenshotError.message}`,
            screenshotError.stack,
          );
        }
      }

      await this.recordingStoreService.save(recording);
    } catch (error) {
      throw new AppBaseException(
        `Failed to generate screenshots for recording ${recordingId}`,
        500,
        'GENERATE_SCREENSHOTS_FAILED',
        { recordingId, error: error.message },
      );
    }
  }

  async deleteAllEventsByRecordingId(recordingId: string, userId: string): Promise<void> {
    try {
      const recording = await this.recordingStoreService.findOne(recordingId, userId);

      if (!recording || !recording.events) {
        return;
      }

      const eventIds = Object.keys(recording.events);

      if (eventIds.length === 0) {
        return;
      }

      for (const eventId of eventIds) {
        await this.screenshotService.deleteScreenshotByEventId(eventId);
      }

      recording.events = {};

      await this.recordingStoreService.save(recording);
    } catch (error) {
      this.logger.error(
        `Failed to delete events for recording ${recordingId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async getAllEventsByRecordingId(
    recordingId: string,
    userId: string,
  ): Promise<RecordingEventsRecord> {
    try {
      const recording = await this.recordingStoreService.findOne(recordingId, userId);

      if (!recording) {
        throw new RecordingNotFoundException(recordingId);
      }

      if (!recording.events || Object.keys(recording.events).length === 0) {
        return {};
      }

      const formattedEvents = this.formatEventsForResponse(recording.events);

      return formattedEvents;
    } catch (error) {
      throw new AppBaseException(
        `Failed to get events for recording ${recordingId}`,
        500,
        'GET_EVENTS_FAILED',
        { recordingId, error: error.message },
      );
    }
  }

  async generateAiContentForRecordingEvents(
    recordingId: string,
    userId: string,
  ): Promise<RecordingEventsRecord> {
    const recording = await this.recordingStoreService.findOne(recordingId, userId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    const recordingEventModels = this.recordingEventFactoryService.createRecordingEvents(
      Object.values(recording.events),
    );

    const haveEvents = recordingEventModels.length > 0;
    const aiGeneratableRecordingEvents = recordingEventModels.filter((event) =>
      event.isAiGeneratable(),
    );
    const shouldGenerateAiContent = haveEvents && aiGeneratableRecordingEvents.length > 0;

    if (shouldGenerateAiContent) {
      return {};
    }

    try {
      const aiGeneratedContent =
        await this.recordingEventAiService.fillRecordingEventsWithAiContent(
          aiGeneratableRecordingEvents,
        );

      for (const [eventId, content] of Object.entries(aiGeneratedContent)) {
        const event = this.recordingEventFactoryService.createRecordingEvent(
          recording.events[eventId],
        );

        event.title = content.title;
        event.description = content.description;
        recording.events[eventId] = event;
      }

      await this.recordingStoreService.save(recording);

      return this.formatEventsForResponse(recording.events);
    } catch (error) {
      if (error instanceof AppBaseException) {
        throw error;
      }

      this.logger.error(
        `Failed to generate AI content for recording ${recordingId}: ${error.message}`,
        error.stack,
      );

      throw new AppBaseException(
        `Failed to generate AI content for recording with ID ${recordingId}`,
        500,
        'GENERATE_AI_CONTENT_FAILED',
        {
          recordingId,
          eventCount: Object.keys(recording.events).length,
          error,
        },
      );
    }
  }
}

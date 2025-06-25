import { Injectable, Logger } from '@nestjs/common';
import { Recording } from '../entities/recording.entity';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import { RecordingCoreService } from './recording-core.service';
import { ScreenshotService } from '../../recording-events/services/screenshot.service';
import { CreateRecordingEventDto } from '../../recording-events/dto/create-recording-event.dto';
import { RecordingEvent, RecordingEventData } from '../entities/recording-events.types';
import { GuideGeneratorService } from '../../guides/services/guide-generator.service';
import { RecordingEventNotFoundException } from '../../recording-events/exceptions/recording-event-not-found.exception';
import { ScreenshotProcessingException } from '../../recording-events/exceptions/screenshot-processing.exception';
import { RecordingEventAddException } from '../../recording-events/exceptions/recording-event-add.exception';
import { RecordingNotFoundException } from '../../recording-events/exceptions/recording-not-found.exception';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    private readonly recordingCoreService: RecordingCoreService,
    private readonly screenshotService: ScreenshotService,
    private readonly guideGeneratorService: GuideGeneratorService,
  ) {}

  async create(
    createRecordingDto: CreateRecordingDto,
    file: Express.Multer.File,
  ): Promise<void> {
    await this.recordingCoreService.create(createRecordingDto, file);
  }

  async findAll(): Promise<Array<Recording>> {
    return await this.recordingCoreService.findAll();
  }

  async findOne(id: string): Promise<Recording | null> {
    return await this.recordingCoreService.findOne(id);
  }

  async getSignedUrl(id: string): Promise<string> {
    return await this.recordingCoreService.getSignedUrl(id);
  }

  async remove(id: string): Promise<void> {
    const recording = await this.recordingCoreService.findOne(id);

    if (recording && recording.events) {
      for (const eventId of Object.keys(recording.events)) {
        await this.screenshotService.deleteScreenshotByEventId(eventId);
      }
    }
    return await this.recordingCoreService.remove(id);
  }

  async addEvents(
    recordingId: string,
    events: Record<string, CreateRecordingEventDto>,
  ): Promise<Record<string, RecordingEvent>> {
    const recording = await this.recordingCoreService.findOne(recordingId);
    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    const videoPath = this.recordingCoreService.getFilePath(recording.s3Key);

    try {
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

          if (!recording.events) {
            recording.events = {};
          }

          recording.events[eventId] = {
            ...eventData,
            id: eventId,
            data: eventData.data || {} as RecordingEventData,
            screenshotUrl: `/recordings/${recordingId}/events/${eventId}/screenshot`,
          };
        } catch (screenshotError) {
          this.logger.warn(
            `Failed to generate screenshot for event ${eventId}: ${screenshotError.message}`,
          );

          if (!recording.events) {
            recording.events = {};
          }

          recording.events[eventId] = {
            ...eventData,
            id: eventId,
            data: eventData.data || {} as RecordingEventData,
          };
        }
      }

      await this.recordingCoreService.save(recording);

      return recording.events;
    } catch (error) {
      this.logger.error(
        `Failed to add events to recording ${recordingId}: ${error.message}`,
      );
      throw new RecordingEventAddException(recordingId, error as Error);
    }
  }

  async getEventById(
    recordingId: string,
    eventId: string,
  ): Promise<RecordingEvent | null> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording || !recording.events || !recording.events[eventId]) {
      return null;
    }

    return recording.events[eventId];
  }

  async getAllEvents(recordingId: string): Promise<Record<string, RecordingEvent>> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording || !recording.events) {
      return {};
    }

    return recording.events;
  }

  async deleteEvent(recordingId: string, eventId: string): Promise<void> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording || !recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    await this.screenshotService.deleteScreenshotByEventId(eventId);

    delete recording.events[eventId];

    await this.recordingCoreService.save(recording);
  }

  async updateEvent(
    recordingId: string,
    eventId: string,
    updateEventDto: Partial<RecordingEvent>,
  ): Promise<RecordingEvent> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording || !recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    const currentEvent = recording.events[eventId];
    const videoPath = this.recordingCoreService.getFilePath(recording.s3Key);

    try {
      if (
        updateEventDto.timestamp !== undefined &&
        updateEventDto.timestamp !== currentEvent.timestamp
      ) {
        const relativeTimestamp =
          Math.max(0, updateEventDto.timestamp - recording.startTime) / 1000;

        try {
          await this.screenshotService.generateScreenshotAtTimestamp(
            videoPath,
            eventId,
            relativeTimestamp,
          );
          this.logger.log(
            `Regenerated screenshot for event ${eventId} at updated timestamp ${updateEventDto.timestamp}`,
          );
        } catch (screenshotError) {
          this.logger.warn(
            `Failed to regenerate screenshot for event ${eventId}: ${screenshotError.message}`,
          );
        }
      }

      recording.events[eventId] = {
        ...currentEvent,
        ...updateEventDto,
        id: eventId,
        screenshotUrl: `/recordings/${recordingId}/events/${eventId}/screenshot`,
      };

      await this.recordingCoreService.save(recording);

      return recording.events[eventId];
    } catch (error) {
      throw new ScreenshotProcessingException(eventId, error as Error);
    }
  }

  async addEventScreenshot(
    recordingId: string,
    eventId: string,
    file: Express.Multer.File,
  ): Promise<RecordingEvent> {
    const recording = await this.recordingCoreService.findOne(recordingId);
    
    if (!recording || !recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      await this.screenshotService.saveEventScreenshot(eventId, file);

      recording.events[eventId].screenshotUrl =
        `/recordings/${recordingId}/events/${eventId}/screenshot`;

      await this.recordingCoreService.save(recording);
      return recording.events[eventId];
    } catch (error) {
      throw new ScreenshotProcessingException(eventId, error as Error);
    }
  }

  async regenerateEventScreenshot(
    recordingId: string,
    eventId: string,
  ): Promise<RecordingEvent> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording || !recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    const videoPath = this.recordingCoreService.getFilePath(recording.s3Key);

    const event = recording.events[eventId];

    try {
      const relativeTimestamp =
        Math.max(0, event.timestamp - recording.startTime) / 1000;

      await this.screenshotService.generateScreenshotAtTimestamp(
        videoPath,
        eventId,
        relativeTimestamp,
      );

      recording.events[eventId].screenshotUrl =
        `/recordings/${recordingId}/events/${eventId}/screenshot`;

      await this.recordingCoreService.save(recording);

      return recording.events[eventId];
    } catch (error) {
      throw new ScreenshotProcessingException(eventId, error as Error);
    }
  }

  async generateRecordingEventsScreenshots(recordingId: string): Promise<void> {
    const recording = await this.recordingCoreService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    const videoPath = this.recordingCoreService.getFilePath(recording.s3Key);

    if (recording.events) {
      for (const [eventId, event] of Object.entries(recording.events)) {
        try {
          const relativeTimestamp =
            Math.max(0, event.timestamp - recording.startTime) / 1000;

          await this.screenshotService.generateScreenshotAtTimestamp(
            videoPath,
            eventId,
            relativeTimestamp,
          );

          recording.events[eventId].screenshotUrl =
            `/recordings/${recordingId}/events/${eventId}/screenshot`;

          this.logger.log(`Generated screenshot for event ${eventId}`);
        } catch (error) {
          this.logger.warn(
            `Failed to generate screenshot for event ${eventId}: ${(error as Error).message}`,
          );
        }
      }

      await this.recordingCoreService.save(recording);
    }
  }

  async exportRecordingAsStepGuide(recordingId: string): Promise<string> {
    this.logger.log(`Exporting recording ${recordingId} as step guide`);
    const recording = await this.recordingCoreService.findOne(recordingId);
    
    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    try {
      return this.guideGeneratorService.generateStepByStepGuide(recording, recording.events);
    } catch (error) {
      this.logger.error(`Error generating step guide for recording ${recordingId}: ${error.message}`, error.stack);
      
      throw error;
    }
  }

  async generateEmbedCode(
    recordingId: string, 
    width?: string, 
    height?: string
  ): Promise<string> {
    const recording = await this.recordingCoreService.findOne(recordingId);
    
    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    const widthValue = width || '100%';
    const heightValue = height || '600px';

    return `
      (function() {
        const container = document.createElement('div');
        container.style.width = "${widthValue}";
        container.style.height = "${heightValue}";
        container.innerHTML = '<iframe src="/recordings/${recordingId}/embed" width="100%" height="100%" frameborder="0"></iframe>';
        document.currentScript.parentNode.insertBefore(container, document.currentScript);
      })();
    `;
  }

  getFilePath(key: string): string {
    return this.recordingCoreService.getFilePath(key);
  }

  getEventScreenshotPath(recordingId: string, eventId: string): string | null {
    return this.screenshotService.getEventScreenshotPath(eventId);
  }
}

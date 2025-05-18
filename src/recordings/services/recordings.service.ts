import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recording } from '../entities/recording.entity';
import { CreateRecordingEventDto } from '../dto/create-recording-event.dto';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '../../storage/interfaces/storage-provider.interface';
import { RecordingNotFoundException } from '../exceptions/recording-not-found.exception';
import { AppBaseException } from '../../common/exceptions/base.exception';
import { RecordingEvent } from '../entities/recording-events.types';
import { RecordingEventNotFoundException } from '../exceptions/recording-event-not-found.exceptions';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);
  private eventScreenshotPaths: Record<string, string> = {};

  constructor(
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async create(
    createRecordingDto: CreateRecordingDto,
    file: Express.Multer.File,
  ): Promise<void> {
    const { id, data } = createRecordingDto;

    try {
      const parsedData = JSON.parse(data);
      const startTime = Number(parsedData.startTime);
      const stopTime = parsedData.stopTime ? Number(parsedData.stopTime) : null;
      const duration = stopTime ? Number(stopTime - startTime) : 0;

      const recordingPartial: Partial<Recording> = {
        id,
        duration,
        startTime,
        stopTime,
        name: file.originalname,
        s3Key: id,
        mimeType: file.mimetype,
        fileSize: file.size,
        events: {},
      };

      const recording = this.recordingsRepository.create(recordingPartial);

      await this.storageProvider.saveFile(file, recording.id);

      const videoPath = this.storageProvider.getFilePath(recording.s3Key);

      try {
        const thumbnailPath = await this.storageProvider.generateThumbnail(
          videoPath,
          recording.id,
        );

        recording.thumbnailPath = path.relative(process.cwd(), thumbnailPath);
      } catch (thumbnailError) {
        this.logger.warn(
          `Failed to generate thumbnail for recording ${id}: ${thumbnailError.message}`,
          thumbnailError.stack,
        );

        recording.thumbnailPath = null;
      }

      await this.recordingsRepository.save(recording);
    } catch (error) {
      this.logger.error(`Failed to create a recording: ${error.message}`, error.stack);

      if (error instanceof AppBaseException) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        throw new AppBaseException(
          `Invalid recording data format: ${error.message}`,
          400,
          'INVALID_DATA_FORMAT',
        );
      }

      throw new AppBaseException(
        'Failed to create recording',
        500,
        'RECORDING_CREATE_FAILED',
        { originalError: error.message },
      );
    }
  }

  async findAll(): Promise<Array<Recording>> {
    try {
      return this.recordingsRepository.find();
    } catch (error) {
      this.logger.error(`Failed to fetch recordings: ${error.message}`, error.stack);
      throw new AppBaseException(
        'Failed to fetch recordings',
        500,
        'FETCH_RECORDINGS_FAILED',
      );
    }
  }

  async findOne(id: string): Promise<Recording | null> {
    try {
      const recording = await this.recordingsRepository.findOne({
        where: { id },
      });

      return recording;
    } catch (error) {
      this.logger.error(`Failed to find recording ${id}: ${error.message}`, error.stack);

      throw new AppBaseException(
        `Failed to fetch recording with ID ${id}`,
        500,
        'FETCH_RECORDING_FAILED',
        { recordingId: id },
      );
    }
  }

  async getSignedUrl(id: string): Promise<string> {
    const recording = await this.findOne(id);

    if (!recording) {
      throw new RecordingNotFoundException(id);
    }

    return this.storageProvider.getFilePath(recording.s3Key);
  }

  async remove(id: string): Promise<void> {
    const recording = await this.findOne(id);

    if (!recording) {
      throw new RecordingNotFoundException(id);
    }

    const filePath = this.getFilePath(recording.s3Key);
    const isRecordingSourceExists = fs.existsSync(filePath);

    try {
      if (isRecordingSourceExists) {
        await this.storageProvider.deleteFile(recording.s3Key);
      }

      await this.recordingsRepository.remove(recording);
    } catch (error) {
      this.logger.error(
        `Failed to delete recording ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof AppBaseException) {
        throw error;
      }

      throw new AppBaseException(
        `Failed to delete recording with ID ${id}`,
        500,
        'DELETE_RECORDING_FAILED',
        { recordingId: id },
      );
    }
  }

  async addEvents(
    recordingId: string,
    events: Record<string, CreateRecordingEventDto>,
  ): Promise<Record<string, RecordingEvent>> {
    const recording = await this.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    try {
      if (!recording.events) {
        recording.events = {};
      }

      const videoPath = this.getFilePath(recording.s3Key);

      for (const [eventId, eventData] of Object.entries(events)) {
        try {
          if (isNaN(eventData.timestamp) || eventData.timestamp < 0) {
            this.logger.warn(
              `Invalid timestamp for event ${eventId}: ${eventData.timestamp}. Using default value of 0.`,
            );

            eventData.timestamp = 0;
          }

          const screenshotPath = await this.storageProvider.generateScreenshotAtTimestamp(
            videoPath,
            eventId,
            eventData.timestamp,
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

      await this.recordingsRepository.save(recording);

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

        if (
          !event.id ||
          !event.type ||
          event.timestamp === undefined ||
          event.index === undefined
        ) {
          this.logger.warn(
            `Event ${eventId} is missing required properties: ${JSON.stringify(event)}`,
          );

          result[eventId] = {
            id: event.id || eventId,
            data: event.data || {},
            timestamp: typeof event.timestamp === 'number' ? event.timestamp : 0,
            type: event.type || 'unknown',
            index: typeof event.index === 'number' ? event.index : 0,
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
          index: event.index,
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
    const recording = await this.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || !recording.events[eventId]) {
      return null;
    }

    return recording.events[eventId];
  }

  async deleteEvent(recordingId: string, eventId: string): Promise<void> {
    const recording = await this.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      delete recording.events[eventId];

      await this.recordingsRepository.save(recording);
    } catch (error) {
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
    const recording = await this.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording?.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      const screenshotsDir = path.join(process.cwd(), 'uploads', 'event-screenshots');

      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const filename = `${eventId}-${Date.now()}.jpg`;
      const screenshotPath = path.join(screenshotsDir, filename);

      fs.writeFileSync(screenshotPath, file.buffer);

      recording.events[eventId].screenshotUrl =
        `/recordings/${recordingId}/events/${eventId}/screenshot`;

      await this.recordingsRepository.save(recording);

      return {
        id: recording.events[eventId].id,
        data: recording.events[eventId].data,
        timestamp: recording.events[eventId].timestamp,
        type: recording.events[eventId].type,
        index: recording.events[eventId].index,
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

  getFilePath(key: string): string {
    return this.storageProvider.getFilePath(key);
  }

  getEventScreenshotPath(recordingId: string, eventId: string): string | null {
    const key = `${recordingId}-${eventId}`;
    const screenshotsDir = path.join(process.cwd(), 'uploads', 'event-screenshots');

    try {
      const files = fs
        .readdirSync(screenshotsDir)
        .filter(
          (file) => file.startsWith(`${eventId}`) || file.startsWith(`${eventId}-`),
        );

      if (files.length > 0) {
        const mostRecentFile = files.sort().pop();
        if (mostRecentFile) {
          const filePath = path.join(screenshotsDir, mostRecentFile);

          this.eventScreenshotPaths[key] = filePath;

          return filePath;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error looking for screenshot for event ${eventId}: ${error.message}`,
      );
    }

    return null;
  }

  async regenerateEventScreenshot(
    recordingId: string,
    eventId: string,
  ): Promise<RecordingEvent> {
    const recording = await this.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || !recording.events[eventId]) {
      throw new RecordingEventNotFoundException(eventId);
    }

    try {
      const recordingEvent = recording.events[eventId];
      const videoPath = this.getFilePath(recording.s3Key);

      if (isNaN(recordingEvent.timestamp) || recordingEvent.timestamp < 0) {
        this.logger.warn(
          `Invalid timestamp for event ${eventId}: ${recordingEvent.timestamp}. Using default value of 0.`,
        );

        recordingEvent.timestamp = 0;
      }

      const screenshotPath = await this.storageProvider.generateScreenshotAtTimestamp(
        videoPath,
        eventId,
        recordingEvent.timestamp,
      );

      recording.events[eventId].screenshotUrl =
        `/recordings/${recordingId}/events/${eventId}/screenshot`;

      await this.recordingsRepository.save(recording);

      return {
        id: recordingEvent.id,
        data: recordingEvent.data,
        timestamp: recordingEvent.timestamp,
        type: recordingEvent.type,
        index: recordingEvent.index,
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
  ): Promise<void> {
    const recording = await this.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    if (!recording.events || Object.keys(recording.events).length === 0) {
      return
    }

    try {
      const videoPath = this.getFilePath(recording.s3Key);

      let count = 0;

      for (const [eventId, event] of Object.entries(recording.events)) {
        try {
          if (isNaN(event.timestamp) || event.timestamp < 0) {
            this.logger.warn(
              `Invalid timestamp for event ${eventId}: ${event.timestamp}. Using default value of 0.`,
            );

            event.timestamp = 0;
          }

          const screenshotPath = await this.storageProvider.generateScreenshotAtTimestamp(
            videoPath,
            eventId,
            event.timestamp,
          );

          recording.events[eventId].screenshotUrl =
            `/recordings/${recordingId}/events/${eventId}/screenshot`;
          count++;
        } catch (screenshotError) {
          this.logger.warn(
            `Failed to generate screenshots for event ${eventId}: ${screenshotError.message}`,
            screenshotError.stack,
          );
        }
      }

      await this.recordingsRepository.save(recording);
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
}

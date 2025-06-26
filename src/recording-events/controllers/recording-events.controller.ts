import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'node:fs';
import { Response } from 'express';
import { RecordingEventsService } from '../services/recording-events.service';
import { UpdateRecordingEventDto } from '../dto/update-recording-event.dto';
import { RecordingEvent } from '../entities/recording-events.types';
import { AppBaseException } from '../../common/exceptions/base.exception';
import { RecordingEventNotFoundException } from '../exceptions/recording-event-not-found.exceptions';
import { RecordingNotFoundException } from '../../recordings/exceptions/recording-not-found.exception';
import { StorageException } from '../../storage/exceptions/storage.exception';
import { ScreenshotsService } from '../../screenshots/services/screenshots.service';
import { RecordingStoreService } from '../../recordings-shared/services/recording-store.service';
import { InvalidFileUploadException } from '../../recordings/exceptions/invalid-file-upload.exception';
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOADED_FILE_SIZE,
} from '../../common/constants/media.constants';
import { CreateRecordingEventDto } from '../dto/create-recording-event.dto';
import { RecordingEventsRecord } from '../entities/recording-events.types';

@Controller('recordings')
export class RecordingEventsController {
  constructor(
    private readonly recordingEventsService: RecordingEventsService,
    private readonly recordingStoreService: RecordingStoreService,
    private readonly screenshotsService: ScreenshotsService,
  ) {}

  @Get(':recordingId/events')
  @Header('X-Content-Type-Options', 'nosniff')
  async getEvents(
    @Param('recordingId') recordingId: string,
  ): Promise<RecordingEventsRecord> {
    const recording = await this.recordingStoreService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    return await this.recordingEventsService.getAllEventsByRecordingId(recordingId);
  }

  @Post(':recordingId/events')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Type', 'application/json')
  @HttpCode(HttpStatus.CREATED)
  async addEvents(
    @Param('recordingId') recordingId: string,
    @Body() { events }: { events: Record<string, CreateRecordingEventDto> },
  ): Promise<Record<string, RecordingEvent>> {
    return await this.recordingEventsService.addEvents(recordingId, events);
  }

  @Delete(':recordingId/events/:eventId')
  @Header('X-Content-Type-Options', 'nosniff')
  async deleteEvent(
    @Param('recordingId') recordingId: string,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    const recording = await this.recordingStoreService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    const recordingEvent = await this.recordingEventsService.getEventById(
      recordingId,
      eventId,
    );

    if (!recordingEvent) {
      throw new RecordingEventNotFoundException(eventId);
    }

    await this.recordingEventsService.deleteEvent(recordingId, eventId);
  }

  @Patch(':recordingId/events/:eventId')
  @Header('X-Content-Type-Options', 'nosniff')
  @HttpCode(HttpStatus.OK)
  async updateEvent(
    @Param('recordingId') recordingId: string,
    @Param('eventId') eventId: string,
    @Body() updateEventDto: UpdateRecordingEventDto,
  ): Promise<RecordingEvent> {
    try {
      return await this.recordingEventsService.updateEvent(
        recordingId,
        eventId,
        updateEventDto,
      );
    } catch (error) {
      if (
        error instanceof RecordingNotFoundException ||
        error instanceof RecordingEventNotFoundException
      ) {
        throw error;
      }

      throw new AppBaseException(
        `Failed to update event ${eventId}`,
        500,
        'UPDATE_EVENT_FAILED',
        { recordingId, eventId },
      );
    }
  }

  @Post(':recordingId/events/:eventId/regenerate-screenshot')
  @Header('X-Content-Type-Options', 'nosniff')
  @HttpCode(HttpStatus.OK)
  async regenerateEventScreenshot(
    @Param('recordingId') recordingId: string,
    @Param('eventId') eventId: string,
  ): Promise<RecordingEvent> {
    try {
      return await this.recordingEventsService.regenerateEventScreenshot(
        recordingId,
        eventId,
      );
    } catch (error) {
      if (
        error instanceof RecordingNotFoundException ||
        error instanceof RecordingEventNotFoundException ||
        error instanceof StorageException
      ) {
        throw error;
      }

      throw new AppBaseException(
        `Failed to regenerate screenshot for event ${eventId}`,
        500,
        'REGENERATE_SCREENSHOT_FAILED',
        {
          recordingId,
          eventId,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  @Get(':recordingId/events/:eventId/screenshot')
  @Header('Content-Type', 'image/jpeg')
  async getEventScreenshot(
    @Param('recordingId') recordingId: string,
    @Param('eventId') eventId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    try {
      const recordingEvent = await this.recordingEventsService.getEventById(
        recordingId,
        eventId,
      );

      if (!recordingEvent) {
        throw new RecordingEventNotFoundException(eventId);
      }

      const screenshotPath = this.screenshotsService.getEventScreenshotPath(
        recordingId,
        eventId,
      );

      if (!screenshotPath) {
        throw StorageException.fileNotFound(`Screenshot for event ${eventId}`);
      }

      if (!fs.existsSync(screenshotPath)) {
        throw StorageException.fileNotFound(screenshotPath);
      }

      const file = fs.createReadStream(screenshotPath);
      res.set({
        'Content-Disposition': `inline; filename="${eventId}.jpg"`,
      });

      return new StreamableFile(file);
    } catch (error) {
      if (
        error instanceof RecordingNotFoundException ||
        error instanceof RecordingEventNotFoundException ||
        error instanceof StorageException
      ) {
        throw error;
      }

      throw new AppBaseException(
        `Failed to get screenshot for event ${eventId}`,
        500,
        'GET_SCREENSHOT_FAILED',
        { recordingId, eventId },
      );
    }
  }

  @Post(':recordingId/events/:eventId/screenshot')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_UPLOADED_FILE_SIZE,
        fieldSize: 1024 * 1024,
      },
    }),
  )
  @Header('X-Content-Type-Options', 'nosniff')
  async uploadEventScreenshot(
    @Param('recordingId') recordingId: string,
    @Param('eventId') eventId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<RecordingEvent> {
    const recording = await this.recordingStoreService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    const recordingEvent = await this.recordingEventsService.getEventById(
      recordingId,
      eventId,
    );

    if (!recordingEvent) {
      throw new RecordingEventNotFoundException(eventId);
    }

    if (!file) {
      throw InvalidFileUploadException.noFile();
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw InvalidFileUploadException.invalidType();
    }

    return await this.recordingEventsService.addEventScreenshot(
      recordingId,
      eventId,
      file,
    );
  }

  @Post(':recordingId/events/generate-all-screenshots')
  @Header('X-Content-Type-Options', 'nosniff')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateAllEventScreenshots(
    @Param('recordingId') recordingId: string,
  ): Promise<void> {
    try {
      await this.recordingEventsService.generateRecordingEventsScreenshots(recordingId);
    } catch (error) {
      if (
        error instanceof RecordingNotFoundException ||
        error instanceof StorageException
      ) {
        throw error;
      }

      throw new AppBaseException(
        `Failed to generate screenshots for recording ${recordingId}`,
        500,
        'GENERATE_SCREENSHOTS_FAILED',
        { recordingId },
      );
    }
  }
}

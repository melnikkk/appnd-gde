import * as fs from 'fs';
import { Response, Request } from 'express';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Header,
  Res,
  Req,
  Delete,
  HttpCode,
  HttpStatus,
  StreamableFile,
  Patch,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecordingsService } from '../services/recordings.service';
import { ALLOWED_MIME_TYPES, MAX_UPLOADED_FILE_SIZE } from '../recordings.constants';
import {
  GetRecordingRequestDto,
  GetRecordingResponseDto,
} from '../dto/get-recording.dto';
import { DeleteRecordingDto } from '../dto/delete-recording.dto';
import { CreateRecordingEventDto } from '../dto/create-recording-event.dto';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import { InvalidFileUploadException } from '../exceptions/invalid-file-upload.exception';
import { RecordingNotFoundException } from '../exceptions/recording-not-found.exception';
import { StorageException } from '../../storage/exceptions/storage.exception';
import { RecordingEvent } from '../entities/recording-events.types';
import { RecordingEventNotFoundException } from '../exceptions/recording-event-not-found.exceptions';
import { AppBaseException } from 'src/common/exceptions/base.exception';
import { UpdateRecordingEventDto } from '../dto/update-recording-event.dto';

@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_UPLOADED_FILE_SIZE,
        fieldSize: 1024 * 1024,
      },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createRecordingDto: CreateRecordingDto,
  ): Promise<void> {
    if (!file) {
      throw InvalidFileUploadException.noFile();
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw InvalidFileUploadException.invalidType();
    }

    return this.recordingsService.create(createRecordingDto, file);
  }

  @Get(':id/source')
  async getVideoSource(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const recording = await this.recordingsService.findOne(id);

    if (!recording) {
      throw new RecordingNotFoundException(id);
    }

    const filePath = this.recordingsService.getFilePath(recording.s3Key);

    if (!fs.existsSync(filePath)) {
      throw StorageException.fileNotFound(filePath);
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': recording.mimeType,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': recording.mimeType,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }

  @Get(':id/thumbnail')
  async getThumbnail(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const recording = await this.recordingsService.findOne(id);

    if (!recording) {
      throw new RecordingNotFoundException(id);
    }

    if (!recording.thumbnailPath) {
      throw StorageException.fileNotFound(`Thumbnail for recording ${id}`);
    }

    const thumbnailPath = recording.thumbnailPath;

    if (!fs.existsSync(thumbnailPath)) {
      throw StorageException.fileNotFound(thumbnailPath);
    }

    const file = fs.createReadStream(thumbnailPath);
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `inline; filename="${id}.jpg"`,
    });

    return new StreamableFile(file);
  }

  @Get()
  @Header('X-Content-Type-Options', 'nosniff')
  async findAll(): Promise<Array<GetRecordingResponseDto>> {
    const recordings = await this.recordingsService.findAll();

    return recordings.map(
      ({ thumbnailPath, startTime, stopTime, duration, ...recording }) => ({
        ...recording,
        startTime: Number(startTime),
        stopTime: stopTime !== null ? Number(stopTime) : null,
        duration: Number(duration),
        sourceUrl: `/recordings/${recording.id}/source`,
        thumbnailUrl: thumbnailPath ? `/recordings/${recording.id}/thumbnail` : null,
      }),
    );
  }

  @Get('/:id')
  @Header('X-Content-Type-Options', 'nosniff')
  async findOne(
    @Param() { id }: GetRecordingRequestDto,
  ): Promise<GetRecordingResponseDto> {
    const recording = await this.recordingsService.findOne(id);

    if (!recording) {
      throw new RecordingNotFoundException(id);
    }

    const { thumbnailPath, startTime, stopTime, duration, ...recordingData } = recording;

    return {
      ...recordingData,
      startTime: Number(startTime),
      stopTime: stopTime !== null ? Number(stopTime) : null,
      duration: Number(duration),
      sourceUrl: `/recordings/${recording.id}/source`,
      thumbnailUrl: thumbnailPath ? `/recordings/${recording.id}/thumbnail` : null,
    };
  }

  @Delete('/:id')
  @Header('X-Content-Type-Options', 'nosniff')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param() { id }: DeleteRecordingDto): Promise<void> {
    await this.recordingsService.remove(id);
  }

  @Post(':recordingId/events')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Type', 'application/json')
  @HttpCode(HttpStatus.CREATED)
  async addEvents(
    @Param('recordingId') recordingId: string,
    @Body() { events }: { events: Record<string, CreateRecordingEventDto> },
  ): Promise<Record<string, RecordingEvent>> {
    return await this.recordingsService.addEvents(recordingId, events);
  }

  @Get(':recordingId/events')
  @Header('X-Content-Type-Options', 'nosniff')
  async getEvents(
    @Param('recordingId') recordingId: string,
  ): Promise<Record<string, RecordingEvent>> {
    const recording = await this.recordingsService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    return await this.recordingsService.getAllEvents(recordingId);
  }

  @Delete(':recordingId/events/:eventId')
  @Header('X-Content-Type-Options', 'nosniff')
  async deleteEvent(
    @Param('recordingId') recordingId: string,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    const recording = await this.recordingsService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    const recordingEvent = await this.recordingsService.getEventById(
      recordingId,
      eventId,
    );

    if (!recordingEvent) {
      throw new RecordingEventNotFoundException(eventId);
    }

    await this.recordingsService.deleteEvent(recordingId, eventId);
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
    const recording = await this.recordingsService.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    const recordingEvent = await this.recordingsService.getEventById(
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

    return await this.recordingsService.addEventScreenshot(recordingId, eventId, file);
  }

  @Get(':recordingId/events/:eventId/screenshot')
  async getEventScreenshot(
    @Param('recordingId') recordingId: string,
    @Param('eventId') eventId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    try {
      const recordingEvent = await this.recordingsService.getEventById(
        recordingId,
        eventId,
      );

      if (!recordingEvent) {
        throw new RecordingEventNotFoundException(eventId);
      }

      const screenshotPath = this.recordingsService.getEventScreenshotPath(
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
        'Content-Type': 'image/jpeg',
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

  @Post(':recordingId/events/:eventId/regenerate-screenshot')
  @Header('X-Content-Type-Options', 'nosniff')
  @HttpCode(HttpStatus.OK)
  async regenerateEventScreenshot(
    @Param('recordingId') recordingId: string,
    @Param('eventId') eventId: string,
  ): Promise<RecordingEvent> {
    try {
      return await this.recordingsService.regenerateEventScreenshot(recordingId, eventId);
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
        { recordingId, eventId, error: error.message },
      );
    }
  }

  @Post(':recordingId/events/generate-all-screenshots')
  @Header('X-Content-Type-Options', 'nosniff')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateAllEventScreenshots(
    @Param('recordingId') recordingId: string,
  ): Promise<void> {
    try {
      await this.recordingsService.generateRecordingEventsScreenshots(recordingId);
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

  @Patch(':recordingId/events/:eventId')
  @Header('X-Content-Type-Options', 'nosniff')
  @HttpCode(HttpStatus.OK)
  async updateEvent(
    @Param('recordingId') recordingId: string,
    @Param('eventId') eventId: string,
    @Body() updateEventDto: UpdateRecordingEventDto,
  ): Promise<RecordingEvent> {
    try {
      return await this.recordingsService.updateEvent(
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

  @Get(':id/guide')
  @Header('Content-Type', 'text/plain')
  async exportRecordingAsStepGuide(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const recording = await this.recordingsService.findOne(id);

    if (!recording) {
      throw new RecordingNotFoundException(id);
    }

    const htmlContent = await this.recordingsService.exportRecordingAsStepGuide(id);

    if (!htmlContent) {
      throw new AppBaseException(
        'Failed to generate step guide',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'STEP_GUIDE_GENERATION_FAILED',
      );
    }

    return htmlContent;
  }

  @Get(':id/embed-code')
  @Header('Content-Type', 'text/plain')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'")
  async getEmbedCode(
    @Param('id') id: string,
    @Res({ passthrough: true }) _res: Response,
    @Query('width') width?: string,
    @Query('height') height?: string,
  ): Promise<string> {
    const recording = await this.recordingsService.findOne(id);

    if (!recording) {
      throw new RecordingNotFoundException(id);
    }

    const embedCode = await this.recordingsService.generateEmbedCode(id, width, height);

    if (!embedCode) {
      throw new AppBaseException(
        'Failed to generate embed code',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'EMBED_CODE_GENERATION_FAILED',
      );
    }

    return embedCode;
  }
}

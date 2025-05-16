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
  ): Promise<void> {
    await this.recordingsService.addEvents(recordingId, events);
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

    return recording.events || {};
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

    const recordingEvent = await this.recordingsService.getEventById(recordingId, eventId);

    if (!recordingEvent) {
      throw new RecordingEventNotFoundException(eventId);
    }

    await this.recordingsService.deleteEvent(recordingId, eventId);
  }
}

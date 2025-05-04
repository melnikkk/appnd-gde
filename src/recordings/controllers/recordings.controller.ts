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
  BadRequestException,
  InternalServerErrorException,
  Header,
  NotFoundException,
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
import { Recording } from '../entities/recording.entity';
import { DeleteRecordingDto } from '../dto/delete-recording.dto';
import { CreateRecordingEventDto } from '../dto/create-recording-event.dto';

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
      throw new BadRequestException('No file uploaded');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
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
      throw new NotFoundException('Recording not found');
    }

    const filePath = this.recordingsService.getFilePath(recording.s3Key);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Video file not found');
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
      throw new NotFoundException('Recording not found');
    }

    if (!recording.thumbnailPath) {
      throw new NotFoundException('Thumbnail not found for this recording');
    }

    const thumbnailPath = recording.thumbnailPath;

    if (!fs.existsSync(thumbnailPath)) {
      throw new NotFoundException('Thumbnail file not found');
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

    return recordings.map(({ thumbnailPath, ...recording }) => ({
      ...recording,
      sourceUrl: `/recordings/${recording.id}/source`,
      thumbnailUrl: thumbnailPath ? `/recordings/${recording.id}/thumbnail` : null,
    }));
  }

  @Get('/:id')
  @Header('X-Content-Type-Options', 'nosniff')
  async findOne(
    @Param() { id }: GetRecordingRequestDto,
  ): Promise<GetRecordingResponseDto> {
    try {
      const recording = await this.recordingsService.findOne(id);

      if (!recording) {
        throw new NotFoundException(`Recording with ID ${id} not found`);
      }

      const { thumbnailPath, ...recordingData } = recording;

      return {
        ...recordingData,
        sourceUrl: `/recordings/${recording.id}/source`,
        thumbnailUrl: thumbnailPath ? `/recordings/${recording.id}/thumbnail` : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to fetch recording');
    }
  }

  @Delete('/:id')
  @Header('X-Content-Type-Options', 'nosniff')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param() { id }: DeleteRecordingDto): Promise<void> {
    try {
      const recording = await this.recordingsService.findOne(id);

      if (!recording) {
        throw new NotFoundException(`Recording with ID ${id} not found`);
      }

      await this.recordingsService.remove(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to delete recording');
    }
  }

  @Post(':recordingId/events')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Type', 'application/json')
  @HttpCode(HttpStatus.CREATED)
  async addEvents(
    @Param('recordingId') recordingId: string,
    @Body() body: { events: Array<CreateRecordingEventDto> },
  ): Promise<void> {
    try {
      await this.recordingsService.addEvents(recordingId, body.events);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to add events');
    }
  }

  @Get(':recordingId/events')
  @Header('X-Content-Type-Options', 'nosniff')
  async getEvents(
    @Param('recordingId') recordingId: string,
  ): Promise<Recording['events']> {
    const recording = await this.recordingsService.findOne(recordingId);

    if (!recording) {
      throw new NotFoundException(`Recording with ID ${recordingId} not found`);
    }

    return recording.events;
  }
}

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
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecordingsService } from '../services/recordings.service';
import {
  GetRecordingRequestDto,
  GetRecordingResponseDto,
} from '../dto/get-recording.dto';
import { DeleteRecordingDto } from '../dto/delete-recording.dto';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import { InvalidFileUploadException } from '../exceptions/invalid-file-upload.exception';
import { RecordingNotFoundException } from '../exceptions/recording-not-found.exception';
import { StorageException } from '../../storage/exceptions/storage.exception';
import { AppBaseException } from 'src/common/exceptions/base.exception';
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOADED_FILE_SIZE,
} from '../../common/constants/media.constants';
import { Recording } from '../entities/recording.entity';

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
  ): Promise<Recording> {
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

  @Get(':id/guide')
  @Header('Content-Type', 'text/plain')
  async exportRecordingAsStepGuide(@Param('id') id: string): Promise<string> {
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
  @Header('Content-Type', 'text/javascript')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'")
  async getEmbedCode(
    @Param('id') id: string,
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

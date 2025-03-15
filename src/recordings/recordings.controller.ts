import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'node:path';
import { RecordingsService } from './recordings.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { ALLOWED_MIME_TYPES, MAX_UPLOADED_FILE_SIZE } from './recordings.constants';

@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_UPLOADED_FILE_SIZE,
      },
    }),
  )
  create(@UploadedFile() file: Express.Multer.File, @Body() { id }: CreateRecordingDto) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    const doesRecordingIdExist = this.recordingsService.findOne(id);

    if (doesRecordingIdExist) {
      throw new ConflictException('Recording ID already exists');
    }

    try {
      const sanitizedFilename = path.basename(file.originalname);

      // Log the file details
      console.log('File received:', {
        id,
        filename: sanitizedFilename,
        mimetype: file.mimetype,
        size: file.size,
      });

      this.recordingsService.create({ file, id, fileName: sanitizedFilename });
    } catch (error) {
      throw new InternalServerErrorException('Failed to save recording');
    }

    return { message: 'File uploaded successfully', file };
  }

  @Get()
  findAll() {
    return this.recordingsService.findAll();
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.recordingsService.findOne(id);
  }

  @Delete('/:id')
  remove(@Param('id') id: string) {
    console.log('DELETE request received. Recording id: ', id);
    return this.recordingsService.remove(id);
  }
}

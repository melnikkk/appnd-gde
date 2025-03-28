/*
 * TODO:
 *  1  Add request throttling
 *  2  Secure sensitive data for get recording handlers
 *  3 Provide sorting and filtering for lists
 * */

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
  Header,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'node:path';
import { RecordingsService } from './recordings.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { ALLOWED_MIME_TYPES, MAX_UPLOADED_FILE_SIZE } from './recordings.constants';
import { GetRecordingDto } from './dto/get-recording.dto';
import { DeleteRecordingDto } from './dto/delete-recording.dto';

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
  @Header('X-Content-Type-Options', 'nosniff')
  findAll() {
    return this.recordingsService.findAll();
  }

  @Get('/:id')
  @Header('X-Content-Type-Options', 'nosniff')
  findOne(@Param() params: GetRecordingDto) {
    try {
      const recording = this.recordingsService.findOne(params.id);

      if (!recording) {
        throw new NotFoundException(`Recording with ID ${params.id} not found`);
      }

      // TODO: use recording DTO mapper
      return recording;
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
  remove(@Param() { id }: DeleteRecordingDto) {
    console.log('DELETE request received. Recording id: ', id);
    try {
      this.recordingsService.remove(id);

      return;
    } catch (error) {
      console.error(`Failed to delete recording ${id}:`, error);

      throw new InternalServerErrorException('Failed to delete recording');
    }
  }
}

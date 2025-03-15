import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      console.error('No file received');

      return { message: 'No file received' };
    }

    // Log the file details
    console.log('File received:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    return { message: 'File uploaded successfully', file };
  }

  @Get()
  findAll() {
    return this.recordingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recordingsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRecordingDto: UpdateRecordingDto) {
    return this.recordingsService.update(+id, updateRecordingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recordingsService.remove(+id);
  }
}

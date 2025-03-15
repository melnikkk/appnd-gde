import { Injectable } from '@nestjs/common';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';

@Injectable()
export class RecordingsService {
  create(createRecordingDto: CreateRecordingDto) {
    return 'This action adds a new recording';
  }

  findAll() {
    return `This action returns all recordings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} recording`;
  }

  update(id: number, updateRecordingDto: UpdateRecordingDto) {
    return `This action updates a #${id} recording`;
  }

  remove(id: number) {
    return `This action removes a #${id} recording`;
  }
}

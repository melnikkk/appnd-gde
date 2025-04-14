import * as fs from 'fs';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recording } from '../entities/recording.entity';
import { RecordingEvent } from '../entities/recording-event.entity';
import { LocalStorageService } from './storage/local-storage.service';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import { CreateRecordingEventDto } from '../dto/create-recording-event.dto';

@Injectable()
export class RecordingsService {
  constructor(
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @InjectRepository(RecordingEvent)
    private readonly recordingEventsRepository: Repository<RecordingEvent>,
    private readonly localStorageService: LocalStorageService,
  ) {}

  async create(
    createRecordingDto: CreateRecordingDto,
    file: Express.Multer.File,
  ): Promise<void> {
    const { ...recordingData } = createRecordingDto;

    const recording = this.recordingsRepository.create({
      ...recordingData,
      name: recordingData.name || file.originalname,
      s3Key: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    });
    await this.recordingsRepository.save(recording);

    await this.localStorageService.saveFile(file, recording.s3Key);

    // const recordingEvents = JSON.parse(events);

    // if (recordingEvents.length > 0) {
    //   console.log(typeof events, Array.isArray(events));
    //   const recordingEvents = events.map((event) =>
    //     this.recordingEventsRepository.create({
    //       ...event,
    //       recording: { id: recording.id },
    //     }),
    //   );
    //   await this.recordingEventsRepository.save(recordingEvents);
    // }
  }

  async findAll(): Promise<Array<Recording>> {
    return this.recordingsRepository.find({
      relations: ['events'],
    });
  }

  async findOne(id: string): Promise<Recording | null> {
    return this.recordingsRepository.findOne({
      where: { id },
      relations: ['events'],
    });
  }

  async getSignedUrl(id: string): Promise<string> {
    const recording = await this.findOne(id);

    if (!recording) {
      throw new Error('Recording not found');
    }

    return this.localStorageService.getFilePath(recording.s3Key);
  }

  async remove(id: string): Promise<void> {
    const recording = await this.findOne(id);

    if (!recording) {
      throw new NotFoundException(`Recording with ID ${id} not found`);
    }

    const filePath = this.getFilePath(recording.s3Key);
    const isRecordingSourceExists = fs.existsSync(filePath);

    try {
      if (isRecordingSourceExists) {
        await this.localStorageService.deleteFile(recording.s3Key);
      }

      await this.recordingsRepository.remove(recording);
    } catch {
      throw new InternalServerErrorException('Failed to delete recording');
    }
  }

  async addEvents(
    recordingId: string,
    events: Array<CreateRecordingEventDto>,
  ): Promise<Array<RecordingEvent>> {
    const recording = await this.findOne(recordingId);

    if (!recording) {
      throw new NotFoundException(`Recording with ID ${recordingId} not found`);
    }

    const recordingEvents = events.map((event) =>
      this.recordingEventsRepository.create({
        ...event,
        recording,
      }),
    );

    return this.recordingEventsRepository.save(recordingEvents);
  }

  getFilePath(key: string): string {
    return this.localStorageService.getFilePath(key);
  }
}

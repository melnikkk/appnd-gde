import * as fs from 'fs';
import * as path from 'path';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recording } from '../entities/recording.entity';
import { RecordingEvent } from '../entities/recording-event.entity';
import { CreateRecordingEventDto } from '../dto/create-recording-event.dto';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import { STORAGE_PROVIDER, StorageProvider } from '../../storage/interfaces/storage-provider.interface';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @InjectRepository(RecordingEvent)
    private readonly recordingEventsRepository: Repository<RecordingEvent>,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async create(
    createRecordingDto: CreateRecordingDto,
    file: Express.Multer.File,
  ): Promise<void> {
    const { id, data } = createRecordingDto;

    const recordingData = JSON.parse(data);
    const startTime = BigInt(recordingData.startTime);
    const stopTime = recordingData.stopTime ? BigInt(recordingData.stopTime) : null;
    const duration = stopTime ? Number(stopTime - startTime) : 0;

    const recordingPartial: Partial<Recording> = {
      id,
      duration,
      startTime: Number(startTime),
      stopTime: stopTime ? Number(stopTime) : null,
      name: file.originalname,
      s3Key: id,
      mimeType: file.mimetype,
      fileSize: file.size,
    };

    const recording = this.recordingsRepository.create(recordingPartial);

    try {
      await this.storageProvider.saveFile(file, recording.id);

      const videoPath = this.storageProvider.getFilePath(recording.s3Key);
      const thumbnailPath = await this.storageProvider.generateThumbnail(
        videoPath,
        recording.id,
      );

      recording.thumbnailPath = path.relative(process.cwd(), thumbnailPath);

      await this.recordingsRepository.save(recording);
    } catch (error) {
      this.logger.error(`Failed to create a recording: ${error.message}`, error.stack);
      
      throw new InternalServerErrorException('Failed to create recording');
    }
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
      throw new NotFoundException(`Recording with ID ${id} not found`);
    }

    return this.storageProvider.getFilePath(recording.s3Key);
  }

  async remove(id: string): Promise<void> {
    const recording = await this.findOne(id);

    if (!recording) {
      throw new NotFoundException(`Recording with ID ${id} not found`);
    }

    const filePath = this.getFilePath(recording.s3Key);
    const isRecordingSourceExists = fs.existsSync(filePath);

    try {
      if (recording.events && recording.events.length > 0) {
        await this.recordingEventsRepository.remove(recording.events);
      }

      if (isRecordingSourceExists) {
        await this.storageProvider.deleteFile(recording.s3Key);
      }

      await this.recordingsRepository.remove(recording);
    } catch (error) {
      this.logger.error(
        `Failed to delete recording ${id}: ${error.message}`,
        error.stack,
      );

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
    return this.storageProvider.getFilePath(key);
  }
}

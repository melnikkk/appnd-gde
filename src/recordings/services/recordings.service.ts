import * as fs from 'fs';
import * as path from 'path';
import {
  Injectable,
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
import { RecordingNotFoundException } from '../exceptions/recording-not-found.exception';
import { AppBaseException } from '../../common/exceptions/base.exception';

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

    try {
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
      
      if (error instanceof AppBaseException) {
        throw error;
      }
      
      if (error instanceof SyntaxError) {
        throw new AppBaseException(
          `Invalid recording data format: ${error.message}`, 
          400, 
          'INVALID_DATA_FORMAT'
        );
      }
      
      throw new AppBaseException(
        'Failed to create recording',
        500,
        'RECORDING_CREATE_FAILED',
        { originalError: error.message }
      );
    }
  }

  async findAll(): Promise<Array<Recording>> {
    try {
      return this.recordingsRepository.find({
        relations: ['events'],
      });
    } catch (error) {
      this.logger.error(`Failed to fetch recordings: ${error.message}`, error.stack);
      throw new AppBaseException(
        'Failed to fetch recordings', 
        500, 
        'FETCH_RECORDINGS_FAILED'
      );
    }
  }

  async findOne(id: string): Promise<Recording | null> {
    try {
      const recording = await this.recordingsRepository.findOne({
        where: { id },
        relations: ['events'],
      });
      
      return recording;
    } catch (error) {
      this.logger.error(`Failed to find recording ${id}: ${error.message}`, error.stack);

      throw new AppBaseException(
        `Failed to fetch recording with ID ${id}`,
        500,
        'FETCH_RECORDING_FAILED',
        { recordingId: id }
      );
    }
  }

  async getSignedUrl(id: string): Promise<string> {
    const recording = await this.findOne(id);

    if (!recording) {
      throw new RecordingNotFoundException(id);
    }

    return this.storageProvider.getFilePath(recording.s3Key);
  }

  async remove(id: string): Promise<void> {
    const recording = await this.findOne(id);

    if (!recording) {
      throw new RecordingNotFoundException(id);
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

      if (error instanceof AppBaseException) {
        throw error;
      }

      throw new AppBaseException(
        `Failed to delete recording with ID ${id}`,
        500,
        'DELETE_RECORDING_FAILED',
        { recordingId: id }
      );
    }
  }

  async addEvents(
    recordingId: string,
    events: Array<CreateRecordingEventDto>,
  ): Promise<Array<RecordingEvent>> {
    const recording = await this.findOne(recordingId);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    try {
      const recordingEvents = events.map((event) =>
        this.recordingEventsRepository.create({
          ...event,
          recording,
        }),
      );

      return this.recordingEventsRepository.save(recordingEvents);
    } catch (error) {
      this.logger.error(
        `Failed to add events to recording ${recordingId}: ${error.message}`,
        error.stack
      );
      
      throw new AppBaseException(
        `Failed to add events to recording with ID ${recordingId}`,
        500,
        'ADD_EVENTS_FAILED',
        { recordingId, eventCount: events.length }
      );
    }
  }

  getFilePath(key: string): string {
    return this.storageProvider.getFilePath(key);
  }
}

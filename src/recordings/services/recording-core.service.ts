import { Injectable, Logger, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Recording } from '../entities/recording.entity';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import { StorageProvider } from '../../storage/interfaces/storage-provider.interface';
import { STORAGE_PROVIDER } from '../../storage/interfaces/storage-provider.interface';
import { AppBaseException } from '../../common/exceptions/base.exception';
import * as path from 'path';
import { RecordingStoreService } from '../../recordings-shared/services/recording-store.service';

@Injectable()
export class RecordingCoreService {
  private readonly logger = new Logger(RecordingCoreService.name);

  constructor(
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private readonly recordingStoreService: RecordingStoreService,
  ) {}

  async create(
    createRecordingDto: CreateRecordingDto,
    file: Express.Multer.File,
  ): Promise<Recording> {
    const { id, data } = createRecordingDto;

    try {
      const parsedData = JSON.parse(data);
      const startTime = Number(parsedData.startTime);
      const stopTime = parsedData.stopTime ? Number(parsedData.stopTime) : null;
      const duration = stopTime ? Number(stopTime - startTime) : 0;
      const viewData = parsedData.viewData;

      const recordingPartial: Partial<Recording> = {
        id,
        duration,
        startTime,
        stopTime,
        viewData,
        name: file.originalname,
        s3Key: id,
        mimeType: file.mimetype,
        fileSize: file.size,
        events: {},
      };

      const recording = this.recordingsRepository.create(recordingPartial);

      await this.storageProvider.saveFile(file, recording.id);

      const videoPath = this.storageProvider.getFilePath(recording.s3Key);

      try {
        const thumbnailPath = await this.storageProvider.generateThumbnail(
          videoPath,
          recording.id,
        );

        recording.thumbnailPath = path.relative(process.cwd(), thumbnailPath);
      } catch (thumbnailError) {
        this.logger.warn(
          `Failed to generate thumbnail for recording ${id}: ${thumbnailError.message}`,
          thumbnailError.stack,
        );

        recording.thumbnailPath = null;
      }

      return await this.recordingsRepository.save(recording);
    } catch (error) {
      this.logger.error(`Failed to create a recording: ${error.message}`, error.stack);

      if (error instanceof AppBaseException) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        throw new AppBaseException(
          `Invalid recording data format: ${error.message}`,
          400,
          'INVALID_DATA_FORMAT',
        );
      }

      throw new AppBaseException(
        'Failed to create recording',
        500,
        'RECORDING_CREATE_FAILED',
        { originalError: error.message },
      );
    }
  }

  findAll(userId: string): Promise<Array<Recording>> {
    return this.recordingStoreService.findAll(userId);
  }

  findOne(id: string, userId: string): Promise<Recording | null> {
    return this.recordingStoreService.findOne(id, userId);
  }

  remove(id: string, userId: string): Promise<void> {
    return this.recordingStoreService.remove(id, userId);
  }

  getFilePath(key: string): string {
    return this.recordingStoreService.getFilePath(key);
  }

  save(recording: Recording): Promise<Recording> {
    return this.recordingStoreService.save(recording);
  }

  deleteAllEvents(recordingId: string, userId: string): Promise<void> {
    return this.recordingStoreService.deleteAllEvents(recordingId, userId);
  }
}

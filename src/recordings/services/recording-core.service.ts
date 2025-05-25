import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recording } from '../entities/recording.entity';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '../../storage/interfaces/storage-provider.interface';
import { RecordingNotFoundException } from '../exceptions/recording-not-found.exception';
import { AppBaseException } from '../../common/exceptions/base.exception';
import * as path from 'path';

@Injectable()
export class RecordingCoreService {
  private readonly logger = new Logger(RecordingCoreService.name);

  constructor(
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
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
      const viewData = parsedData.viewData

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

  async findAll(): Promise<Array<Recording>> {
    try {
      return this.recordingsRepository.find();
    } catch (error) {
      this.logger.error(`Failed to fetch recordings: ${error.message}`, error.stack);
      throw new AppBaseException(
        'Failed to fetch recordings',
        500,
        'FETCH_RECORDINGS_FAILED',
      );
    }
  }

  async findOne(id: string): Promise<Recording | null> {
    try {
      const recording = await this.recordingsRepository.findOne({
        where: { id },
      });

      return recording;
    } catch (error) {
      this.logger.error(`Failed to find recording ${id}: ${error.message}`, error.stack);

      throw new AppBaseException(
        `Failed to fetch recording with ID ${id}`,
        500,
        'FETCH_RECORDING_FAILED',
        { recordingId: id },
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

    try {
      const filePath = this.getFilePath(recording.s3Key);
      const exists = await this.fileExists(filePath);

      if (exists) {
        await this.storageProvider.deleteFile(recording.s3Key);
        this.logger.log(`Deleted recording file: ${recording.s3Key}`);
      }

      if (recording.thumbnailPath) {
        try {
          const fullThumbnailPath = path.join(process.cwd(), recording.thumbnailPath);

          if (await this.fileExists(fullThumbnailPath)) {
            require('fs').unlinkSync(fullThumbnailPath);
            this.logger.log(`Deleted recording thumbnail: ${recording.thumbnailPath}`);
          }
        } catch (thumbnailError) {
          this.logger.warn(`Failed to delete thumbnail for recording ${id}: ${thumbnailError.message}`);
        }
      }

      await this.recordingsRepository.remove(recording);

      this.logger.log(`Successfully deleted recording ${id} from database`);
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
        { recordingId: id },
      );
    }
  }

  getFilePath(key: string): string {
    return this.storageProvider.getFilePath(key);
  }

  async save(recording: Recording): Promise<Recording> {
    return this.recordingsRepository.save(recording);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      return require('fs').existsSync(filePath);
    } catch (error) {
      this.logger.warn(`Error checking if file exists: ${error.message}`);
      return false;
    }
  }
}

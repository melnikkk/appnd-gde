import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recording } from '../../recordings/entities/recording.entity';
import { STORAGE_PROVIDER } from '../../storage/interfaces/storage-provider.interface';
import { StorageProvider } from '../../storage/interfaces/storage-provider.interface';
import { AppBaseException } from '../../common/exceptions/base.exception';
import { RecordingNotFoundException } from '../../recordings/exceptions/recording-not-found.exception';
import { UserNotFoundException } from '../../auth/exceptions/user-not-found.exception';

@Injectable()
export class RecordingStoreService {
  private readonly logger = new Logger(RecordingStoreService.name);

  constructor(
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async findOne(id: string, userId: string): Promise<Recording | null> {
    if (!userId) {
      throw UserNotFoundException.noAuthenticatedUser();
    }

    try {
      const recording = await this.recordingsRepository.findOne({
        where: { id, userId },
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

  save(recording: Recording): Promise<Recording> {
    return this.recordingsRepository.save(recording);
  }

  getFilePath(key: string): string {
    return this.storageProvider.getFilePath(key);
  }

  fileExists(filePath: string): boolean {
    try {
      return require('fs').existsSync(filePath);
    } catch (error) {
      this.logger.warn(`Error checking if file exists: ${error.message}`);
      return false;
    }
  }

  findAll(userId: string): Promise<Array<Recording>> {
    if (!userId) {
      throw UserNotFoundException.noAuthenticatedUser();
    }

    try {
      return this.recordingsRepository.find({
        where: { userId },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch recordings: ${error.message}`, error.stack);
      throw new AppBaseException(
        'Failed to fetch recordings',
        500,
        'FETCH_RECORDINGS_FAILED',
      );
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const recording = await this.findOne(id, userId);

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
          const fullThumbnailPath = require('path').join(
            process.cwd(),
            recording.thumbnailPath,
          );

          if (await this.fileExists(fullThumbnailPath)) {
            require('fs').unlinkSync(fullThumbnailPath);
            this.logger.log(`Deleted recording thumbnail: ${recording.thumbnailPath}`);
          }
        } catch (thumbnailError) {
          this.logger.warn(
            `Failed to delete thumbnail for recording ${id}: ${thumbnailError.message}`,
          );
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

  async deleteAllEvents(recordingId: string, userId: string): Promise<void> {
    try {
      const recording = await this.findOne(recordingId, userId);

      if (!recording || !recording.events) {
        return;
      }

      const eventIds = Object.keys(recording.events);

      if (eventIds.length === 0) {
        return;
      }

      recording.events = {};

      await this.save(recording);
    } catch (error) {
      this.logger.error(
        `Failed to clear events for recording ${recordingId}: ${error.message}`,
        error.stack,
      );
    }
  }
}

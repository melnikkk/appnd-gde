import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { Recording } from '../entities/recording.entity';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import { GuideGeneratorService } from '../../guides/services/guide-generator.service';
import { EmbedCodeService } from './embed-code.service';
import { ScreenshotsService } from '../../screenshots/services/screenshots.service';
import { RecordingStoreService } from '../../recordings-shared/services/recording-store.service';
import { STORAGE_PROVIDER } from '../../storage/interfaces/storage-provider.interface';
import { StorageProvider } from '../../storage/interfaces/storage-provider.interface';
import { AppBaseException } from '../../common/exceptions/base.exception';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    private readonly recordingStoreService: RecordingStoreService,
    private readonly guideGeneratorService: GuideGeneratorService,
    private readonly embedCodeService: EmbedCodeService,
    private readonly screenshotsService: ScreenshotsService,
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
      const videoPath = this.storageProvider.getFilePath(recording.s3Key);

      await this.storageProvider.saveFile(file, recording.id);

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

  findAll(): Promise<Array<Recording>> {
    return this.recordingStoreService.findAll();
  }

  findOne(id: string): Promise<Recording | null> {
    return this.recordingStoreService.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.recordingStoreService.deleteAllEvents(id);
    await this.screenshotsService.deleteScreenshotsByRecordingId(id);

    return this.recordingStoreService.remove(id);
  }

  getFilePath(key: string): string {
    return this.recordingStoreService.getFilePath(key);
  }

  async exportRecordingAsStepGuide(recordingId: string): Promise<string | null> {
    const recording = await this.findOne(recordingId);

    if (!recording) {
      return null;
    }

    return this.guideGeneratorService.generateStepByStepGuide(
      recording,
      recording.events,
    );
  }

  async generateEmbedCode(
    recordingId: string,
    width?: string,
    height?: string,
  ): Promise<string | null> {
    const stepGuideContent = await this.exportRecordingAsStepGuide(recordingId);

    if (!stepGuideContent) {
      return null;
    }

    const encodedStepGuide = Buffer.from(stepGuideContent).toString('base64');
    const serverUrl =
      process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;

    return this.embedCodeService.generateEmbedCode({
      recordingId,
      width,
      height,
      serverUrl,
      encodedContent: encodedStepGuide,
    });
  }
}

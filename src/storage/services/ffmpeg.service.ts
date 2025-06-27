import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as ffmpeg from 'fluent-ffmpeg';
import { StorageException } from '../exceptions/storage.exception';
import { PathManagerService } from './path-manager.service';

@Injectable()
export class FfmpegService {
  private readonly DEFAULT_VIDEO_DURATION_SECONDS = 60;
  private readonly MINIMUM_TIMESTAMP_SECONDS = 1;
  private readonly MAX_DURATION_PERCENTAGE = 0.95;
  private readonly DEFAULT_THUMBNAIL_TIMESTAMP = '00:00:02';
  private readonly DEFAULT_SCREENSHOT_TIMESTAMP = '0';
  private readonly DEFAULT_SCREENSHOT_SIZE = '1920x1080';

  private readonly logger = new Logger(FfmpegService.name);
  private ffmpegInstalled = false;

  constructor(private readonly pathManager: PathManagerService) {}

  setFfmpegInstalled(installed: boolean): void {
    this.ffmpegInstalled = installed;

    if (!installed) {
      this.logger.error('FFmpeg binary path not found. Media processing will not work.');

      return;
    }

    this.logger.log('FFmpeg found. Media processing ready.');
  }

  checkFfmpegAvailability(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      throw StorageException.fileNotFound(filePath);
    }

    if (!this.ffmpegInstalled) {
      throw StorageException.failedThumbnailGeneration(new Error('FFmpeg not installed'));
    }
  }

  async generateThumbnail(filePath: string, id: string): Promise<string> {
    const thumbnailFileName = `${id}.jpg`;
    const thumbnailPath = this.pathManager.getThumbnailPath(thumbnailFileName);

    this.checkFfmpegAvailability(filePath);

    return await this.createFfmpegScreenshot(filePath, thumbnailPath, {
      folder: this.pathManager.getThumbnailDir(),
      filename: thumbnailFileName,
      timestamp: this.DEFAULT_THUMBNAIL_TIMESTAMP,
    });
  }

  async generateScreenshotAtTimestamp(
    videoPath: string,
    eventId: string,
    timestamp: number,
  ): Promise<string> {
    const screenshotFileName = `${eventId}.jpg`;
    const screenshotPath = this.pathManager.getScreenshotPath(screenshotFileName);

    this.checkFfmpegAvailability(videoPath);

    try {
      if (isNaN(timestamp) || typeof timestamp !== 'number') {
        this.logger.warn(
          `Invalid timestamp provided for event ${eventId}: ${timestamp}. Using default timestamp.`,
        );

        return this.generateScreenshot(videoPath, screenshotFileName);
      }

      const duration = await this.getVideoDuration(videoPath);

      let safeTimestamp = timestamp;

      if (timestamp <= 0) {
        this.logger.warn(
          `Timestamp for event ${eventId} is zero or negative: ${timestamp}. Using ${this.MINIMUM_TIMESTAMP_SECONDS} second.`,
        );

        safeTimestamp = this.MINIMUM_TIMESTAMP_SECONDS;
      } else if (timestamp >= duration) {
        this.logger.warn(
          `Timestamp for event ${eventId} exceeds video duration: ${timestamp}s > ${duration}s. Using ${this.MAX_DURATION_PERCENTAGE * 100}% of duration.`,
        );

        safeTimestamp = Math.max(
          duration * this.MAX_DURATION_PERCENTAGE,
          this.MINIMUM_TIMESTAMP_SECONDS,
        );
      }

      const timestampStr = safeTimestamp.toFixed(3);

      this.logger.log(
        `Generating screenshot for event ${eventId} at timestamp: ${timestampStr}s`,
      );

      return this.createFfmpegScreenshot(videoPath, screenshotPath, {
        folder: this.pathManager.getScreenshotsDir(),
        filename: screenshotFileName,
        timestamp: timestampStr,
      });
    } catch (error) {
      this.logger.error(`Failed to generate screenshot: ${error.message}`, error.stack);

      try {
        this.logger.warn(
          `Falling back to default screenshot due to error: ${error.message}`,
        );

        return await this.generateScreenshot(videoPath, screenshotFileName);
      } catch (fallbackError) {
        throw StorageException.failedThumbnailGeneration(fallbackError);
      }
    }
  }

  getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          this.logger.warn(`Could not probe video duration: ${err.message}`);

          resolve(this.DEFAULT_VIDEO_DURATION_SECONDS);

          return;
        }

        if (metadata && metadata.format && metadata.format.duration) {
          resolve(metadata.format.duration);
        } else {
          this.logger.warn('Video duration not found in metadata, using default');
          resolve(this.DEFAULT_VIDEO_DURATION_SECONDS);
        }
      });
    });
  }

  private async generateScreenshot(videoPath: string, fileName: string): Promise<string> {
    const screenshotPath = this.pathManager.getScreenshotPath(fileName);

    return await this.createFfmpegScreenshot(videoPath, screenshotPath, {
      folder: this.pathManager.getScreenshotsDir(),
      filename: fileName,
      timestamp: this.DEFAULT_SCREENSHOT_TIMESTAMP,
    });
  }

  private createFfmpegScreenshot(
    videoPath: string,
    outputPath: string,
    options: {
      folder: string;
      filename: string;
      timestamp: string | number;
      size?: string;
    },
  ): Promise<string> {
    const { folder, filename, timestamp, size = this.DEFAULT_SCREENSHOT_SIZE } = options;

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on('error', (err) => {
          this.logger.error(`Error generating image: ${err.message}`, err.stack);
          reject(err);
        })
        .on('end', () => {
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            resolve(outputPath);
          } else {
            reject(
              new Error(`Generated image at ${outputPath} is empty or doesn't exist`),
            );
          }
        })
        .screenshots({
          count: 1,
          folder,
          filename,
          size,
          timestamps: [timestamp.toString()],
        });
    });
  }
}

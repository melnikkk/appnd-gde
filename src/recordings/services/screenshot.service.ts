import { Injectable, Logger, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '../../storage/interfaces/storage-provider.interface';
import { AppBaseException } from '../../common/exceptions/base.exception';

@Injectable()
export class ScreenshotService {
  private readonly logger = new Logger(ScreenshotService.name);
  private eventScreenshotPaths: Record<string, string> = {};

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async generateScreenshotAtTimestamp(
    videoPath: string,
    eventId: string,
    relativeTimestamp: number,
  ): Promise<void> {
    try {
      await this.storageProvider.generateScreenshotAtTimestamp(
        videoPath,
        eventId,
        relativeTimestamp,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate screenshot at timestamp for event ${eventId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async saveEventScreenshot(
    eventId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    try {
      const screenshotsDir = this.getScreenshotsDir();

      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const filename = `${eventId}.jpg`;
      const screenshotPath = path.join(screenshotsDir, filename);

      fs.writeFileSync(screenshotPath, file.buffer);

      return screenshotPath;
    } catch (error) {
      this.logger.error(
        `Failed to save screenshot for event ${eventId}: ${error.message}`,
        error.stack,
      );

      throw new AppBaseException(
        `Failed to save screenshot for event ${eventId}`,
        500,
        'SAVE_SCREENSHOT_FAILED',
        { eventId, error: error.message },
      );
    }
  }

  getEventScreenshotPath(recordingId: string, eventId: string): string | null {
    const key = `${recordingId}-${eventId}`;
    const screenshotsDir = this.getScreenshotsDir();

    try {
      const files = fs
        .readdirSync(screenshotsDir)
        .filter(
          (file) => file.startsWith(`${eventId}`) || file.startsWith(`${eventId}-`),
        );

      if (files.length > 0) {
        const mostRecentFile = files.sort().pop();

        if (mostRecentFile) {
          const filePath = path.join(screenshotsDir, mostRecentFile);

          this.eventScreenshotPaths[key] = filePath;

          return filePath;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error looking for screenshot for event ${eventId}: ${error.message}`,
      );
    }

    return null;
  }

  async deleteScreenshotByEventId(eventId: string): Promise<void> {
    try {
      const screenshotsDir = this.getScreenshotsDir();

      if (!fs.existsSync(screenshotsDir)) {
        return;
      }

      const files = fs
        .readdirSync(screenshotsDir)
        .filter(file => file.startsWith(`${eventId}`) || file.startsWith(`${eventId}-`));

      for (const file of files) {
        try {
          const filePath = path.join(screenshotsDir, file);

          fs.unlinkSync(filePath);
          
          this.logger.log(`Deleted event screenshot: ${filePath}`);
        } catch (deleteError) {
          this.logger.warn(`Failed to delete screenshot ${file}: ${deleteError.message}`);
        }
      }

      Object.keys(this.eventScreenshotPaths)
        .filter(key => key.includes(eventId))
        .forEach(key => delete this.eventScreenshotPaths[key]);
    } catch (error) {
      this.logger.error(`Error deleting screenshots for event ${eventId}: ${error.message}`, error.stack);
    }
  }

  async deleteScreenshotsByRecordingId(recordingId: string): Promise<void> {
    try {
      const screenshotsDir = this.getScreenshotsDir();

      if (!fs.existsSync(screenshotsDir)) {
        return;
      }

      const eventIdsToDelete = Object.keys(this.eventScreenshotPaths)
        .filter(key => key.startsWith(`${recordingId}-`))
        .map(key => key.split('-')[1]);

      for (const eventId of eventIdsToDelete) {
        await this.deleteScreenshotByEventId(eventId);
      }

      this.logger.log(`Deleted all screenshots for recording ${recordingId}`);
    } catch (error) {
      this.logger.error(`Error deleting screenshots for recording ${recordingId}: ${error.message}`, error.stack);
    }
  }

  private getScreenshotsDir(): string {
    return path.join(process.cwd(), 'uploads', 'event-screenshots');
  }
}

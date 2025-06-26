import { Injectable, Logger, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { StorageProvider } from '../../storage/interfaces/storage-provider.interface';
import { STORAGE_PROVIDER } from '../../storage/interfaces/storage-provider.interface';
import { AppBaseException } from '../../common/exceptions/base.exception';
import { PathManagerService } from '../../storage/services/path-manager.service';

@Injectable()
export class ScreenshotsService {
  private readonly logger = new Logger(ScreenshotsService.name);
  private eventScreenshotPaths: Record<string, string> = {};

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private readonly pathManager: PathManagerService,
  ) {}

  async generateScreenshotAtTimestamp(
    videoPath: string,
    eventId: string,
    relativeTimestamp: number,
  ): Promise<void> {
    await this.storageProvider.generateScreenshotAtTimestamp(
      videoPath,
      eventId,
      relativeTimestamp,
    );
  }

  async saveEventScreenshot(eventId: string, file: Express.Multer.File): Promise<string> {
    try {
      const screenshotsDir = this.pathManager.getScreenshotsDir();

      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const filename = `${eventId}.jpg`;
      const screenshotPath = path.join(screenshotsDir, filename);

      fs.writeFileSync(screenshotPath, file.buffer);

      return screenshotPath;
    } catch (error) {
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
    const screenshotsDir = this.pathManager.getScreenshotsDir();

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
      const screenshotsDir = this.pathManager.getScreenshotsDir();

      if (!fs.existsSync(screenshotsDir)) {
        return;
      }

      const files = fs
        .readdirSync(screenshotsDir)
        .filter(
          (file) => file.startsWith(`${eventId}`) || file.startsWith(`${eventId}-`),
        );

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
        .filter((key) => key.includes(eventId))
        .forEach((key) => delete this.eventScreenshotPaths[key]);
    } catch (error) {
      this.logger.error(
        `Error deleting screenshots for event ${eventId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async deleteScreenshotsByRecordingId(recordingId: string): Promise<void> {
    try {
      const screenshotsDir = this.pathManager.getScreenshotsDir();

      if (!fs.existsSync(screenshotsDir)) {
        return;
      }

      const eventIdsToDelete = Object.keys(this.eventScreenshotPaths)
        .filter((key) => key.startsWith(`${recordingId}-`))
        .map((key) => key.split('-')[1]);

      for (const eventId of eventIdsToDelete) {
        await this.deleteScreenshotByEventId(eventId);
      }

      this.logger.log(`Deleted all screenshots for recording ${recordingId}`);
    } catch (error) {
      this.logger.error(
        `Error deleting screenshots for recording ${recordingId}: ${error.message}`,
        error.stack,
      );
    }
  }
}

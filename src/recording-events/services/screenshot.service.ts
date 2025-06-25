import { Injectable, Logger, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { StorageProvider } from '../../storage/interfaces/storage-provider.interface';
import { STORAGE_PROVIDER } from '../../storage/interfaces/storage-provider.interface';
import { AppBaseException } from '../../common/exceptions/base.exception';
import { PathManagerService } from '../../storage/services/path-manager.service';
import { PATH_MANAGER } from '../../storage/interfaces/path-manager.interface.constants';

@Injectable()
export class ScreenshotService {
  private readonly logger = new Logger(ScreenshotService.name);

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    @Inject(PATH_MANAGER)
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
      const fileExtension = path.extname(file.originalname) || '.jpg';
      const filename = `${eventId}${fileExtension}`;
      const screenshotPath = this.pathManager.getScreenshotPath(filename);
      
      await fs.promises.writeFile(screenshotPath, file.buffer);

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

  getEventScreenshotPath(eventId: string): string | null {
    try {
      const screenshotsDir = this.pathManager.getScreenshotsDir();
      
      const files = fs
        .readdirSync(screenshotsDir)
        .filter(
          (file) => file.startsWith(`${eventId}`) || file.startsWith(`${eventId}-`),
        );

      if (files.length > 0) {
        const mostRecentFile = files.sort().pop();

        if (mostRecentFile) {
          return this.pathManager.getScreenshotPath(mostRecentFile);
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
      const screenshotPath = this.getEventScreenshotPath(eventId);

      if (screenshotPath && fs.existsSync(screenshotPath)) {
        await fs.promises.unlink(screenshotPath);
      } 
    } catch (error) {
      this.logger.error(
        `Failed to delete screenshot for event ${eventId}: ${error.message}`,
        error.stack,
      );
    }
  }
}

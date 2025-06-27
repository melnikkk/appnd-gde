import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { StorageException } from '../exceptions/storage.exception';
import { PathManagerService } from './path-manager.service';
import { MediaProcessor } from '../../media/interfaces/media-processor.interface';
import { MEDIA_PROCESSOR } from '../../media/interfaces/media-processor.interface.constants';

const execAsync = promisify(exec);

@Injectable()
export class LocalStorageService implements StorageProvider {
  private readonly logger = new Logger(LocalStorageService.name);

  constructor(
    private readonly pathManager: PathManagerService,
    @Inject(forwardRef(() => MEDIA_PROCESSOR))
    private readonly mediaService: MediaProcessor,
  ) {
    this.checkFfmpegInstallation().then((installed) => {
      this.mediaService.setFfmpegInstalled(installed);
    });
  }

  async checkFfmpegInstallation(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');

      return true;
    } catch (error) {
      this.logger.error(
        'FFmpeg binary not found. Media processing will not work.',
        error,
      );

      return false;
    }
  }

  async saveFile(file: Express.Multer.File, id: string): Promise<string> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = this.pathManager.createFileName(id, fileExtension);
      const filePath = this.pathManager.getFilePath(fileName);

      await fs.promises.writeFile(filePath, file.buffer);

      return this.pathManager.getRelativeFilePath(fileName);
    } catch (error) {
      this.logger.error(`Failed to save file: ${error.message}`, error.stack);

      throw StorageException.failedToSave(error);
    }
  }

  async generateThumbnail(filePath: string, id: string): Promise<string> {
    return await this.mediaService.generateThumbnail(filePath, id);
  }

  getFilePath(key: string): string {
    return this.pathManager.getFilePath(key);
  }

  getThumbnailPath(key: string): string {
    return this.pathManager.getThumbnailPath(key);
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = this.pathManager.getFilePath(key);

      await this.safelyHandleFile(filePath, async (path) => {
        await fs.promises.unlink(path);
      });

      const thumbnailPath = this.pathManager.getThumbnailPath(key);

      await this.safelyHandleFile(thumbnailPath, async (path) => {
        await fs.promises.unlink(path);
      });
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);

      throw StorageException.failedToDelete(key, error);
    }
  }

  async generateScreenshotAtTimestamp(
    videoPath: string,
    eventId: string,
    timestamp: number,
  ): Promise<string> {
    return await this.mediaService.generateScreenshotAtTimestamp(
      videoPath,
      eventId,
      timestamp,
    );
  }

  private async safelyHandleFile(
    filePath: string,
    action: (path: string) => Promise<void>,
  ): Promise<void> {
    if (fs.existsSync(filePath)) {
      await action(filePath);
    }
  }

  async downloadFile(url: string, destPath: string): Promise<void> {
    try {
      this.logger.log(`Downloading file from ${url} to ${destPath}`);

      if (url.startsWith('/') || url.startsWith('file://')) {
        const sourcePath = url.startsWith('/') ? url : url.slice(7);

        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await fs.promises.copyFile(sourcePath, destPath);
        return;
      }

      if (url.startsWith('http://') || url.startsWith('https://')) {
        const client = url.startsWith('https://') ? https : http;

        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

        const fileStream = fs.createWriteStream(destPath);

        await new Promise<void>((resolve, reject) => {
          const request = client.get(url, (response) => {
            if (response.statusCode !== 200) {
              reject(
                new Error(
                  `Failed to download: ${response.statusCode} ${response.statusMessage}`,
                ),
              );

              return;
            }

            pipeline(response, fileStream)
              .then(() => resolve())
              .catch(reject);
          });

          request.on('error', reject);
        });

        return;
      }

      throw new Error(`Unsupported URL protocol: ${url}`);
    } catch (error) {
      this.logger.error(`Failed to download file: ${error.message}`, error.stack);
      throw StorageException.failedToSave(error);
    }
  }
}

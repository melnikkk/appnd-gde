import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PathManager } from '../interfaces/path-manager.interface';

@Injectable()
export class PathManagerService implements PathManager {
  private readonly uploadDir: string;
  private readonly thumbnailDir: string;
  private readonly screenshotsDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'recordings');
    this.thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    this.screenshotsDir = path.join(process.cwd(), 'uploads', 'event-screenshots');

    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    for (const dir of [this.uploadDir, this.thumbnailDir, this.screenshotsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private isFullKey(key: string): boolean {
    return path.extname(key) !== '';
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  getThumbnailDir(): string {
    return this.thumbnailDir;
  }

  getScreenshotsDir(): string {
    return this.screenshotsDir;
  }

  getFilePath(key: string): string {
    return path.join(this.uploadDir, key);
  }

  getRelativeFilePath(key: string): string {
    return path.join('uploads', 'recordings', key);
  }

  getThumbnailPath(key: string): string {
    const fileName = this.isFullKey(key) ? `${path.parse(key).name}.jpg` : key;

    return path.join(this.thumbnailDir, fileName);
  }

  getScreenshotPath(fileName: string): string {
    return path.join(this.screenshotsDir, fileName);
  }

  createFileName(id: string, extension: string): string {
    return `${id}${extension}`;
  }
}

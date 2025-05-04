import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { StorageProvider } from '../interfaces/storage-provider.interface';

@Injectable()
export class LocalStorageService implements StorageProvider {
  private readonly uploadDir: string;
  private readonly thumbnailDir: string;
  private readonly logger = new Logger(LocalStorageService.name);

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'recordings');
    this.thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    } else {
      this.logger.error('FFmpeg binary path not found. Thumbnail generation will not work.');
    }

    for (const dir of [this.uploadDir, this.thumbnailDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async saveFile(file: Express.Multer.File, id: string): Promise<string> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${id}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.promises.writeFile(filePath, file.buffer);

    return path.join('uploads', 'recordings', fileName);
  }

  async generateThumbnail(filePath: string, id: string): Promise<string> {
    const thumbnailFileName = `${id}.jpg`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailFileName);
    
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .on('error', (err) => {
          this.logger.error(`Error generating thumbnail: ${err.message}`);
          reject(err);
        })
        .on('end', () => {
          resolve(thumbnailPath);
        })
        .screenshots({
          count: 1,
          folder: this.thumbnailDir,
          filename: thumbnailFileName,
          size: '640x400',
          timestamps: ['00:00:02'],
        });
    });
  }

  getFilePath(key: string): string {
    return path.join(this.uploadDir, key);
  }
  
  getThumbnailPath(key: string): string {
    const fileName = `${path.parse(key).name}.jpg`;

    return path.join(this.thumbnailDir, fileName);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.getFilePath(key);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
    
    const thumbnailPath = this.getThumbnailPath(key);

    if (fs.existsSync(thumbnailPath)) {
      await fs.promises.unlink(thumbnailPath);
    }
  }
}
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
// Import using require to avoid TypeScript issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath = require('ffmpeg-static');

@Injectable()
export class LocalStorageService {
  private readonly uploadDir: string;
  private readonly thumbnailDir: string;
  private readonly logger = new Logger(LocalStorageService.name);

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'recordings');
    this.thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');

    this.logger.log(`FFmpeg path: ${ffmpegPath}`);
    
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

  async generateThumbnail(recorindgPath: string, recordingId: string): Promise<string> {
    const thumbnailFileName = `${recordingId}.jpg`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailFileName);
    
    return new Promise((resolve, reject) => {
      ffmpeg(recorindgPath)
        .on('error', (err) => {
          console.error('Error generating thumbnail:', err);
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

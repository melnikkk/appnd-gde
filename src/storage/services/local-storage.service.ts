import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { promisify } from 'util';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { StorageException } from '../exceptions/storage.exception';

const execAsync = promisify(exec);

@Injectable()
export class LocalStorageService implements StorageProvider {
  private readonly uploadDir: string;
  private readonly thumbnailDir: string;
  private readonly screenshotsDir: string;
  private readonly logger = new Logger(LocalStorageService.name);
  private ffmpegInstalled: boolean = false;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'recordings');
    this.thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    this.screenshotsDir = path.join(process.cwd(), 'uploads', 'event-screenshots');
    
    this.checkFfmpegInstallation().then((installed) => {
      this.ffmpegInstalled = installed;

      if (!installed) {
        this.logger.error('FFmpeg binary path not found. Thumbnail generation will not work.');
      } else {
        this.logger.log('FFmpeg found. Thumbnail generation ready.');
      }
    });

    for (const dir of [this.uploadDir, this.thumbnailDir, this.screenshotsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async checkFfmpegInstallation(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');

      return true;
    } catch (error) {
      return false;
    }
  }

  async saveFile(file: Express.Multer.File, id: string): Promise<string> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${id}${fileExtension}`;
      const filePath = path.join(this.uploadDir, fileName);

      await fs.promises.writeFile(filePath, file.buffer);

      return path.join('uploads', 'recordings', fileName);
    } catch (error) {
      this.logger.error(`Failed to save file: ${error.message}`, error.stack);

      throw StorageException.failedToSave(error);
    }
  }

  async generateThumbnail(filePath: string, id: string): Promise<string> {
    const thumbnailFileName = `${id}.jpg`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailFileName);
    
    if (!fs.existsSync(filePath)) {
      throw StorageException.fileNotFound(filePath);
    }

    if (!this.ffmpegInstalled) {
      throw StorageException.failedThumbnailGeneration(new Error('FFmpeg not installed'));
    }

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .on('error', (err) => {
          this.logger.error(`Error generating thumbnail: ${err.message}`, err.stack);
          reject(StorageException.failedThumbnailGeneration(err));
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
    try {
      const filePath = this.getFilePath(key);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      
      const thumbnailPath = this.getThumbnailPath(key);

      if (fs.existsSync(thumbnailPath)) {
        await fs.promises.unlink(thumbnailPath);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      
      throw StorageException.failedToDelete(key, error);
    }
  }
  
  async generateScreenshotAtTimestamp(videoPath: string, eventId: string, timestamp: number): Promise<string> {
    const screenshotFileName = `${eventId}.jpg`;
    const screenshotPath = path.join(this.screenshotsDir, screenshotFileName);
    
    if (!fs.existsSync(videoPath)) {
      throw StorageException.fileNotFound(videoPath);
    }

    if (!this.ffmpegInstalled) {
      throw StorageException.failedThumbnailGeneration(new Error('FFmpeg not installed'));
    }

    try {
      if (isNaN(timestamp) || typeof timestamp !== 'number') {
        this.logger.warn(`Invalid timestamp provided for event ${eventId}: ${timestamp}. Using default timestamp.`);
        
        return this.generateScreenshot(videoPath, screenshotFileName);
      }
      
      const duration = await this.getVideoDuration(videoPath);
      const timestampInSeconds = timestamp / 1000;
      
      this.logger.debug(`Event ${eventId} - Original timestamp: ${timestamp}ms, In seconds: ${timestampInSeconds}s, Video duration: ${duration}s`);
      
      let safeTimestamp = timestampInSeconds;
      
      if (timestampInSeconds <= 0) {
        this.logger.warn(`Timestamp for event ${eventId} is zero or negative: ${timestampInSeconds}. Using 1 second.`);
        
        safeTimestamp = 1;
      } else if (timestampInSeconds >= duration) {
        this.logger.warn(`Timestamp for event ${eventId} exceeds video duration: ${timestampInSeconds}s > ${duration}s. Using 95% of duration.`);
        
        safeTimestamp = Math.max(duration * 0.95, 1);
      }
      
     
      const timestampStr = safeTimestamp.toFixed(3);
      
      this.logger.log(`Generating screenshot for event ${eventId} at timestamp: ${timestampStr}s`);

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .on('error', (err) => {
            this.logger.error(`Error generating screenshot at timestamp: ${err.message}`, err.stack);
            
            this.logger.warn(`Falling back to default screenshot for event ${eventId}`);

            this.generateScreenshot(videoPath, screenshotFileName)
              .then(path => resolve(path))
              .catch(error => reject(StorageException.failedThumbnailGeneration(error)));
          })
          .on('end', () => {
            if (fs.existsSync(screenshotPath) && fs.statSync(screenshotPath).size > 0) {
              resolve(screenshotPath);
            } else {
              this.logger.warn(`Generated screenshot for event ${eventId} is empty, using default screenshot`);
              
              this.generateScreenshot(videoPath, screenshotFileName)
                .then(path => resolve(path))
                .catch(error => reject(StorageException.failedThumbnailGeneration(error)));
            }
          })
          .screenshots({
            count: 1,
            folder: this.screenshotsDir,
            filename: screenshotFileName,
            size: '640x400',
            timestamps: [timestampStr],
          });
      });
    } catch (error) {
      this.logger.error(`Failed to generate screenshot: ${error.message}`, error.stack);
      
      try {
        this.logger.warn(`Falling back to default screenshot due to error: ${error.message}`);
        
        return await this.generateScreenshot(videoPath, screenshotFileName);
      } catch (fallbackError) {
        throw StorageException.failedThumbnailGeneration(fallbackError);
      }
    }
  }
  
  private async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          this.logger.warn(`Could not probe video duration: ${err.message}`);

          resolve(60);
          
          return;
        }
        
        if (metadata && metadata.format && metadata.format.duration) {
          resolve(metadata.format.duration);
        } else {
          this.logger.warn('Video duration not found in metadata, using default');
          resolve(60);
        }
      });
    });
  }
  
  private async generateScreenshot(videoPath: string, fileName: string): Promise<string> {
    const screenshotPath = path.join(this.screenshotsDir, fileName);
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on('error', (err) => {
          this.logger.error(`Error generating default screenshot: ${err.message}`, err.stack);
          reject(err);
        })
        .on('end', () => {
          resolve(screenshotPath);
        })
        .screenshots({
          count: 1,
          folder: this.screenshotsDir,
          filename: fileName,
          size: '640x400',
          timestamps: ['0'],
        });
    });
  }
}
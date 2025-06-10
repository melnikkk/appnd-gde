export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  saveFile(file: Express.Multer.File, id: string): Promise<string>;

  generateThumbnail(filePath: string, id: string): Promise<string>;
  
  generateScreenshotAtTimestamp(videoPath: string, eventId: string, timestamp: number): Promise<string>;

  getFilePath(key: string): string;

  getThumbnailPath(key: string): string;

  deleteFile(key: string): Promise<void>;
  
  downloadFile(url: string, destPath: string): Promise<void>;
}
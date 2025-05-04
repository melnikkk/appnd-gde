export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  saveFile(file: Express.Multer.File, id: string): Promise<string>;

  generateThumbnail(filePath: string, id: string): Promise<string>;

  getFilePath(key: string): string;

  getThumbnailPath(key: string): string;

  deleteFile(key: string): Promise<void>;
}
export interface PathManager {
  getUploadDir(): string;
  getThumbnailDir(): string;
  getScreenshotsDir(): string;
  getFilePath(key: string): string;
  getRelativeFilePath(key: string): string;
  getThumbnailPath(key: string): string;
  getScreenshotPath(fileName: string): string;
  createFileName(id: string, extension: string): string;
}

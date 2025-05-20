export interface MediaProcessor {
  setFfmpegInstalled(installed: boolean): void;
  checkFfmpegAvailability(filePath: string): void;
  generateThumbnail(filePath: string, id: string): Promise<string>;
  generateScreenshotAtTimestamp(
    videoPath: string,
    eventId: string,
    timestamp: number,
  ): Promise<string>;
  getVideoDuration(videoPath: string): Promise<number>;
}

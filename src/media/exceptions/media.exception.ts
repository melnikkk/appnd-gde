import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class MediaException extends AppBaseException {
  static fileNotFound(filePath: string): MediaException {
    return new MediaException(
      `File not found: ${filePath}`,
      HttpStatus.NOT_FOUND,
      'FILE_NOT_FOUND',
    );
  }

  static failedThumbnailGeneration(error: Error): MediaException {
    return new MediaException(
      `Failed to generate thumbnail: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'FAILED_THUMBNAIL_GENERATION',
    );
  }

  static ffmpegNotInstalled(): MediaException {
    return new MediaException(
      'FFmpeg is not installed or not found in PATH',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'FFMPEG_NOT_INSTALLED',
    );
  }
}

import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class StorageException extends AppBaseException {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'STORAGE_ERROR',
      details
    );
  }

  static fileNotFound(path: string): StorageException {
    return new StorageException('File not found', { path });
  }

  static failedToSave(error: Error): StorageException {
    return new StorageException('Failed to save file', { 
      errorMessage: error.message 
    });
  }

  static failedThumbnailGeneration(error: Error): StorageException {
    return new StorageException('Failed to generate thumbnail', { 
      errorMessage: error.message 
    });
  }

  static failedToDelete(path: string, error: Error): StorageException {
    return new StorageException('Failed to delete file', { 
      path,
      errorMessage: error.message 
    });
  }
}
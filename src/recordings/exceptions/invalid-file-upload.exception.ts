import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';
import { ALLOWED_MIME_TYPES } from '../recordings.constants';

export class InvalidFileUploadException extends AppBaseException {
  constructor(message: string) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'INVALID_FILE_UPLOAD',
      { allowedMimeTypes: ALLOWED_MIME_TYPES }
    );
  }

  static noFile(): InvalidFileUploadException {
    return new InvalidFileUploadException('No file uploaded');
  }

  static invalidType(): InvalidFileUploadException {
    return new InvalidFileUploadException(
      `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }
}
import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class ScreenshotProcessingException extends AppBaseException {
  constructor(eventId: string, error?: Error) {
    super(
      `Failed to process screenshot for event ${eventId}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'SCREENSHOT_PROCESSING_FAILED',
      { 
        eventId,
        errorMessage: error?.message,
      },
    );
  }
}

import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class RecordingEventAddException extends AppBaseException {
  constructor(recordingId: string, error?: Error) {
    super(
      `Failed to add events to recording with ID ${recordingId}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ADD_EVENTS_FAILED',
      { 
        recordingId,
        errorMessage: error?.message,
      },
    );
  }
}

import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class RecordingEventNotFoundException extends AppBaseException {
  constructor(eventId: string) {
    super(
      `Recording event with ID ${eventId} not found`,
      HttpStatus.NOT_FOUND,
      'RECORDING_EVENT_NOT_FOUND',
    );
  }
}
import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class RecordingNotFoundException extends AppBaseException {
  constructor(recordingId: string) {
    super(
      `Recording with ID ${recordingId} not found`,
      HttpStatus.NOT_FOUND,
      'RECORDING_NOT_FOUND',
      { recordingId },
    );
  }
}

import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class RecordingNotFoundException extends AppBaseException {
  constructor(id: string) {
    super(
      `Recording with ID ${id} not found`,
      HttpStatus.NOT_FOUND,
      'RECORDING_NOT_FOUND',
    );
  }
}
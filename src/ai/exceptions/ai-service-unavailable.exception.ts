import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class AiServiceUnavailableException extends AppBaseException {
  constructor(
    message = 'AI service is currently unavailable',
    details?: Record<string, unknown>,
  ) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, 'AI_SERVICE_UNAVAILABLE', details);
  }
}

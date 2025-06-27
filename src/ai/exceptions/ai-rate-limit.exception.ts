import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class AiRateLimitException extends AppBaseException {
  constructor(
    message = 'AI service rate limit exceeded',
    details?: Record<string, unknown>,
  ) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, 'AI_RATE_LIMIT_EXCEEDED', details);
  }
}

import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class AiGenerateContentException extends AppBaseException {
  constructor(
    message = 'Failed to generate AI content',
    details?: Record<string, unknown>,
  ) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'AI_GENERATE_CONTENT_ERROR',
      details,
    );
  }
}

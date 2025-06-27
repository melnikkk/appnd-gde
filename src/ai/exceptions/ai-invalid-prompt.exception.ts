import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class AiInvalidPromptException extends AppBaseException {
  constructor(
    message = 'Invalid or malformed AI prompt',
    details?: Record<string, unknown>,
  ) {
    super(message, HttpStatus.BAD_REQUEST, 'AI_INVALID_PROMPT', details);
  }
}

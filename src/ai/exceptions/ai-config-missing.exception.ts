import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '../../common/exceptions/base.exception';

export class AiConfigMissingException extends AppBaseException {
  constructor(
    configName = 'API key',
    message = 'Required AI configuration is missing',
    details?: Record<string, unknown>,
  ) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'AI_CONFIG_MISSING', {
      configName,
      ...details,
    });
  }
}

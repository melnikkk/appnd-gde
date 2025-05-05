import { HttpException, HttpStatus } from '@nestjs/common';

export class AppBaseException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    public readonly code: string,
    public readonly details?: Record<string, any>,
  ) {
    super(
      {
        statusCode,
        message,
        code,
        timestamp: new Date().toISOString(),
        details,
      },
      statusCode,
    );
  }
}
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppBaseException } from '../exceptions/base.exception';

interface ErrorResponse {
  statusCode: number;
  message: string;
  code: string;
  timestamp: string;
  path: string;
  method: string;
  details?: Record<string, any>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = this.getStatusCode(exception);
    const message = this.getErrorMessage(exception);
    const code = this.getErrorCode(exception);
    const details = this.getErrorDetails(exception);

    this.logger.error(
      `${request.method} ${request.url} - Status: ${status}, Message: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorResponse: ErrorResponse = {
      message,
      code,
      details,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    response.status(status).json(errorResponse);
  }

  private getStatusCode(exception: Error): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorMessage(exception: Error): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'object' && 'message' in response) {
        return response.message as string;
      }

      return String(response);
    }

    return exception.message || 'Internal server error';
  }

  private getErrorCode(exception: Error): string {
    if (exception instanceof AppBaseException) {
      return exception.code;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      return this.mapHttpStatusToCode(status);
    }

    return 'INTERNAL_SERVER_ERROR';
  }

  private getErrorDetails(exception: Error): Record<string, any> | undefined {
    if (exception instanceof AppBaseException) {
      return exception.details;
    }
    
    return undefined;
  }

  private mapHttpStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}

import { Request, Response } from 'express';
import {
  Catch,
  HttpStatus,
  Logger,
  ArgumentsHost,
  ExceptionFilter,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

interface ValidationErrorResponse {
  statusCode: number;
  message: string;
  code: string;
  timestamp: string;
  path: string;
  method: string;
  details: {
    validationErrors: Record<string, string[]>;
  };
}

@Catch()
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (
      exception?.response?.statusCode === HttpStatus.BAD_REQUEST &&
      Array.isArray(exception?.response?.message)
    ) {
      const validationErrors = this.formatValidationErrors(exception.response.message);

      this.logger.error(
        `Validation failed for ${request.method} ${request.url}`,
        JSON.stringify(validationErrors),
      );

      const errorResponse: ValidationErrorResponse = {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        details: {
          validationErrors,
        },
      };

      response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
    } else {
      throw exception;
    }
  }

  private formatValidationErrors(
    errors: Array<ValidationError> | Array<string>,
  ): Record<string, Array<string>> {
    const result: Record<string, Array<string>> = {};

    if (!errors?.length) {
      return result;
    }

    if (typeof errors[0] === 'string') {
      result['_global'] = errors as Array<string>;

      return result;
    }

    const validationErrors = errors as Array<ValidationError>;

    validationErrors.forEach((error) => {
      const property = error.property;
      const constraints = error.constraints ? Object.values(error.constraints) : [];

      if (constraints.length) {
        result[property] = constraints;
      }

      if (error.children?.length) {
        const nestedErrors = this.formatValidationErrors(error.children);

        Object.entries(nestedErrors).forEach(([nestedProp, messages]) => {
          const fullPath = `${property}.${nestedProp}`;
          
          result[fullPath] = messages;
        });
      }
    });

    return result;
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Request, Response } from 'express';

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

    // Check if this is a validation exception
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
      // Pass to the next filter if it's not a validation error
      throw exception;
    }
  }

  private formatValidationErrors(
    errors: ValidationError[] | string[],
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    if (!errors?.length) {
      return result;
    }

    // Handle simple string array error messages
    if (typeof errors[0] === 'string') {
      result['_global'] = errors as string[];
      return result;
    }

    // Handle validation errors from class-validator
    const validationErrors = errors as ValidationError[];
    validationErrors.forEach((error) => {
      const property = error.property;
      const constraints = error.constraints ? Object.values(error.constraints) : [];
      
      if (constraints.length) {
        result[property] = constraints;
      }

      // Handle nested validation errors
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
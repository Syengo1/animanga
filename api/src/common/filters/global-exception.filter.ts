import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { AuthenticatedRequest } from '../interfaces/request.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const requestId = request.requestId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorPayload: Record<string, unknown> = {
      message: 'Internal Server Error',
    };

    // 1. Handle explicit HTTP Exceptions (including those thrown by NestJS internals)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // FIX: Strict type-checking to satisfy ESLint's no-base-to-string rule
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        errorPayload = exceptionResponse as Record<string, unknown>;
      } else if (typeof exceptionResponse === 'string') {
        errorPayload = { message: exceptionResponse };
      } else {
        errorPayload = { message: 'HTTP Exception' };
      }
    }
    // 2. Handle raw Zod Errors
    else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      errorPayload = {
        message: 'Validation failed',
        errors: exception.issues.map((issue: ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      };
    }
    // 3. Unhandled Server Errors
    else {
      const err = exception as Error;
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${err?.message || 'Unknown Error'}`,
        err?.stack,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code: status,
        path: request.url,
        ...errorPayload,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * API error body (troott-api error.mdw shape).
 */
export interface ErrorResponseBody {
  error: true;
  message: string;
  errors?: string[];
  data: Record<string, unknown>;
  status: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as Request & { requestId?: string }).requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let errors: string[] = [];
    const data: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) ?? message;
        if (Array.isArray(obj.message)) {
          errors = obj.message as string[];
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      const code = (exception as unknown as { code?: string }).code;
      if (code === '23505') {
        message = 'Duplicate field value entered';
        errors = [exception.message];
      } else if (code === '22P02' || (exception as unknown as { name?: string }).name === 'QueryFailedError') {
        message = 'Invalid input or resource not found';
        errors = [exception.message];
      } else {
        message = exception.message;
        errors = [exception.message];
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `${exception.message} ${requestId ? `[${requestId}]` : ''}`,
          exception.stack,
        );
      }
    }

    if (status >= 500) {
      this.logger.error(
        `[${requestId ?? 'no-request-id'}] ${status} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorResponseBody = {
      error: true,
      message,
      ...(errors.length > 0 && { errors }),
      data,
      status,
    };

    response.status(status).json(body);
  }
}

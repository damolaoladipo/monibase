import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponseBody {
  error: true;
  message: string;
  code: number;
  errors?: string[];
  data?: Record<string, unknown>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as Request & { requestId?: string }).requestId;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
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
    } else if (exception instanceof Error) {
      message = exception.message;
      if (process.env.NODE_ENV !== 'production') {
        this.logger.error(
          `${exception.message} ${requestId ? `[${requestId}]` : ''}`,
          exception.stack,
        );
      }
    }

    const body: ErrorResponseBody = {
      error: true,
      message,
      code: status,
      ...(errors && errors.length > 0 ? { errors } : {}),
    };

    if (status >= 500) {
      this.logger.error(
        `[${requestId ?? 'no-request-id'}] ${status} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(body);
  }
}

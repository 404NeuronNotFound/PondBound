import { Catch, HttpException, Inject, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { STATUS_CODES } from 'node:http';
import type { ApiErrorResponse } from '@pondbound/shared';
import { ErrorReportingService } from '../../observability/error-reporting.service.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter, OnApplicationBootstrap {
  constructor(
    @Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost,
    @Inject(ErrorReportingService) private readonly reporting: ErrorReportingService,
  ) {}

  onApplicationBootstrap() {
    // Nest scopes its default 404 handler to the API prefix. Add a final fallback
    // after route registration so paths outside that prefix also receive JSON.
    this.adapterHost.httpAdapter.setNotFoundHandler(
      (request: RequestContext, response: unknown) => {
        this.reply(new NotFoundException(), request, response);
      },
    );
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    this.reply(exception, context.getRequest<RequestContext>(), context.getResponse());
  }

  private reply(exception: unknown, request: RequestContext, response: unknown) {
    const tooLarge =
      typeof exception === 'object' &&
      exception !== null &&
      'type' in exception &&
      exception.type === 'entity.too.large' &&
      'status' in exception &&
      exception.status === 413;
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : tooLarge ? 413 : 500;
    const error = STATUS_CODES[statusCode] ?? 'Internal Server Error';
    let message: string | string[] = error;

    // Only intentional client errors may expose their messages; all 5xx messages are generic.
    if (exception instanceof HttpException && statusCode < 500 && statusCode !== 404) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') message = payload;
      else if ('message' in payload) {
        const candidate: unknown = payload.message;
        if (
          typeof candidate === 'string' ||
          (Array.isArray(candidate) && candidate.every((value) => typeof value === 'string'))
        )
          message = candidate;
      }
    }

    const path = (request.originalUrl ?? request.url).split('?')[0] ?? '/';
    if (statusCode >= 500) {
      this.reporting.capture(exception, request, statusCode);
    }
    const body: ApiErrorResponse = {
      statusCode,
      error,
      message,
      path,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    };
    this.adapterHost.httpAdapter.reply(response, body, statusCode);
  }
}

type RequestContext = {
  url: string;
  originalUrl?: string;
  method: string;
  requestId?: string;
  route?: { path?: unknown };
};

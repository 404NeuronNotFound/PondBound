import { HttpException, Inject, Injectable } from '@nestjs/common';
import { JsonLogger, safeRequestMetadata } from './json-logger.js';
import type { RequestMetadata } from './json-logger.js';

export const ERROR_REPORTER = Symbol('ERROR_REPORTER');
export type ErrorReport = Readonly<
  ReturnType<typeof safeRequestMetadata> & {
    timestamp: string;
    statusCode: number;
    errorKind: 'http_5xx' | 'unexpected_exception';
  }
>;
export interface ErrorReporter {
  capture(report: ErrorReport): void | Promise<void>;
}

@Injectable()
export class LoggingErrorReporter implements ErrorReporter {
  constructor(@Inject(JsonLogger) private readonly logger: JsonLogger) {}
  capture(report: ErrorReport) {
    this.logger.error({ event: 'error.reported', ...report });
  }
}

@Injectable()
export class ErrorReportingService {
  private pending = 0;
  constructor(
    @Inject(ERROR_REPORTER) private readonly reporter: ErrorReporter,
    @Inject(JsonLogger) private readonly logger: JsonLogger,
  ) {}
  capture(exception: unknown, request: RequestMetadata, statusCode: number) {
    if (this.pending >= 32) {
      this.logger.warn({ event: 'reporting.overloaded', requestId: request.requestId });
      return;
    }
    const report: ErrorReport = Object.freeze({
      ...safeRequestMetadata(request),
      timestamp: new Date().toISOString(),
      statusCode,
      errorKind: exception instanceof HttpException ? 'http_5xx' : 'unexpected_exception',
    });
    this.pending++;
    try {
      void Promise.resolve(this.reporter.capture(report))
        .catch(() => {
          this.logger.warn({ event: 'reporting.failed', requestId: request.requestId });
        })
        .finally(() => {
          this.pending--;
        });
    } catch {
      this.pending--;
      this.logger.warn({ event: 'reporting.failed', requestId: request.requestId });
    }
  }
}

import { Global, Module } from '@nestjs/common';
import { JsonLogger } from './json-logger.js';
import {
  ERROR_REPORTER,
  ErrorReportingService,
  LoggingErrorReporter,
} from './error-reporting.service.js';
import { RequestTelemetry } from './request-telemetry.service.js';

@Global()
@Module({
  providers: [
    { provide: JsonLogger, useFactory: () => new JsonLogger() },
    LoggingErrorReporter,
    { provide: ERROR_REPORTER, useExisting: LoggingErrorReporter },
    ErrorReportingService,
    RequestTelemetry,
  ],
  exports: [JsonLogger, ErrorReportingService, RequestTelemetry, ERROR_REPORTER],
})
export class ObservabilityModule {}

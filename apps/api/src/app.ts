import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { environment } from './config/environment.js';
import { createCorsOptions } from './config/cors.js';
import type { ExpressAdapter } from '@nestjs/platform-express';
import helmet from 'helmet';
import { JsonLogger } from './observability/json-logger.js';
import { RequestTelemetry } from './observability/request-telemetry.service.js';
import { RateLimits } from './security/rate-limits.service.js';

export function configureApp(app: INestApplication) {
  const adapter = app.getHttpAdapter() as ExpressAdapter;
  adapter
    .getInstance()
    .set(
      'trust proxy',
      environment.TRUSTED_PROXY_CIDRS.length ? environment.TRUSTED_PROXY_CIDRS : false,
    );
  app.use(app.get(RequestTelemetry).handle);
  app.use(
    helmet({ strictTransportSecurity: environment.NODE_ENV === 'production' ? undefined : false }),
  );
  // Probes remain stable across API versions. Keep the original frontend URLs as aliases.
  app.setGlobalPrefix('api', { exclude: ['health', 'ready', 'api/health', 'api/health/ready'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors(createCorsOptions(environment.WEB_ORIGIN));
  app.use(app.get(RateLimits).api);
  adapter.useBodyParser('json', false, { limit: '16kb' });
  adapter.useBodyParser('urlencoded', false, { limit: '16kb', extended: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );
  app.enableShutdownHooks();
  return app;
}

export async function createApp() {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(),
    abortOnError: false,
  });
  app.useLogger(app.get(JsonLogger));
  return configureApp(app);
}

import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { environment } from './config/environment.js';

export function configureApp(app: INestApplication) {
  // Probes remain stable across API versions. Keep the original frontend URLs as aliases.
  app.setGlobalPrefix('api', { exclude: ['health', 'ready', 'api/health', 'api/health/ready'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors({ origin: environment.WEB_ORIGIN });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true,
    transform: true, validationError: { target: false, value: false },
  }));
  app.enableShutdownHooks();
  return app;
}

export async function createApp() {
  return configureApp(await NestFactory.create(AppModule));
}

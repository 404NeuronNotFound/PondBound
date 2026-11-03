import { ForbiddenException } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

export function createCorsOptions(origins: readonly string[]): CorsOptions {
  const allowed = new Set(origins);
  return {
    origin: (origin, callback) => {
      if (!origin || allowed.has(origin)) callback(null, true);
      else callback(new ForbiddenException('Origin is not allowed'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
    credentials: false,
    maxAge: 600,
  };
}

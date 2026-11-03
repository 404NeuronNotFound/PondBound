import { Global, HttpException, Injectable, Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { MemoryStore, rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { environment } from '../config/environment.js';

const probes = new Set(['/health', '/ready', '/api/health', '/api/health/ready']);

@Injectable()
export class RateLimits implements OnModuleDestroy {
  private readonly apiStore = new MemoryStore();
  private readonly authStore = new MemoryStore();
  private create(scope: 'api' | 'auth', limit: number, store: MemoryStore) {
    return rateLimit({
      windowMs: environment.RATE_LIMIT_WINDOW_MS,
      limit,
      store,
      identifier: scope,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      requestPropertyName: `${scope}RateLimit`,
      // Untrusted forwarding headers are intentionally ignored by Express. CIDR trust is explicit.
      validate: { xForwardedForHeader: false, forwardedHeader: false },
      skip: (request) =>
        scope === 'api' &&
        (request.method === 'OPTIONS' ||
          probes.has(request.path.toLowerCase().replace(/\/+$/, '') || '/')),
      handler: (_request, _response, next) =>
        next(new HttpException('Too many requests. Try again later.', 429)),
    });
  }
  readonly api = this.create('api', environment.API_RATE_LIMIT, this.apiStore);
  private readonly auth = this.create('auth', environment.AUTH_RATE_LIMIT, this.authStore);

  async checkAuth(request: Request, response: Response) {
    await new Promise<void>((resolve, reject) => {
      void this.auth(request, response, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  onModuleDestroy() {
    this.apiStore.shutdown();
    this.authStore.shutdown();
  }
}

@Global()
@Module({ providers: [RateLimits], exports: [RateLimits] })
export class SecurityModule {}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AUTH_CLIENT, createAuthClient } from './auth-client.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';

@Module({ providers: [
  { provide: AUTH_CLIENT, useFactory: createAuthClient },
  AuthService,
  { provide: APP_GUARD, useClass: AuthGuard },
] })
export class AuthModule {}

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { VerifiedIdentity } from '@pondbound/shared';
import { AuthService } from './auth.service.js';
import { PUBLIC_ROUTE } from './public.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const match =
      typeof header === 'string' && header.length <= 8192
        ? /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header)
        : null;
    if (!match?.[1]) throw new UnauthorizedException('A Bearer access token is required');
    request.identity = await this.auth.verify(match[1]);
    return true;
  }
}

export type AuthenticatedRequest = {
  headers: { authorization?: string | string[] };
  identity: VerifiedIdentity;
};

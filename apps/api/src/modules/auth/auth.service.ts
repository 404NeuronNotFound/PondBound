import { Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifiedIdentitySchema } from '@pondbound/shared';
import type { VerifiedIdentity } from '@pondbound/shared';
import { AUTH_CLIENT } from './auth-client.js';

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_CLIENT) private readonly client: SupabaseClient | null) {}

  async verify(token: string): Promise<VerifiedIdentity> {
    if (!this.client) throw new ServiceUnavailableException('Authentication is not configured');
    try {
      // Verify with this project's Auth server. Never authorize from decoded claims,
      // browser user metadata, or a locally stored Supabase session.
      const { data, error } = await this.client.auth.getUser(token);
      if (error) {
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw new UnauthorizedException('Invalid or expired access token');
        }
        throw new ServiceUnavailableException('Authentication is temporarily unavailable');
      }
      if (!data.user) throw new UnauthorizedException('Invalid or expired access token');
      const identity = verifiedIdentitySchema.safeParse({ id: data.user.id });
      if (!identity.success) throw new ServiceUnavailableException('Authentication returned an invalid identity');
      return identity.data;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Authentication is temporarily unavailable');
    }
  }
}

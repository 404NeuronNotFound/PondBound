import { BadRequestException, Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import type { VerifiedIdentity } from '@pondbound/shared';
import { CurrentIdentity } from '../auth/current-identity.decorator.js';
import { PlayersService } from './players.service.js';

@Controller('players')
export class PlayersController {
  constructor(@Inject(PlayersService) private readonly players: PlayersService) {}

  @Post('me')
  @HttpCode(200)
  initialize(@CurrentIdentity() identity: VerifiedIdentity, @Body() body: unknown) {
    if (
      body !== undefined &&
      (body === null ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).length > 0)
    ) {
      throw new BadRequestException('Profile initialization accepts no fields');
    }
    return this.players.initialize(identity.id);
  }

  @Get('me')
  current(@CurrentIdentity() identity: VerifiedIdentity) {
    return this.players.current(identity.id);
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PlayerProfileResponse } from '@pondbound/shared';
import { DatabaseService } from '../../database/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { Player } from '../../generated/prisma/client.js';

@Injectable()
export class PlayersService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async initialize(authId: string): Promise<PlayerProfileResponse> {
    let player: Player;
    try {
      // Keep creation compatible while the new database defaults are rolled out.
      // After migration, the database trigger owns both timestamps.
      const now = new Date();
      player = await this.database.prisma.player.upsert({
        where: { authId },
        create: { id: randomUUID(), authId, createdAt: now, updatedAt: now },
        update: {},
      });
    } catch (error) {
      // Prisma may perform an empty-update upsert as a read/create pair. The
      // unique authId constraint selects the winner of concurrent first logins.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
        throw error;
      const existing = await this.database.prisma.player.findUnique({ where: { authId } });
      if (!existing) throw error;
      player = existing;
    }
    return {
      player: {
        ...player,
        createdAt: player.createdAt.toISOString(),
        updatedAt: player.updatedAt.toISOString(),
      },
    };
  }

  async current(authId: string): Promise<PlayerProfileResponse> {
    const player = await this.database.prisma.player.findUnique({ where: { authId } });
    if (!player) throw new NotFoundException('Player profile has not been initialized');
    return {
      player: {
        ...player,
        createdAt: player.createdAt.toISOString(),
        updatedAt: player.updatedAt.toISOString(),
      },
    };
  }
}

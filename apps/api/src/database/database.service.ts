import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { environment } from '../config/environment.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly client = environment.DATABASE_URL ? new PrismaClient({
    adapter: new PrismaPg({ connectionString: environment.DATABASE_URL, connectionTimeoutMillis: 3000, max: 5 }),
  }) : null;

  async readiness(): Promise<'connected' | 'unconfigured' | 'unavailable'> {
    if (!this.client) return 'unconfigured';
    try {
      await this.client.$queryRaw`SELECT 1`;
      return 'connected';
    } catch {
      this.logger.warn('Database readiness check failed. Check server connection settings.');
      return 'unavailable';
    }
  }
  async onModuleDestroy() { await this.client?.$disconnect(); }
}

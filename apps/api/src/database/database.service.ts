import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { environment } from '../config/environment.js';
import { Pool } from 'pg';
import { createPoolConfig } from './pool-config.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool = environment.DATABASE_URL ? new Pool(createPoolConfig(environment)) : null;
  private readonly client = this.pool ? new PrismaClient({ adapter: new PrismaPg(this.pool, { schema: 'game' }) }) : null;

  constructor() {
    this.pool?.on('error', () => this.logger.warn('An idle database connection failed.'));
  }

  get prisma(): PrismaClient {
    if (!this.client) throw new ServiceUnavailableException('Database is not configured');
    return this.client;
  }

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
  async onModuleDestroy() {
    try { await this.client?.$disconnect(); }
    finally { await this.pool?.end(); }
  }
}

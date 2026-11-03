import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@pondbound/contracts';
import { DatabaseService } from '../database/database.service.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Get()
  live(): HealthResponse { return { status: 'ok', service: 'pondbound-api' }; }

  @Get('ready')
  async ready() {
    const database = await this.database.readiness();
    if (database !== 'connected') throw new ServiceUnavailableException({ status: 'not_ready', database });
    return { status: 'ok', database };
  }
}

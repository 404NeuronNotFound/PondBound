import { Controller, Get, Inject, Res, VERSION_NEUTRAL } from '@nestjs/common';
import type { HealthResponse, ReadinessResponse } from '@pondbound/shared';
import type { Response } from 'express';
import { DatabaseService } from '../database/database.service.js';

@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Get(['health', 'api/health'])
  live(): HealthResponse { return { status: 'ok', service: 'pondbound-api' }; }

  @Get(['ready', 'api/health/ready'])
  async ready(@Res({ passthrough: true }) response: Response): Promise<ReadinessResponse> {
    const database = await this.database.readiness();
    // A readiness result is an operational state, including when it is not ready.
    response.status(database === 'connected' ? 200 : 503);
    return database === 'connected' ? { status: 'ok', database } : { status: 'not_ready', database };
  }
}

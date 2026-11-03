import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthModule } from './health/health.module.js';
import { ApiController } from './api.controller.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PlayersModule } from './modules/players/players.module.js';

@Module({
  imports: [AuthModule, HealthModule, PlayersModule],
  controllers: [ApiController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}

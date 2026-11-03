import { Module } from '@nestjs/common';
import { DatabaseService } from './database/database.service.js';
import { HealthController } from './health/health.controller.js';

@Module({ controllers: [HealthController], providers: [DatabaseService] })
export class AppModule {}

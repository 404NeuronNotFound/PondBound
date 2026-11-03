import { Controller, Get } from '@nestjs/common';
import type { ApiInfoResponse } from '@pondbound/shared';

@Controller({ version: '1' })
export class ApiController {
  @Get()
  info(): ApiInfoResponse {
    return { service: 'pondbound-api', apiVersion: '1' };
  }
}

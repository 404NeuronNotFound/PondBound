import type { INestApplication } from '@nestjs/common';
import { JsonLogger } from './observability/json-logger.js';
import { installFatalHandlers } from './observability/process-guards.js';

installFatalHandlers();
let app: INestApplication | undefined;
try {
  await import('./config/load-environment.js');
  const { createApp } = await import('./app.js');
  const { environment } = await import('./config/environment.js');
  app = await createApp();
  await app.listen(environment.PORT, environment.HOST);
} catch (error) {
  const message =
    error instanceof Error &&
    /^Invalid (API environment|NODE_ENV) configuration: [A-Za-z_, ]+$/.test(error.message)
      ? error.message
      : 'Server startup failed; check mode, configuration, port and dependency readiness';
  new JsonLogger().fatal({
    event: 'startup.failed',
    errorKind: 'configuration_or_bootstrap',
    message,
  });
  await app?.close();
  process.exitCode = 1;
}

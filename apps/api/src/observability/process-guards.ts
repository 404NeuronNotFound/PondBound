import { writeSync } from 'node:fs';
import { JsonLogger } from './json-logger.js';

export function installFatalHandlers() {
  const logger = new JsonLogger((line) => {
    writeSync(2, line + '\n');
  });
  const fail = (errorKind: 'uncaught_exception' | 'unhandled_rejection') => {
    logger.fatal({ event: 'process.failed', errorKind });
    // Never continue serving after an unhandled failure or print its raw payload.
    process.exit(1);
  };
  process.once('uncaughtException', () => fail('uncaught_exception'));
  process.once('unhandledRejection', () => fail('unhandled_rejection'));
}

import { AsyncLocalStorage } from 'node:async_hooks';
import type { LoggerService } from '@nestjs/common';

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();
type Level = 'info' | 'warn' | 'error' | 'debug' | 'fatal';
export type RequestMetadata = { method: string; route?: { path?: unknown }; requestId?: string };

export function safeRequestMetadata(request: RequestMetadata) {
  return {
    method: /^[A-Z]{1,16}$/.test(request.method) ? request.method : 'OTHER',
    route: typeof request.route?.path === 'string' ? request.route.path : 'unmatched',
    requestId: request.requestId,
  };
}

const operationalMessages = new Set([
  'Starting Nest application...',
  'Nest application successfully started',
  'An idle database connection failed.',
  'Database readiness check failed. Check server connection settings.',
  'Server startup failed; check mode, configuration, port and dependency readiness',
]);
const configurationFields = new Set([
  'configuration',
  'NODE_ENV',
  'HOST',
  'PORT',
  'WEB_ORIGIN',
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'DB_POOL_MAX',
  'DB_CONNECTION_TIMEOUT_MS',
  'DB_QUERY_TIMEOUT_MS',
  'DB_IDLE_TIMEOUT_MS',
  'DB_SSL_CA_FILE',
  'API_RATE_LIMIT',
  'AUTH_RATE_LIMIT',
  'RATE_LIMIT_WINDOW_MS',
  'TRUSTED_PROXY_CIDRS',
]);

function safeMessage(value: string) {
  if (operationalMessages.has(value)) return value;
  const match = /^Invalid (API environment|NODE_ENV) configuration: ([A-Za-z0-9_, ]+)$/.exec(value);
  if (match?.[2] && match[2].split(', ').every((field) => configurationFields.has(field)))
    return value;
  // Framework or application free text can embed secrets without a recognizable key.
  return '[redacted]';
}

function safeText(value: string) {
  if (/bearer\s|postgres(?:ql)?:\/\/|sb_secret_|(?:password|secret|token)\s*[=:]/i.test(value))
    return '[redacted]';
  return value.replace(/\p{Cc}/gu, ' ').slice(0, 512);
}

// One JSON record per line. Arbitrary objects/errors/extra arguments are never serialized.
export class JsonLogger implements LoggerService {
  constructor(
    private readonly writeLine: (line: string) => void = (line) => {
      process.stdout.write(line + '\n');
    },
  ) {}

  log(message: unknown) {
    this.emit('info', message);
  }
  warn(message: unknown) {
    this.emit('warn', message);
  }
  error(message: unknown) {
    this.emit('error', message);
  }
  debug(message: unknown) {
    this.emit('debug', message);
  }
  verbose(message: unknown) {
    this.emit('debug', message);
  }
  fatal(message: unknown) {
    this.emit('fatal', message);
  }

  private emit(level: Level, input: unknown) {
    const value: Record<string, unknown> =
      typeof input === 'object' && input !== null && !(input instanceof Error)
        ? (input as Record<string, unknown>)
        : {};
    const record: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service: 'pondbound-api',
      event: 'application.message',
    };
    if (typeof value.event === 'string' && /^[a-z][a-z0-9_.]{0,63}$/.test(value.event))
      record.event = value.event;
    const message = typeof input === 'string' ? input : value.message;
    if (typeof message === 'string') record.message = safeMessage(message);
    for (const key of ['method', 'route', 'errorKind', 'outcome'] as const) {
      if (typeof value[key] === 'string') record[key] = safeText(value[key]);
    }
    for (const key of ['statusCode', 'durationMs'] as const) {
      if (typeof value[key] === 'number' && Number.isFinite(value[key])) record[key] = value[key];
    }
    const requestId = value.requestId ?? requestContext.getStore()?.requestId;
    if (
      typeof requestId === 'string' &&
      /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId)
    )
      record.requestId = requestId;
    try {
      this.writeLine(JSON.stringify(record));
    } catch {
      /* Logging failure must not change request behavior. */
    }
  }
}

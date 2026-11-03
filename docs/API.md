# API foundation

Base URL in development: `http://localhost:3000`. Start both apps with `pnpm dev` from the repository root.

## Endpoints

| Method | Path                | Behavior                                                                              |
| ------ | ------------------- | ------------------------------------------------------------------------------------- |
| GET    | `/health`           | API liveness; HTTP 200 while the process can serve requests                           |
| GET    | `/ready`            | Database readiness; HTTP 200 after a successful Prisma `SELECT 1`, otherwise HTTP 503 |
| GET    | `/api/v1`           | Versioned API identity: `service` and `apiVersion`                                    |
| GET    | `/api/health`       | Compatibility alias for `/health`, used by the frontend proxy                         |
| GET    | `/api/health/ready` | Compatibility alias for `/ready`                                                      |

Application routes use URI versioning: `/api/v1/...`. New controllers inherit version 1 unless they declare a version explicitly. Unsupported or missing versions return HTTP 404. Health probes are version-neutral and stay outside the versioned namespace.

```sh
curl http://localhost:3000/health
curl -i http://localhost:3000/ready
curl http://localhost:3000/api/v1
```

Liveness returns `{"status":"ok","service":"pondbound-api"}`. Readiness returns `{"status":"ok","database":"connected"}` or `{"status":"not_ready","database":"unconfigured"}` / `{"status":"not_ready","database":"unavailable"}`. These probe responses describe operational state, so HTTP 503 readiness responses keep the same probe shape rather than using the exception envelope. No database URL or driver error is returned.

An unconfigured database does not stop local API or frontend development. Readiness currently checks PostgreSQL only; it does not certify Auth, Storage, or Realtime availability.

## Modules and request handling

`AppModule` composes Auth, Player and health modules plus the API identity controller. Player/health modules share `DatabaseModule`, which owns and exports `DatabaseService`. Feature modules belong under `src/modules` and must be registered explicitly. `configureApp` is shared by the real server and HTTP test applications.

Global validation uses DTO classes with class-validator decorators. It transforms plain request bodies into DTO instances, rejects undeclared properties, and rejects unknown values. It does not enable implicit scalar coercion; add explicit conversion decorators or parameter pipes when needed. Validation responses exclude DTO targets and submitted values.

The global exception filter returns this JSON shape for HTTP exceptions, invalid bodies, unknown routes and unexpected failures:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["name must be a string"],
  "path": "/api/v1/example",
  "timestamp": "2026-11-03T00:00:00.000Z"
}
```

Intentional client errors retain their message or validation messages. Server exceptions return a generic HTTP reason phrase and never expose the exception message, stack, or arbitrary response properties. Unknown-route messages are generic, and error paths omit query strings. A final adapter fallback handles unknown paths outside the global `/api` prefix with the same format.

The shared package defines runtime schemas and TypeScript types for liveness, readiness, API identity, Player profiles and exception responses. Gameplay endpoints are implemented in later phases.

## Authentication and identity

Application routes require `Authorization: Bearer <Supabase access token>` by default. Public probes and API identity are explicitly excluded. `POST /api/v1/players/me` accepts `{}` and initializes/reuses only the verified caller's Player; `GET /api/v1/players/me` reads it. Missing/invalid tokens return 401, unavailable Auth returns 503, and missing profiles return 404. Initialization rejects identity, role or other body fields with 400. See [authentication](AUTHENTICATION.md) for the full contract and live verification command.

## Verification

Run `pnpm test` from the root to build shared dependencies and execute frontend and backend tests. Backend HTTP tests register DTO/error/version fixture controllers only in their test module. Those routes are absent from the production application.

Readiness HTTP tests cover unconfigured, unavailable and connected states through a substituted provider. The ordinary app test checks real unconfigured behavior. These tests do not establish a live Supabase database connection.

00.04 additionally verified real readiness against isolated PostgreSQL and the configured Supabase project. The live development API now reports `database: connected`. Credentials and infrastructure checks are documented in the [Supabase guide](../deployment/supabase/README.md).

Implementation references: [NestJS versioning](https://docs.nestjs.com/techniques/versioning), [validation](https://docs.nestjs.com/techniques/validation), and [exception filters](https://docs.nestjs.com/exception-filters).

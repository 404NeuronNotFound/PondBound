# Architecture

## Responsibilities

React owns the application interface. Phaser 3 owns the canvas and future world presentation. React mounts and destroys one Phaser instance with its game viewport. The foundation scene contains text only; world assets and movement start in Phase 1.

NestJS owns gameplay decisions and validates request DTOs through a global validation pipe. The foundation only exposes health routes. There are no fish, currency, trading, enhancement, or authentication endpoints yet.

Prisma connects NestJS to PostgreSQL using the PostgreSQL driver adapter. Supabase will host PostgreSQL, Auth, Storage and selected Realtime services. The optional public Supabase client is prepared in the browser; authentication and realtime behavior are deferred to their relevant phases.

## Boundaries

- `apps/web/src/features` contains domain UI; `components`, `hooks`, `lib`, `stores`, and `styles` hold shared concerns.
- `apps/web/src/game` contains Phaser scenes and engine lifecycle code.
- `apps/api/src/modules` reserves feature modules; `config`, `database`, `health`, and `common` hold server infrastructure.
- `packages/shared` contains runtime API schemas and inferred types, avoiding duplicate type packages.
- `packages/game-config` currently contains presentation settings only. Never put secrets or authoritative hidden probabilities in a browser-imported package.
- `packages/typescript-config` holds compiler defaults; lint rules live at the root until multiple distinct configurations are needed.

The initial private database schema reserves player identity only. It has no Gold or gameplay inventory fields. Introduce economic models and transactional operations in the corresponding phases.

## Health and credentials

`GET /api/health` reports API liveness. `GET /api/health/ready` executes `SELECT 1` through Prisma and reports database readiness separately. An unconfigured database does not prevent frontend and server development.

Database credentials belong only to the API. Browser variables must use public Supabase credentials. No service-role key is included. CORS is restricted to configured frontend origins. Bind the API appropriately behind a trusted reverse proxy before deployment.

## References

- [NestJS fundamentals](https://docs.nestjs.com/first-steps)
- [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite)
- [Prisma configuration](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
- [Supabase and Prisma](https://supabase.com/docs/guides/database/prisma)

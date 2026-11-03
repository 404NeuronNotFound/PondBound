# Architecture

## Responsibilities

React owns the application interface. React Router supplies the home route (`/`), pond preview (`/play`), and a catch-all 404. `AppShell` keeps navigation and server status mounted between pages. Page modules load lazily with a Suspense loading state and an error boundary that resets on navigation. A separate outer boundary protects the shell itself.

Phaser 3 owns the canvas and future world presentation. Visiting `/play` loads the engine; it is not loaded on the home page. React mounts and destroys one Phaser instance with its game viewport. A loading overlay remains until Phaser's post-boot callback. Async import/startup failures become render errors handled by the nearest boundary. The foundation scene contains text only; world assets and movement start in Phase 1.

The shell includes active navigation, a skip link, main-content focus and document-title updates on navigation, live status announcements, visible keyboard focus, fluid typography, narrow-screen layouts, and reduced-motion support. Server health checks time out after five seconds; offline status offers a manual reconnect while navigation remains available.

NestJS owns gameplay decisions and validates request DTOs through a global validation pipe. `AppModule` composes `HealthModule`, which imports `DatabaseModule`. The foundation exposes operational probes and versioned API identity. Application routes use `/api/v1/...`; a global exception filter provides consistent JSON errors and hides internal server details. See the [API guide](API.md). There are no fish, currency, trading, enhancement, or authentication endpoints yet.

Prisma connects NestJS to PostgreSQL using the PostgreSQL driver adapter. Supabase will host PostgreSQL, Auth, Storage and selected Realtime services. The optional public Supabase client is prepared in the browser; authentication and realtime behavior are deferred to their relevant phases.

## Boundaries

- `apps/web/src/features` contains domain UI; `components`, `hooks`, `lib`, `stores`, and `styles` hold shared concerns.
- `apps/web/src/game` contains Phaser scenes and engine lifecycle code.
- `apps/web/src/app` contains routing and the persistent layout; `pages` contains route views; `components` contains shared error, loading and status views.
- `apps/api/src/modules` reserves feature modules; `config`, `database`, `health`, and `common` hold server infrastructure.
- `packages/shared` contains runtime API schemas and inferred types, avoiding duplicate type packages.
- `packages/game-config` currently contains presentation settings only. Never put secrets or authoritative hidden probabilities in a browser-imported package.
- `packages/typescript-config` holds compiler defaults; lint rules live at the root until multiple distinct configurations are needed.

The initial private database schema reserves player identity only. It has no Gold or gameplay inventory fields. Introduce economic models and transactional operations in the corresponding phases.

## Health and credentials

`GET /health` reports API liveness. `GET /ready` executes `SELECT 1` through Prisma and reports database readiness separately. Original paths `/api/health` and `/api/health/ready` remain compatibility aliases. Probes are version-neutral. An unconfigured database does not prevent frontend and server development.

Database credentials belong only to the API. Browser variables must use public Supabase credentials. No service-role key is included. CORS is restricted to configured frontend origins. Bind the API appropriately behind a trusted reverse proxy before deployment.

## References

- [NestJS fundamentals](https://docs.nestjs.com/first-steps)
- [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite)
- [Prisma configuration](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
- [Supabase and Prisma](https://supabase.com/docs/guides/database/prisma)
- [React Router declarative routing](https://reactrouter.com/start/declarative/routing)
- [React error boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React lazy loading](https://react.dev/reference/react/lazy)

# Development setup

## Local apps

Install Node.js 24 and pnpm 12.9.1, then run `pnpm install` and `pnpm dev` from the repository root. The dev scripts build shared packages before starting the apps. Restart development after changing shared package source, or run that package's `dev` watch script separately.

Copy `apps/api/.env.example` to `apps/api/.env`, and `apps/web/.env.example` to `apps/web/.env` when adding configuration. These copies are optional for the credential-free preview.

The API binds to loopback by default. Set `PORT` to change its port and adjust the Vite proxy if needed. `WEB_ORIGIN` is a comma-separated list of exact frontend origins. The browser's `VITE_API_URL` is the API origin without `/api`; leave it empty for the development proxy. Configure it for independently hosted production apps.

## Dedicated Supabase project

Create or select a Supabase project dedicated to Pondbound. Do not reuse PaServe credentials or its database.

1. Copy the PostgreSQL runtime connection string into the API's `DATABASE_URL`. Percent-encode special characters in passwords. Use the Supabase Connect panel's recommended connection method for your network.
2. Set `DIRECT_URL` to a direct or session-pooler PostgreSQL connection for migrations. Runtime and migration roles should have appropriately scoped permissions. Follow the project's SSL instructions; do not disable certificate verification.
3. Run `pnpm db:validate`, then `pnpm db:migrate --name foundation` to create and apply the initial migration to the development project. Review its SQL and commit the resulting migration. Use `pnpm db:deploy` for reviewed migrations in deployment.
4. Restart the API and request `http://127.0.0.1:3000/api/health/ready`. HTTP 200 with `database: connected` confirms a Prisma query succeeded. A 503 reports unconfigured or unavailable without exposing connection secrets.
5. Add the public project URL and publishable key to the web app's Supabase environment variables when enabling authentication. The client is configured but no sign-in interface is implemented in Phase 0.

The initial Player model lives in a private `game` schema. Keep this schema out of Supabase's exposed Data API schemas and do not grant `anon` or `authenticated` direct table access. If a future table is exposed, enable and test Row Level Security before making it client-accessible. The NestJS API will own gameplay writes.

No cloud resources, storage buckets, auth policies, migrations, or secrets are provisioned by this scaffold.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start frontend and API |
| `pnpm build` | Generate Prisma client and build packages/apps in dependency order |
| `pnpm typecheck` | Check TypeScript |
| `pnpm lint` | Check code conventions |
| `pnpm test` | Run backend configuration and HTTP integration tests |
| `pnpm check` | Lint, typecheck, test and production build |
| `pnpm db:generate` | Generate Prisma client without a live database |
| `pnpm db:validate` | Validate Prisma schema/configuration |

The generated Prisma client and build outputs are ignored. `pnpm install` plus `pnpm build` reconstructs them. In PowerShell environments that restrict `.ps1` wrappers, use `pnpm.cmd`.

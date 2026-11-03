# Development setup

## Local apps

Install Node.js 24 and pnpm 12.9.1, then run these commands:

```sh
git clone https://github.com/404NeuronNotFound/PondBound.git
cd PondBound
pnpm install --frozen-lockfile
pnpm dev
```

The root development command builds `packages/shared` and `packages/game-config` once before starting both apps in parallel. No previous `dist` directories, generated Prisma client or `.env` files are required. Frontend: http://localhost:5173. Backend: http://localhost:3000/api/health. The frontend also proxies `/api/health` to the backend. Stop both processes with Ctrl+C.

Restart development after changing shared package source, or run that package's `dev` watch script separately. Ports 5173 and 3000 must be available. Vite deliberately fails if port 5173 is occupied.

Run `pnpm env:setup` to create missing runtime, web, migration and provisioning environment files from their templates without overwriting settings. These copies are optional for the credential-free preview. Never commit populated environment files.

The API binds to loopback by default. Set `PORT` to change its port and adjust the Vite proxy if needed. `WEB_ORIGIN` is a comma-separated list of exact frontend origins. The browser's `VITE_API_URL` is the API origin without `/api`; leave it empty for the development proxy. Configure it for independently hosted production apps.

## Dedicated Supabase project

Create or select a Supabase project dedicated to Pondbound. Do not reuse PaServe credentials or its database.

1. Follow the [Supabase infrastructure guide](../deployment/supabase/README.md) to populate the ignored provisioning file and configure the provider CA.
2. Run `pnpm db:bootstrap` to create restricted roles/schema and generate separate runtime and migration credentials. Administrator credentials never belong in the runtime `DATABASE_URL`.
3. Run `pnpm db:deploy`, `pnpm db:verify`, and `pnpm db:status` to apply the committed initial migration and verify its permissions. Run `pnpm storage:provision` for the private bucket.
4. Restart the API and request `http://127.0.0.1:3000/ready`. HTTP 200 with `database: connected` confirms a Prisma query succeeded. A 503 reports unconfigured or unavailable without exposing connection secrets.
5. Add the public project URL and publishable key to the web app's environment. Authentication UI and user-facing Storage operations are later tasks.

The initial Player model lives in a private `game` schema. Keep this schema out of Supabase's exposed Data API schemas and do not grant `anon` or `authenticated` direct table access. If a future table is exposed, enable and test Row Level Security before making it client-accessible. The NestJS API will own gameplay writes.

The existing PondBound Development project now has the initial migration, restricted roles and private Storage bucket applied. Credentials remain local and ignored. A fresh clone runs without them; connecting that clone to a database requires its own environment configuration.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start frontend and API |
| `pnpm env:setup` | Copy missing environment templates without overwriting settings |
| `pnpm build` | Generate Prisma client and build packages/apps in dependency order |
| `pnpm typecheck` | Check TypeScript |
| `pnpm lint` | Check code conventions |
| `pnpm test` | Build shared packages and run frontend and backend tests |
| `pnpm --filter @pondbound/web test` | Run frontend routing, loading, recovery and lifecycle tests |
| `pnpm check` | Lint, typecheck, test and production build |
| `pnpm check:secrets` | Check source/browser credential boundaries after building |
| `pnpm db:generate` | Generate Prisma client without a live database |
| `pnpm db:validate` | Validate Prisma schema/configuration |
| `pnpm db:bootstrap` | Provision roles/schema and local role credentials using the administrator connection |
| `pnpm db:deploy` | Apply committed migrations using migration-only credentials |
| `pnpm db:verify` | Check live runtime permissions and browser isolation |
| `pnpm db:status` | Inspect applied migration status |
| `pnpm storage:provision` | Create or verify the private Storage bucket |

The generated Prisma client and build outputs are ignored. `pnpm install --frozen-lockfile` plus `pnpm build` reconstructs them. In PowerShell environments that restrict `.ps1` wrappers, use `pnpm.cmd` for every pnpm command. Windows uses the same root commands as macOS and Linux.

Canonical backend probes are `http://localhost:3000/health` and `http://localhost:3000/ready`. Versioned API information is available at `http://localhost:3000/api/v1`. The frontend continues to use the `/api/health` compatibility alias through Vite. See the [API guide](API.md) for contracts and error responses.

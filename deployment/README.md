# Deployment

Deployment is not configured yet. The frontend builds to `apps/web/dist`; NestJS builds to `apps/api/dist` and starts with `pnpm --filter @pondbound/api start` after shared packages and Prisma client generation.

Use Node.js 24, install from the committed lockfile, build with `pnpm build`, and set server environment variables through the hosting provider. A reverse proxy must reach the API's loopback listener, or the bind address must be adjusted for the chosen container host. Configure the browser API origin at build time.

Keep Supabase administration and migration configuration under `deployment/supabase`; Prisma schema and migrations remain in `apps/api/prisma`. Do not deploy until database readiness, credentials, TLS, and origin configuration are verified.

The web app uses browser-history routing. Configure the static host to serve `index.html` for frontend routes such as `/play` and unknown paths; preserve `/assets/*` and `/api/*` handling. Vite's dev server and preview server provide the frontend history fallback locally. The application renders its own 404 page for unmatched routes.

Configure backend liveness against `/health` and database readiness against `/ready`. Both are version-neutral. A running process without a configured/reachable database returns 200 for liveness and 503 for readiness. Keep these backend probe paths distinct from the frontend's SPA fallback.

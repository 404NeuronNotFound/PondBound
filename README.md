# Pondbound

A cozy fishing adventure. Phase 0 establishes the development stack; gameplay follows the [whitepaper](WHITEPAPER.md).

## Quick start

Use Node.js 24 and pnpm 12.9.1. Start from a fresh clone:

```sh
git clone https://github.com/404NeuronNotFound/PondBound.git
cd PondBound
pnpm install --frozen-lockfile
pnpm dev
```

Frontend: http://localhost:5173. API: http://127.0.0.1:3000/api/health.
The frontend proxies `/api` to NestJS during development. Start both processes with the root command.

No credentials or prebuilt files are required to run the foundation preview. `pnpm dev` builds shared packages once, generates the Prisma client, and starts both apps in watch mode. Stop both with Ctrl+C. Database readiness returns HTTP 503 until a database is configured. See [setup](docs/SETUP.md) for the Supabase connection steps.

Run `pnpm env:setup` when you need app-local `.env` files. This copies the templates and preserves existing settings.

```sh
pnpm check
pnpm db:validate
```

## Structure

```text
apps/
  web/              React, Vite, Tailwind, Phaser 3
  api/              NestJS, validation, Prisma and health endpoints
packages/
  shared/        Shared Zod schemas and API types
  game-config/      Shared presentation settings
  typescript-config/ Shared compiler defaults
art/                Editable pixel-art sources by asset category
assets/             Exported sprites, tilesets and animation metadata
docs/               Setup, architecture and phase verification
deployment/         Hosting and Supabase guidance
scripts/            Repository utilities
artifacts/          Ignored local build and verification outputs
```

Feature directories are reserved for later phases and contain no implemented gameplay. Prisma belongs to `apps/api/prisma`, beside the server that owns it. Original asset sources belong in `art`; only browser-ready assets go in `apps/web/public/assets`.

## Working conventions

Use TypeScript and feature modules. Put shared API schemas in `packages/shared`; the server validates all authoritative actions. Keep secrets in ignored app-local `.env` files. Run `pnpm check` before reviewing a change. Update existing documentation when behavior changes.

Use short feature branches and review changes before merging. Keep `pnpm-lock.yaml` committed so a fresh clone uses the same dependency versions.

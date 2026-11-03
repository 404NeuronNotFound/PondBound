# Coding and contribution rules

Start with [setup](docs/SETUP.md), [architecture](docs/ARCHITECTURE.md) and the [decision log](docs/DECISIONS.md). Work within the current roadmap phase and document incomplete deployment or verification explicitly.

## Code ownership and naming

- Put route views in `apps/web/src/pages`, shared UI in `components`, route composition in `app`, and canvas lifecycle/scenes in `game`. Domain UI belongs in `features` as those features are implemented.
- Put backend features under `apps/api/src/modules`; register modules explicitly. Keep configuration, database, health and common HTTP infrastructure in their existing directories.
- Use PascalCase for React components/scenes and their files, `use...` for hooks, and the existing lowercase Nest naming pattern such as `players.service.ts` for server modules. Name variables/functions by the value or action they represent.
- Share public schemas/types through `@pondbound/shared` and public presentation values through `@pondbound/game-config`. Import workspace exports rather than another package's `src` or `dist` files. Server ESM relative imports use `.js` extensions; follow the existing Vite convention in browser code.
- Keep editable art in `art`, exported source assets in `assets`, and browser-ready assets in `apps/web/public/assets`. Preserve the original whitepaper and applied migration files.

## Types, errors and asynchronous work

Use the shared strict TypeScript configuration. Prefer inferred types and `import type`; validate untrusted values before treating them as domain data. Avoid `any`, unchecked casts and non-null assertions in production code unless a local invariant is justified. Handle optional/indexed values explicitly. Do not weaken compiler/lint rules to make a failing check disappear.

Keep async failures observable and safe. Await work or deliberately handle its rejection. Cancel browser requests and clean up subscriptions/Phaser instances when their owner unmounts. Loading, empty and failure states should have a clear recovery action where applicable. Keep keyboard access and narrow-screen behavior in route changes.

Use Nest's exception/validation pipeline for HTTP errors. Return stable public messages and keep driver errors, stacks, request tokens and submitted secrets out of responses/logs. Do not log full environment objects or authorization headers. Apply Prettier through the root command; ESLint owns code rules rather than conflicting formatting rules.

## Server and data rules

Treat the server as authoritative. Verify the caller, resolve its internal Player ID, then constrain owned queries/writes by that ID. Reject client-supplied role/identity overrides. Add public routes deliberately using the existing decorator; keep the global guard active. Use DTO validation for new request bodies and shared response schemas/types for public contracts.

Keep business writes and their audit events in one database transaction. Use constraints and conditional writes/locks for concurrent state changes. Follow [database ownership and migration policy](docs/DATABASE.md), including indexes, RLS, restrictive foreign keys and append-only audit history. Never edit an applied migration or reset the hosted database to fix a local test.

Credentials stay in ignored, environment-specific files or deployment secret stores. Runtime, migration and provisioning credentials remain separate. Browser variables contain only the approved public fields. Preserve certificate verification and exact-origin CORS when troubleshooting.

## Verification and review

Run from the repository root:

```sh
pnpm format
pnpm check
pnpm db:validate
```

Review the formatter's diff. For database changes, also run `pnpm test:database` with an explicitly configured disposable local PostgreSQL cluster. For frontend behavior, add focused component tests and verify relevant real-browser interactions. The live `pnpm auth:verify` command creates temporary users; it is separate from ordinary tests. See [test boundaries](docs/CODE_QUALITY.md).

Use short feature branches and pull requests. The required `verify` check must pass against an up-to-date base before merge. Explain the concrete behavior change, validation, migration/deployment requirements and remaining limitations in the PR. Optional hooks are documented in [.githooks](.githooks/README.md).

Update the existing guide for behavior/configuration changes. Add a decision-log entry for architectural changes. Keep examples free of real credentials and point to `package.json`/environment templates for canonical commands and fields.

# Code quality and tests

Use Node 24 and the pnpm version recorded in `package.json`. Install with `pnpm install --frozen-lockfile`, then run `pnpm check` before opening a pull request. No Supabase credentials are needed for that check.

## Local checks

| Command                                   | Purpose                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm format`                             | Apply the pinned Prettier version to source, configuration and documentation      |
| `pnpm format:check`                       | Reject formatting drift without changing files                                    |
| `pnpm lint`                               | ESLint for JavaScript, TypeScript, scripts and tests; warnings fail               |
| `pnpm lint:fix`                           | Apply available ESLint fixes, then review the diff                                |
| `pnpm typecheck`                          | Check every workspace using the shared strict compiler settings                   |
| `pnpm test`                               | Run all frontend and ordinary backend tests                                       |
| `pnpm test:unit`                          | Run frontend component/unit tests and backend unit tests                          |
| `pnpm test:integration`                   | Run backend HTTP integration tests with substituted dependencies                  |
| `pnpm test:database`                      | Run real PostgreSQL migration, permission and runtime integration tests           |
| `pnpm --filter @pondbound/web test:watch` | Watch frontend tests during development                                           |
| `pnpm check`                              | Formatting, lint, typecheck, all ordinary tests, build and secret-boundary checks |

ESLint combines JavaScript recommended rules, TypeScript recommended rules, type-only import checks and React Hooks rules. Prettier owns formatting; its ESLint compatibility configuration disables competing style rules. Generated clients, dependencies, build outputs and verification artifacts are excluded. The original whitepaper and applied migrations are preserved rather than reformatted.

All TypeScript workspaces inherit `strict`, unchecked indexed-access checks, unused-local/parameter checks, explicit overrides, return-path checks and switch fallthrough checks. App configurations retain the module and runtime settings appropriate to Vite and NestJS.

## Test boundaries

Frontend tests use Vitest, jsdom and Testing Library for routes, loading/error recovery, account sessions and game lifecycle. Phaser is mocked: these checks do not test actual WebGL rendering. Backend tests use Node's test runner against compiled output. `*.unit.test.mjs` tests cover configuration and isolated behavior; `*.http.test.mjs` tests boot the Nest application and make HTTP requests with substituted Auth/database providers. Both groups run with test-mode environment loading.

The separate database suite requires `TEST_DB_ADMIN_URL` pointing to an isolated loopback database named `pondbound_test_*`. It provisions test roles and applies migrations, so use a disposable PostgreSQL instance. With `CI=true`, it also asserts that the game schema is absent before migration. See the [infrastructure guide](../deployment/supabase/README.md) for database test setup. The live `pnpm auth:verify` smoke test is explicit and excluded from normal checks and CI.

## Pull-request CI

`pnpm security:audit` scans the full dependency graph and fails for high/critical advisories or registry errors. CI runs it after frozen installation, separately from the network-independent `pnpm check`. The same workflow is scheduled weekly after publication. See [dependency policy](SECURITY.md) for targeted security overrides and review requirements.

[The workflow](../.github/workflows/ci.yml) runs on pull requests, pushes and manual dispatch. It pins action revisions, grants read-only repository access and cancels superseded runs for the same ref. Each job installs the frozen lockfile, runs `pnpm check`, validates Prisma and tests migration/permissions against a fresh PostgreSQL 17 service. It uses disposable fixture credentials and a random harmless server-only build canary; no Supabase secrets are required.

`main` is protected by a required `verify` status check bound to the GitHub Actions app. Pull requests must pass that check against an up-to-date base before merging; enforcement includes repository administrators. Direct pushes cannot bypass this requirement. No external review approval is required for this solo repository. Branch protection is a repository setting, separate from the workflow file, and must be configured again if the repository is recreated.

The initial [hosted pull-request run](https://github.com/404NeuronNotFound/PondBound/actions/runs/41620220546) passed frozen installation, the complete quality gate, Prisma validation and the disposable-database suite. GitHub also reported the PR as blocked while its required check was pending.

## Optional pre-commit hook

The checked-in hook runs formatting checks and lint without modifying staged files. It is opt-in and has not been enabled automatically. See [hook setup](../.githooks/README.md); preserve any existing local hook configuration. CI runs the complete checks regardless of whether hooks are enabled.

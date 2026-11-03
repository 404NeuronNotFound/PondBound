# Configuration and secret management

## Modes and precedence

Select the API mode with `NODE_ENV` and the browser mode with Vite. Process values take precedence over files. File order is highest priority first:

| Mode        | Files                                                              |
| ----------- | ------------------------------------------------------------------ |
| Development | `.env.development.local`, `.env.development`, `.env.local`, `.env` |
| Test        | `.env.test.local`, `.env.test`                                     |
| Production  | `.env.production.local`, `.env.production`                         |

Test/production never fall back to development files. The API selects its mode before loading files and rejects a conflicting `NODE_ENV` inside a file. API paths are relative to the package, independent of the shell working directory.

API unit/HTTP tests use an explicit `NODE_ENV=test` preload and injected fixtures. Browser unit tests load no environment files. Prisma CLI and provisioning scripts keep their separate `.env.migrations` and `deployment/supabase/.env` inputs.

Create missing local files without replacing existing values:

```sh
pnpm env:setup
pnpm env:setup --mode test
pnpm env:setup --mode production
```

`pnpm dev` starts development. After building, API `start` and `start:prod` explicitly select production; `start:test` selects test (the example uses port 3001). Web `build` selects production and `build:test` selects test. Populated environment files are ignored; only example templates are committed. Restart processes after changing configuration.

## API validation

The Zod schema validates mode, bind address, port, runtime database role/URL, pool limits/timeouts, provider configuration and frontend origins. Errors identify invalid fields without printing submitted values or attaching the original validation input.

Production requires explicit `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `WEB_ORIGIN`. Production web/Auth origins must use HTTPS; localhost CORS defaults are not applied. Runtime PostgreSQL uses `pondbound_api`, with verified TLS for remote connections. `HOST` defaults to loopback; the production container template uses `0.0.0.0`.

The API runtime rejects migration/admin credentials: `DIRECT_URL`, `SHADOW_DATABASE_URL`, `SUPABASE_DB_ADMIN_URL`, server secret/service-role keys and bootstrap role-password variables. `TEST_DB_ADMIN_URL` is also forbidden in production. Supply these only to their separate jobs/scripts. Development may omit database/Auth settings, leaving those services unavailable; configured Auth requires both public URL and public key together.

API rate/proxy settings also have validated defaults: `API_RATE_LIMIT=120`, `AUTH_RATE_LIMIT=30`, `RATE_LIMIT_WINDOW_MS=60000`, and blank `TRUSTED_PROXY_CIDRS`. These are server-only. See [monitoring and security](SECURITY.md) before configuring trusted proxy addresses or deploying multiple replicas.

## Browser configuration

Only these validated fields are defined into the browser bundle:

- `VITE_API_URL`: exact API origin without a path; empty means same-origin `/api`.
- `VITE_SUPABASE_URL`: public provider origin.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: publishable/anon key, never a server secret or service-role key.

The custom Vite loader disables automatic dotenv/prefix exposure and explicitly defines the public set. Unknown `VITE_*` names and server credentials stored in web files fail validation. Test/production builds do not inherit the developer's project. Explicit process values override selected files.

Both public Auth fields may be empty for an account-disabled preview. A production release with sign-in must configure both for its intended production project. Empty API origin in production requires a hosting reverse proxy; otherwise configure an HTTPS API origin. Public configuration is build-time, so changes require rebuilding/redeploying the web app. [Vite modes](https://vite.dev/guide/env-and-mode)

## CORS

`WEB_ORIGIN` accepts comma-separated exact HTTP(S) origins, normalized and deduplicated. Credentials, non-root paths, queries, fragments, `null`, wildcards and empty entries are rejected. Production entries require HTTPS.

Matching origins receive the exact allow-origin header. Unlisted origins, including preflights, receive JSON 403 and no allow-origin header. No-Origin requests remain available to probes/server clients, with authentication still enforced on protected routes. CORS is browser policy, not authorization.

Current methods are GET, POST and OPTIONS; allowed headers are Authorization and Content-Type. Cookie credentials are disabled; preflights cache for 600 seconds. Extend methods/headers deliberately when introducing endpoints. [NestJS CORS](https://docs.nestjs.com/security/cors)

## Rotation guidance

Use separate secret-manager entries per environment and give each job only its required credentials. Rotate after exposure/access changes or under the project's operational policy. This task defines guidance; it does not rotate current credentials.

**Runtime database:** change `pondbound_api`'s password through an administrator-only process in a maintenance window. Update the selected runtime URL and saved bootstrap password so future bootstrap does not restore the old value. Restart/drain all API pools and verify `/ready` plus `pnpm db:verify`. Changing a password does not close already-authenticated connections; terminate old sessions when required. Keep rollback values only in controlled secret-manager history.

**Migration database:** rotate `pondbound_migrator` independently. Update the migration job's `DIRECT_URL` and saved bootstrap password. Verify with `pnpm db:status`; do not reset migrations or push schema changes as part of rotation.

**Administrator database:** rotate through Supabase's database settings and update only the provisioning administrator URL. Runtime and migration roles retain independent passwords. Recheck the administration connection and app readiness.

**Supabase API keys:** create a replacement key, update its consumers, verify them, then revoke the old key. Secret keys stay in provisioning; publishable keys require updating the API verifier and rebuilding the browser. Prefer independently managed publishable/secret keys; follow the provider's current migration procedure for legacy anon/service-role setups. [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [migration](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)

**JWT signing keys:** use Supabase Auth's signing-key rotation and trust/retirement window. NestJS verifies upstream with `getUser(token)` and stores no signing key locally. Plan client refresh/re-authentication before retiring prior keys. API-key rotation and JWT signing-key rotation are distinct. [Signing keys](https://supabase.com/docs/guides/auth/signing-keys)

Avoid secrets in shell arguments, frontend variables, screenshots or repository files. After a rotation, rebuild/restart consumers, verify protected requests and readiness, run `pnpm check:secrets`, and revoke obsolete credentials after successful rollout.

## Verification — November 3, 2026

- Mode isolation, process precedence, required production fields and redacted errors passed automated tests.
- Production missing-config startup exited before serving requests, without development credential fallback or credential values in errors.
- CORS tests covered allowed preflights, no cookie credentials, rejected unlisted/suffix-spoofed/null origins, and no-Origin probes. Live checks returned 200 for the listed development origin and 403 for an unlisted origin.
- Test/production placeholders were created while preserving development environment file hashes.
- Full checks passed 26 backend tests, 20 frontend tests, lint, typecheck, builds and all-mode secret scanning.
- Acceptance follow-up scanned 216 Git-history blobs: no configured server credentials were found, and no non-example environment paths were committed. The final production entry point rejected missing required values before startup without printing credentials. The final browser build passed the credential scan. This history check covers configured known credentials, not unknown historical secrets.

# Authentication and Player identity

Supabase Auth is Pondbound's identity provider. Passwords go directly from the browser SDK to Supabase over HTTPS; NestJS receives only the access token. NestJS verifies every protected request using the configured project's `auth.getUser(token)` and uses only the returned UUID. Decoded JWTs, browser session objects and user metadata are not authorization sources.

## Configuration and endpoints

The API needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` together in its selected runtime environment. The browser uses their `VITE_` equivalents for the selected build mode. Development uses `.env`; test/production do not inherit it. Request-time verification uses the public key, no service-role key. The server Auth client has no persisted session and a five-second network timeout. Remote Auth URLs require HTTPS. See [configuration](CONFIGURATION.md).

| Method | Route                | Behavior                                                  |
| ------ | -------------------- | --------------------------------------------------------- |
| POST   | `/api/v1/players/me` | Initialize/reuse the verified caller's profile; send `{}` |
| GET    | `/api/v1/players/me` | Return the verified caller's existing profile, or 404     |

Responses contain `{ player: { id, authId, createdAt, updatedAt } }`, with ISO dates. No identity or role fields are accepted in initialization requests; extra body fields return 400. Query parameters cannot select another profile.

A global `APP_GUARD` protects routes by default. `@Public()` marks health/readiness and API identity as public. `@CurrentIdentity()` reads the guard's verified UUID. Missing or malformed tokens return 401. Invalid, expired or foreign tokens rejected by Supabase return 401. Missing/unavailable Auth configuration fails closed with a generic 503.

## Identity and permission boundaries

Player already has an internal UUID `id` and a unique UUID `authId`, the 1:1 Supabase identity key. No schema migration was needed. Initialization uses an upsert and recovers from the unique authId conflict that can occur in concurrent empty-update upserts. Simultaneous first logins resolve to one stored Player.

User-editable Supabase metadata is ignored for roles and ownership. The verified identity type contains only UUID. Client-supplied IDs and roles cannot change the resolved Player. Future administrative/gameplay permissions require explicit server-side authorization; this task does not create an administrative role system.

Browser access to the private schema remains denied. There is no foreign key into the managed Auth schema; external Auth account deletion needs separate Player lifecycle cleanup. The API verifies the upstream user before profile access or creation.

## Account page

`/account` supports sign-in for existing accounts, SDK session restoration, verified profile initialization, retry and sign-out. The browser uses its SDK session to obtain the access token; NestJS still verifies it before returning a profile. Auth events update React state, and profile requests run outside the SDK callback. Requests are cancelled on token changes/unmount; late responses cannot restore a signed-out profile.

Tokens travel in Authorization headers, never URLs. Supabase SDK handles browser session persistence/refresh. Sign-out uses local scope; token expiry/revocation semantics are governed by Supabase. Account registration, confirmation redirects, password-reset and deletion interfaces are separate features. The public landing and pond preview remain accessible without sign-in.

## Verification

`pnpm check` covers token rejection, provider failures, two-user isolation, metadata/body spoofing, profile reuse, unique-conflict recovery and browser session behavior. Expired/foreign provider errors are simulated in HTTP tests. Tests use a mocked provider; real signature rejection is also checked by the live smoke test.

Run `pnpm auth:verify` explicitly against the running loopback API and configured development project. It uses the separate provisioning secret to create two confirmed temporary users without email, signs in, tests malformed/tampered tokens, concurrent initialization and identity/role overrides, then removes the users and their Player rows. It does not print passwords or tokens and is not part of ordinary CI.

On November 3, 2026, the live smoke test passed. Automated checks passed 20 backend and 18 frontend tests, typecheck, lint, builds and secret checks. No browser connection was available, so visual account-page verification is pending.

References: [Supabase passwords](https://supabase.com/docs/guides/auth/passwords), [server verification](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [NestJS guards](https://docs.nestjs.com/guards).

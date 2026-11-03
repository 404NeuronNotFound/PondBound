# Game-config conventions

`packages/game-config` is a browser-safe workspace package. Its current public export is `viewport` from `src/index.ts`, consumed by `apps/web/src/game/create-game.ts`.

| Field                 | Current value | Meaning                         |
| --------------------- | ------------- | ------------------------------- |
| `viewport.width`      | `960`         | Logical canvas width in pixels  |
| `viewport.height`     | `540`         | Logical canvas height in pixels |
| `viewport.background` | `#142e2b`     | Canvas background color         |

## What belongs here

Keep public, deterministic presentation settings here: logical viewport dimensions, public visual timing or display settings when those features exist. Use named exports, narrow literal types and `as const` for static objects. Treat exported values as read-only; TypeScript's `as const` supplies compile-time readonly types. Keep modules free of side effects, network calls, environment reads, browser globals and Node-only imports so their consumers can build independently.

Name quantities with explicit units when the name does not already explain them, such as a future `animationFrameMs` or `tileSizePx`. Document valid ranges and relationships. New values are introduced with a consumer and validation appropriate to their impact; avoid unused placeholders for later phases. Public IDs introduced later must remain stable across saved data and API responses.

Game configuration is version-controlled source, not a deployment secret. Environment-specific URLs and keys belong in the validated app configuration. Public transport schemas and inferred API types belong in `packages/shared`. Authoritative fishing chances, upgrade outcomes, fees, balances and private anti-abuse rules belong in server modules/configuration when implemented. A future public display catalog must describe server-owned rules without becoming an authorization source.

## How to change a setting

1. Edit `packages/game-config/src/index.ts` and its actual consumers together. Import through the package export:

   ```ts
   import { viewport } from '@pondbound/game-config';
   ```

2. Rebuild the package with `pnpm --filter @pondbound/game-config build`. Root `pnpm dev` builds it once at startup; stop/restart root development after shared-source changes for a predictable refresh. A separate `pnpm --filter @pondbound/game-config dev` terminal is available for package compilation while editing.
3. Check affected UI/game behavior. A viewport change also requires reviewing the CSS game aspect ratio and BootScene's currently fixed text coordinates. The existing code does not derive every layout dimension from `viewport`.
4. Run `pnpm check`. Verify real canvas scaling and pixel rendering in a browser when visual settings change; DOM tests mock the engine. Record relevant screenshots/results with the change rather than treating a mocked test as canvas verification.
5. Update this guide when exports or their meaning change. Add an [architecture decision](DECISIONS.md) before expanding the package into a new responsibility.

The package version is private workspace metadata; it is not a persisted gameplay ruleset version. If later gameplay needs reproducible historical outcomes, introduce an explicit server-owned ruleset revision and migration/replay policy before saving those outcomes.

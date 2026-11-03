# Repository scripts

Reserve this directory for reusable development and verification utilities. Application-specific scripts belong with their app. Current checks use root package scripts.

`setup.mjs` creates missing local environment files. `check-secrets.mjs` checks configured server credentials against Git-visible source, browser environment files and the browser build. It is invoked by `pnpm check` after building; `pnpm check:secrets` also runs it directly. It reports paths or variable names without printing credential values.

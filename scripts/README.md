# Repository scripts

Reserve this directory for reusable development and verification utilities. Application-specific scripts belong with their app. Current checks use root package scripts.

`setup.mjs` creates missing local environment files. `check-secrets.mjs` checks configured server credentials against Git-visible source, browser environment files and the browser build. It is invoked by `pnpm check` after building; `pnpm check:secrets` also runs it directly. It reports paths or variable names without printing credential values.

`pnpm env:setup --mode test` and `--mode production` create separate mode placeholders without changing development files. The secret guard scans all actual `.env*` files in the API, web and provisioning directories, excluding example templates.

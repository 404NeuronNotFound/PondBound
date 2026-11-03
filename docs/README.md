# Documentation

- [Whitepaper](../WHITEPAPER.md): design and development phases.
- [Setup](SETUP.md): local commands and Supabase configuration.
- [Architecture](ARCHITECTURE.md): responsibilities, security boundaries, folder ownership.
- [Architecture decision log](DECISIONS.md): accepted choices, consequences and rollout status.
- [Game-config conventions](GAME_CONFIG.md): public exports, units, consumers and change verification.
- [Coding rules](../CONTRIBUTING.md): conventions, security boundaries and review expectations.
- [Environment runbook](RUNBOOK.md): environment checklist, troubleshooting and handoff steps.
- [API foundation](API.md): probes, versioning, validation, exception responses and HTTP tests.
- [Authentication](AUTHENTICATION.md): token verification, Player mapping and account sign-in.
- [Configuration and secrets](CONFIGURATION.md): mode isolation, validation, CORS and credential rotation.
- [Code quality and tests](CODE_QUALITY.md): formatting, lint, strict TypeScript, test suites, PR CI and optional hooks.
- [Database foundations](DATABASE.md): Player identity, ownership, UUIDs, timestamps, append-only audit, seeds and migration policy.
- [Supabase infrastructure](../deployment/supabase/README.md): database roles, migrations, TLS, pooling and private Storage.
- [Phase 0](PHASE_0.md): implemented foundation and verification limits.
- [Asset pipeline](ASSETS.md): source toolkit and production requirements.

Keep one guide per distinct area. Extend existing guides instead of creating a document for each change.

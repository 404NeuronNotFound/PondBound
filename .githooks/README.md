# Optional local hook

CI enforces the full quality gate. To also check formatting and lint before local commits, enable this repository's hook deliberately:

```sh
chmod +x .githooks/pre-commit
git config --local core.hooksPath .githooks
```

Use Git Bash for these commands on Windows. Check `git config --get core.hooksPath` first; keep or combine any existing hook setup rather than replacing it blindly. This task does not change Git configuration or enable hooks automatically.

Run `pnpm check` before review; the optional hook runs only formatting and lint to keep commits responsive.

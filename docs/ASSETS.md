# Asset production

Primary toolkit: [crsolver/claude-pxl](https://github.com/crsolver/claude-pxl).

The repository and README were inspected during foundation setup. The toolkit uses `.px.js` or `.px.ts` source files and provides a Node CLI that exports PNGs, sprite sheets, JSON metadata and previews. Its README documents `node bin/pxl.js build <source> --out <directory>` and a live `serve` mode. It requires Node 22.18 or later and needs no runtime dependencies when run from a clone.

Asset generation is deferred to Phase 1. Before producing any assets, inspect the current toolkit README, examples, API, and build commands in full, then record the selected revision and reproducible export command here. The toolkit is not installed in the game runtime.

Use original artwork, a consistent palette, transparent inventory icons and pixel-perfect rendering. Do not substitute generated foundation artwork for the required asset pipeline.

Editable sources live under `art/{palette,characters,fish,rods,tiles,environments}`. Exported reusable PNGs and metadata live under `assets/{sprites,tilesets,animations}`. Copy only assets needed by the client to `apps/web/public/assets`.

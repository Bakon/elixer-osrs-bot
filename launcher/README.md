# Elixer Scripts launcher

The desktop launcher — a Tauri 2 app with a React 19 (Vite, CSS Modules)
frontend and a Rust backend that runs the Simba scripts. See the
[root README](../README.md) for the full project overview.

Uses the project-local Node 24 under `.tools/` and pnpm.

Development (hot reload):

```cmd
pnpm tauri dev
```

Build (no installer bundle):

```cmd
pnpm tauri build --no-bundle
```

> Always build through the Tauri CLI. A plain `cargo build --release` produces
> a dev-flavored exe that loads a dev server on `localhost:1420` instead of the
> embedded frontend.

The output binary is `src-tauri/target/release/elixer-launcher.exe`. Every
build auto-increments the patch version via `scripts/bump-version.mjs`.

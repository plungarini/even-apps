# Simulator environment

The published `start-even.sh` launcher you copied comes from the [even-dev](https://github.com/BxNxM/even-dev) project. That tool assumes a shared root-level Vite setup, optional `apps.json` registry entries, Bash helpers, and plugin injection via `vite-plugin.ts`.

This monorepo uses a different model: each folder under `apps/` is an independent Vite app with its own config and dependencies. Because of that, the imported shell script is not a drop-in fit here.

## Root emulator command

From the root of `even-apps`, run:

```bash
npm run emulator -- <app-name>
```

Examples:

```bash
npm run emulator -- carnav
npm run emulator -- reddit-feed
```

If you omit the app name, the launcher will show an interactive picker:

```bash
npm run emulator
```

To list valid app names without starting anything:

```bash
npm run emulator -- --list
```

## What the root launcher does

- Finds runnable apps under `apps/`
- Verifies the selected app's dev server is already reachable
- Launches `evenhub-simulator` against that local URL

This intentionally starts only the hot-reloaded simulator flow. It does not start Vite, QR generation, or other app-specific dev helpers.

HUD hot reload is driven by each app's Vite dev server. In this repo, the Vite configs force a full page reload on `src/` or `index.html` changes so the Even bridge reconnects and redraws the simulator view.

## Current limitation

If an app also needs a separate backend process, the root launcher does not start it. For example, apps with a `server/` folder may still need that service started separately.

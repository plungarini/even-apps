# Even Apps – Agent Guide

This document provides comprehensive guidance for AI coding agents working on the Even Apps monorepo. This repo is a collection of Even Hub apps for the Even Realities G2 smart glasses platform.

---

## Project Overview

Even Apps is a **monorepo of independent Even Hub apps**, each managed as a Git submodule under `apps/`. The apps target the Even Realities G2 smart glasses via the Even Hub platform.

### Platform Architecture

Even Hub apps are **regular web apps** that communicate with the G2 glasses through the iPhone:

```
[Your server / localhost] <--HTTPS/HTTP--> [iPhone WebView (Even App)] <--BLE--> [G2 Glasses]
```

- Your app runs as a standard web app (any hosting)
- The iPhone opens your URL in a Flutter WebView and bridges it to the glasses over BLE
- The glasses are a display + input peripheral — they render UI containers and emit input events
- No code runs on the glasses themselves

---

## Repository Structure

```
even-apps/
├── CLAUDE.md                  # This file — agent guide + submodule guidelines
├── README.md                  # Human-facing overview
├── package.json               # Root package (orchestration scripts)
├── .gitmodules                # Git submodule definitions (one per app)
├── .gitignore                 # Root ignores
├── apps/                      # Git submodule apps (one subfolder per app)
│   └── <app-name>/            # Each is an independent git repo
├── docs/
│   └── even-hub-research.md   # Deep reference: SDK, CLI, UI model, lifecycle, etc.
└── scripts/
    └── add-app.js             # Helper: scaffold a new app submodule
```

Each app in `apps/` is an **independent Git repository** linked via Git submodules. The app itself is a standard TypeScript + Vite web app targeting the Even Hub SDK.

---

## Technology Stack

### Per-App Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Build tool | Vite |
| SDK | `@evenrealities/even_hub_sdk` (latest: `^0.0.9`) |
| CLI | `@evenrealities/evenhub-cli` (latest: `^0.1.10`) |
| Simulator | `@evenrealities/evenhub-simulator` (latest: `^0.6.2`) |
| Optional UI | `@jappyjan/even-realities-ui` (browser settings pages) |

### No Framework Required

Even Hub apps are plain HTML + TypeScript. Do **not** introduce React, Vue, Angular, or other SPA frameworks unless there is a specific reason — the app runs in a Flutter WebView and the display output goes to the glasses, not a browser screen.

The browser (WebView) page is only used as a runtime host. Avoid CSS frameworks like Tailwind unless you are using `even-dev` with a `vite-plugin.ts` — those plugins won't be available in standalone dev mode.

---

## Cloning This Repo

```bash
# Full clone with all app submodules
git clone --recurse-submodules git@github.com:plungarini/even-apps.git

# If already cloned without submodules
git submodule update --init --recursive
```

---

## Adding a New App as a Git Submodule

### Step 1 — Create the app's GitHub repo

The app should first exist as its own GitHub repository. Name it in kebab-case: `<descriptive-name>-even` (e.g., `weather-even`, `timer-even`, `news-even`).

```bash
# Inside the new app's directory:
git init
git flow init -d    # sets up master + develop branches
gh repo create plungarini/<app-name>-even --public --source=. --remote=origin --push
git push -u origin develop
```

### Step 2 — Register as a submodule in this repo

From the **root** of `even-apps`:

```bash
# Always use SSH URLs (never local paths or HTTPS)
git submodule add git@github.com:plungarini/<app-name>-even.git apps/<app-name>

# Verify .gitmodules was updated
cat .gitmodules
```

This will add an entry like:

```ini
[submodule "<app-name>"]
    path = apps/<app-name>
    url = git@github.com:plungarini/<app-name>-even.git
```

### Step 3 — Commit the submodule registration

```bash
git add .gitmodules apps/<app-name>
git commit -m "feat: add <app-name> as submodule"
```

---

## Standard App Structure

Every app submodule must follow this layout:

```
<app-name>/
├── index.html              # Entry point (standard HTML)
├── app.json                # Even Hub manifest (required for packaging)
├── package.json            # App dependencies and scripts
├── vite.config.ts          # Vite dev server config
├── tsconfig.json           # TypeScript config
├── .gitignore              # Ignores dist/, node_modules/, *.ehpk
├── src/
│   ├── main.ts             # App bootstrap — imports SDK and runs app logic
│   └── styles.css          # Minimal CSS (no frameworks by default)
└── server/                 # (Optional) Backend server if app needs one
    └── package.json        # Server dependencies (separate from app)
```

### Standard `package.json` (App)

```json
{
  "name": "<app-name>-even",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":   "vite --host 0.0.0.0 --port 5173",
    "build": "vite build",
    "qr":    "evenhub qr --http --port 5173",
    "pack":  "npm run build && evenhub pack app.json dist -o <app-name>.ehpk"
  },
  "dependencies": {
    "@evenrealities/even_hub_sdk": "^0.0.9"
  },
  "devDependencies": {
    "@evenrealities/evenhub-cli":       "^0.1.10",
    "@evenrealities/evenhub-simulator": "^0.6.2",
    "typescript": "^5.0.0",
    "vite":       "^6.0.0"
  }
}
```

### Standard `vite.config.ts`

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
})
```

### Standard `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### Standard `app.json` Manifest

```json
{
  "package_id": "com.plungarini.<appname>",
  "edition": "202601",
  "name": "<App Display Name>",
  "version": "1.0.0",
  "min_app_version": "0.1.0",
  "tagline": "Short one-line description",
  "description": "Longer description shown in the Even Hub portal.",
  "author": "Pietro Lungarini",
  "entrypoint": "index.html",
  "permissions": {
    "network": ["*"]
  }
}
```

**`package_id` rules:** reverse-domain format, all lowercase letters or numbers per segment, no hyphens. Valid: `com.plungarini.weather`. Invalid: `com.plungarini.my-weather`.

---

## Development Workflow (Per App)

### Local development

```bash
cd apps/<app-name>
npm install
npm run dev       # Starts Vite dev server at http://0.0.0.0:5173
npm run qr        # In another terminal — generates QR code to scan with iPhone
```

Scan the QR code with the Even App on your phone. The app loads on the glasses. Vite hot-reload works for code changes.

### Testing with simulator (no glasses needed)

The Even Hub Simulator runs in the browser and renders a fake G2 display.

```bash
# Option A: Via @evenrealities/evenhub-simulator (installed per-app)
# (check even-dev for integration instructions)

# Option B: Via even-dev (community tool)
git clone https://github.com/BxNxM/even-dev.git
cd even-dev && npm install
APP_PATH=../apps/<app-name> ./start-even.sh
```

### Packaging for distribution

```bash
npm run pack   # runs vite build then evenhub pack → outputs <app-name>.ehpk
```

The `.ehpk` file is for future submission to the Even Hub portal. Never commit `.ehpk` files.

---

## SDK Quick Reference

### Initialisation

```typescript
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'

const bridge = await waitForEvenAppBridge()
```

### Sending the startup page

```typescript
import {
  CreateStartUpPageContainer,
  TextContainerProperty,
} from '@evenrealities/even_hub_sdk'

const textContainer = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 288,
  borderWidth: 0,
  paddingLength: 8,
  containerID: 1,
  containerName: 'main',
  content: 'Hello G2!',
  isEventCapture: 1,
})

await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [textContainer],
  })
)
```

### Receiving input events

```typescript
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'

bridge.onEvenHubEvent((event) => {
  const type = event.textEvent?.eventType ?? event.sysEvent?.eventType
  // Note: CLICK_EVENT = 0 may arrive as undefined — always check both
  if (type === OsEventTypeList.CLICK_EVENT || type === undefined) {
    // handle click
  }
  if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    // handle scroll down / next page
  }
})
```

### Updating content without rebuild

```typescript
import { TextContainerUpgrade } from '@evenrealities/even_hub_sdk'

await bridge.textContainerUpgrade(new TextContainerUpgrade({
  containerID: 1,
  containerName: 'main',
  contentOffset: 0,
  contentLength: currentContent.length,
  content: newContent,
}))
```

### Detecting launch source (SDK v0.0.9+)

```typescript
// Distinguish whether app was launched from appMenu or glassesMenu
// (API shape TBD — check SDK changelog once v0.0.9 ships in types)
```

### IMU hardware control (SDK v0.0.9+)

```typescript
// Enable/disable IMU and listen for live orientation data
// IMU events arrive via onEvenHubEvent
// (Exact API shape TBD — monitor @evenrealities/even_hub_sdk changelog)
```

---

## Display Constraints (Critical)

| Property | Value |
|---|---|
| Canvas | 576 × 288 px per eye |
| Colour | 4-bit greyscale (16 shades of green) |
| Max containers per page | **12** (v0.0.9+, was 4) |
| Event-capture containers | Exactly **1** must have `isEventCapture: 1` |
| Text content limit (startup/rebuild) | 1000 chars |
| Text content limit (upgrade) | 2000 chars |
| Image max size | **288 × 144 px** (v0.0.9+, was 200 × 100) |
| Image min size | 20 × 20 px |
| Image format | PNG → 4-bit greyscale by host |
| List items max per container | 20 |
| textObject max items | **8** (v0.0.9+) |
| imageObject max items | **4** (v0.0.9+) |
| Concurrent image sends | Not allowed — queue sequentially |

See `docs/even-hub-research.md` for the full reference.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Submodule folder | kebab-case | `apps/weather-even` |
| GitHub repo name | `<name>-even` | `weather-even` |
| `package_id` | reverse-domain, no hyphens | `com.plungarini.weather` |
| TypeScript files | kebab-case | `weather-service.ts` |
| Classes | PascalCase | `WeatherService` |
| Functions/variables | camelCase | `fetchWeather` |

---

## Git Workflow (Per App)

Apps use **Git Flow**:

```bash
git flow init -d    # creates master + develop, sets prefixes
```

- `master` — production releases only
- `develop` — integration branch (day-to-day work)
- `feature/*` — new features
- `release/*` — release preparation
- `hotfix/*` — urgent fixes to master

The root repo tracks the `master` commit hash of each submodule.

---

## App Checklist (Before Considering an App Complete)

- [ ] Independent git repo with `git flow init -d` (`master` + `develop` branches)
- [ ] Pushed to GitHub with SSH remote
- [ ] Registered in root `even-apps/.gitmodules` with SSH URL
- [ ] `app.json` with valid `package_id` (reverse-domain, no hyphens)
- [ ] `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json` present
- [ ] `npm install` + `npm run dev` brings up a working dev server
- [ ] `npm run qr` generates a scannable QR code
- [ ] `npm run pack` produces a valid `.ehpk` file
- [ ] `.ehpk` and `dist/` are in `.gitignore`
- [ ] README.md in the app repo explains what it does and how to run it

---

## Updating SDK / CLI / Simulator

When a new version ships:

```bash
# Inside each app submodule
npm install @evenrealities/even_hub_sdk@latest
npm install -D @evenrealities/evenhub-cli@latest
npm install -D @evenrealities/evenhub-simulator@latest
```

Or pin to specific versions from the Discord release notes:

```bash
npm install @evenrealities/even_hub_sdk@^0.0.9
npm install -D @evenrealities/evenhub-cli@^0.1.10
npm install -D @evenrealities/evenhub-simulator@^0.6.2
```

---

## Resources

| Resource | URL |
|---|---|
| Even Hub Developer Portal | https://evenhub.evenrealities.com |
| Even Hub Discord (developer community) | https://discord.gg/GsuDkKDXDe |
| even_hub_sdk on npm | https://www.npmjs.com/package/@evenrealities/even_hub_sdk |
| evenhub-cli on npm | https://www.npmjs.com/package/@evenrealities/evenhub-cli |
| evenhub-simulator on npm | https://www.npmjs.com/package/@evenrealities/evenhub-simulator |
| even-dev simulator (community) | https://github.com/BxNxM/even-dev |
| G2 SDK reverse-engineering notes | https://github.com/nickustinov/even-g2-notes |
| Example: chess app | https://github.com/dmyster145/EvenChess |
| Example: reddit app | https://github.com/fuutott/rdt-even-g2-rddit-client |
| Example: weather app | https://github.com/nickustinov/weather-even-g2 |
| Example: tesla app | https://github.com/nickustinov/tesla-even-g2 |
| Deep research doc | ./docs/even-hub-research.md |

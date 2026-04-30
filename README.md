# even-apps

A monorepo of Even Hub apps for the [Even Realities Glasses](https://www.evenrealities.com) smart glasses platform.

Each app in `apps/` is an independent Git repository managed as a submodule. Apps are built with TypeScript + Vite and communicate with the G2 glasses via the Even Hub SDK.

## Structure

```
even-apps/
├── apps/          # Git submodule apps (one per Even Hub app)
├── docs/
│   └── even-hub-research.md   # Deep reference: SDK, UI model, lifecycle, packaging
├── scripts/
│   └── create-app.js          # Helper to scaffold a new app submodule
├── CLAUDE.md      # AI agent guide + submodule guidelines
└── README.md      # This file
```

## Cloning

```bash
# Clone with all submodule apps
git clone --recurse-submodules git@github.com:plungarini/even-apps.git

# Already cloned? Init submodules
git submodule update --init --recursive
```

## Adding a New App

Use [`create-app.js`](./scripts/create-app.js) to create a new app submodule.

## Development

Each app is developed independently:

```bash
cd apps/<app-name>
npm install
npm run dev    # Start Vite dev server
npm run qr     # Generate QR code to load on glasses
```

## Resources

- [Even Hub Developer Portal](https://evenhub.evenrealities.com)
- [Even Hub Discord](https://discord.gg/GsuDkKDXDe)
- [Community SDK Notes](https://github.com/nickustinov/even-g2-notes)
- [even-dev Simulator](https://github.com/BxNxM/even-dev)

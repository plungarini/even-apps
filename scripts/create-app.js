#!/usr/bin/env node
/**
 * Helper script to scaffold a new Even Hub app submodule.
 *
 * Usage:
 *   node scripts/create-app.js
 *   npm run create-app
 *
 * This script:
 *   1. Prompts for app name and GitHub user
 *   2. Scaffolds the full app directory with all required files
 *   3. Runs npm install
 *   4. Initializes git and prints submodule instructions
 *
 * Architecture:
 *   - Web UI (App.tsx)     uses even-toolkit/web      — UI components
 *   - Glasses HUD (pure TS) uses @evenrealities/even_hub_sdk directly
 *
 * The two layers run side-by-side: main.tsx side-effect-imports glasses-main.ts.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

// Non-interactive mode: `node create-app.js --name <n> [--user <u>] [--display <d>]`
const argv = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < argv.length; i++) {
	if (argv[i].startsWith('--')) {
		argMap[argv[i].slice(2)] = argv[i + 1];
		i++;
	}
}
const nonInteractive = Boolean(argMap.name);

const rl = nonInteractive ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => (nonInteractive ? Promise.resolve('') : new Promise((res) => rl.question(q, res)));

// ─── helpers ────────────────────────────────────────────────────────────────

function write(filePath, content) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, content, 'utf8');
	console.log('  created  ' + filePath);
}

function run(cmd, cwd) {
	execSync(cmd, { cwd, stdio: 'inherit' });
}

// ─── prompt ─────────────────────────────────────────────────────────────────

console.log('\n=== Even Apps — Add New App ===\n');

const name = (argMap.name || (await ask('App name (kebab-case, e.g. "weather"): '))).trim().toLowerCase();
const githubUser = argMap.user || (await ask('GitHub username (default: plungarini): ')).trim() || 'plungarini';
const defaultDisplay = name.replaceAll('-', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
const displayName =
	(argMap.display || (await ask('Display name (default: "' + defaultDisplay + '"): '))).trim() || defaultDisplay;
if (rl) rl.close();

// ─── derived values ──────────────────────────────────────────────────────────

const repoName = name + '-even';
const sshUrl = 'git@github.com:' + githubUser + '/' + repoName + '.git';
const appPath = 'apps/' + name;
const packageId = 'com.' + githubUser.replaceAll('-', '') + '.' + name.replaceAll('-', '');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const outDir = path.resolve(rootDir, appPath);

if (fs.existsSync(outDir)) {
	console.error('\n✗  Directory already exists: ' + outDir + '\n');
	process.exit(1);
}

console.log('\nScaffolding ' + appPath + '...\n');

// ─── package.json ────────────────────────────────────────────────────────────

write(
	path.join(outDir, 'package.json'),
	JSON.stringify(
		{
			name: repoName,
			private: true,
			type: 'module',
			scripts: {
				dev: 'vite --host 0.0.0.0 --port 5173',
				build: 'tsc && vite build',
				qr: 'node ../../scripts/qr.mjs',
				pack: 'npm run build && evenhub pack app.json dist -o ' + name + '.ehpk',
				emulator: 'npx evenhub-simulator http://localhost:5173/',
			},
			dependencies: {
				'@evenrealities/even_hub_sdk': '^0.0.10',
				'@evenrealities/pretext': '^0.1.4',
				'class-variance-authority': '^0.7.1',
				clsx: '^2.1.1',
				'even-toolkit': '^1.7.2',
				react: '^19.2.4',
				'react-dom': '^19.2.4',
				'react-router': '^7.13.2',
				'tailwind-merge': '^3.0.0',
			},
			devDependencies: {
				'@evenrealities/evenhub-cli': '^0.1.13',
				'@evenrealities/evenhub-simulator': '^0.7.3',
				'@tailwindcss/vite': '^4.2.4',
				'@types/node': '^25.5.0',
				'@types/react': '^19.2.14',
				'@types/react-dom': '^19.2.3',
				'@vitejs/plugin-react': '^6.0.1',
				tailwindcss: '^4.2.4',
				typescript: '~5.7.0',
				vite: '^8.0.10',
			},
		},
		null,
		2,
	) + '\n',
);

// ─── app.json ────────────────────────────────────────────────────────────────

write(
	path.join(outDir, 'app.json'),
	JSON.stringify(
		{
			package_id: packageId,
			name: displayName,
			version: '0.0.0',
			edition: '202601',
			entrypoint: 'index.html',
			description: displayName + ' app for Even Realities glasses',
			author: githubUser,
			permissions: [],
			supported_languages: ['en'],
			tagline: '',
			min_app_version: '2.1.1',
			min_sdk_version: '0.0.9',
		},
		null,
		2,
	) + '\n',
);

// ─── tsconfig.json ───────────────────────────────────────────────────────────

write(
	path.join(outDir, 'tsconfig.json'),
	JSON.stringify(
		{
			compilerOptions: {
				target: 'ES2020',
				useDefineForClassFields: true,
				lib: ['ES2020', 'DOM', 'DOM.Iterable'],
				module: 'ESNext',
				skipLibCheck: true,
				moduleResolution: 'bundler',
				allowImportingTsExtensions: true,
				resolveJsonModule: true,
				isolatedModules: true,
				noEmit: true,
				jsx: 'react-jsx',
				strict: true,
				noUnusedLocals: true,
				noUnusedParameters: true,
				noFallthroughCasesInSwitch: true,
				types: ['vite/client', 'node'],
			},
			include: ['src'],
			exclude: ['node_modules', 'dist'],
		},
		null,
		2,
	) + '\n',
);

// ─── vite.config.ts ──────────────────────────────────────────────────────────

write(
	path.join(outDir, 'vite.config.ts'),
	[
		"import { defineConfig } from 'vite';",
		"import react from '@vitejs/plugin-react';",
		"import tailwindcss from '@tailwindcss/vite';",
		'',
		'export default defineConfig({',
		'  plugins: [react(), tailwindcss()],',
		"  base: './',",
		'  server: {',
		'    host: true,',
		'    port: 5173,',
		'  },',
		'  build: {',
		"    outDir: 'dist',",
		'    emptyOutDir: true,',
		'    chunkSizeWarningLimit: 1000,',
		'  },',
		'});',
		'',
	].join('\n'),
);

// ─── index.html ──────────────────────────────────────────────────────────────

write(
	path.join(outDir, 'index.html'),
	[
		'<!doctype html>',
		'<html lang="en">',
		'  <head>',
		'    <meta charset="UTF-8" />',
		'    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
		'    <meta name="theme-color" content="#232323" />',
		'    <meta name="mobile-web-app-capable" content="yes" />',
		'    <meta name="apple-mobile-web-app-capable" content="yes" />',
		'    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
		'    <title>' + displayName + '</title>',
		'  </head>',
		'  <body>',
		'    <div id="root"></div>',
		'    <script type="module" src="/src/main.tsx"></script>',
		'  </body>',
		'</html>',
		'',
	].join('\n'),
);

// ─── src/main.tsx ─────────────────────────────────────────────────────────────
// Side-effect-imports glasses-main so the HUD bridge boots alongside the React UI.

write(
	path.join(outDir, 'src', 'main.tsx'),
	[
		"import { StrictMode } from 'react';",
		"import { createRoot } from 'react-dom/client';",
		"import App from './App';",
		"import './app.css';",
		"import './glasses-main';",
		'',
		"createRoot(document.getElementById('root')!).render(",
		'  <StrictMode>',
		'    <App />',
		'  </StrictMode>,',
		');',
		'',
	].join('\n'),
);

// ─── src/App.tsx ──────────────────────────────────────────────────────────────
// Web UI only. The HUD runs independently via glasses-main.ts.

write(
	path.join(outDir, 'src', 'App.tsx'),
	[
		"import { AppShell, Card } from 'even-toolkit/web';",
		'',
		'export default function App() {',
		'  return (',
		'    <AppShell>',
		'      <div className="px-3 pt-4 pb-8">',
		'        <Card>',
		'          <h1 className="text-lg font-semibold mb-2">' + displayName + '</h1>',
		'          <p className="text-[15px] text-text-dim">',
		'            Open the Even app on your phone to project this app onto the G2 glasses.',
		'          </p>',
		'        </Card>',
		'      </div>',
		'    </AppShell>',
		'  );',
		'}',
		'',
	].join('\n'),
);

// ─── src/app.css ─────────────────────────────────────────────────────────────

write(
	path.join(outDir, 'src', 'app.css'),
	[
		'@import "tailwindcss";',
		'@import "even-toolkit/web/theme-light.css";',
		'@import "even-toolkit/web/typography.css";',
		'@import "even-toolkit/web/utilities.css";',
		'',
	].join('\n'),
);

// ─── .gitignore ──────────────────────────────────────────────────────────────

write(
	path.join(outDir, '.gitignore'),
	[
		'# Dependencies',
		'node_modules/',
		'# Build output',
		'dist/',
		'# Even Hub package files',
		'*.ehpk',
		'# Environment variables',
		'.env',
		'# IDE',
		'.vscode/',
		'# OS',
		'.DS_Store',
		'Thumbs.db',
		'# Logs',
		'*.log',
		'',
	].join('\n'),
);

// ─── src/glasses/types.ts ────────────────────────────────────────────────────

write(
	path.join(outDir, 'src', 'glasses', 'types.ts'),
	[
		"import type { ImageContainerProperty } from '@evenrealities/even_hub_sdk';",
		'',
		'export interface HudTextDescriptor {',
		'  containerID: number;',
		'  containerName: string;',
		'  xPosition: number;',
		'  yPosition: number;',
		'  width: number;',
		'  height: number;',
		'  paddingLength?: number;',
		'  borderWidth?: number;',
		'  borderRadius?: number;',
		'  borderColor?: number;',
		'  isEventCapture?: number;',
		'}',
		'',
		'export interface HudLayoutDescriptor {',
		'  key: string;',
		'  textDescriptors: HudTextDescriptor[];',
		'  imageObject?: ImageContainerProperty[];',
		'}',
		'',
		'export interface HudRenderState {',
		'  layout: HudLayoutDescriptor;',
		'  textContents: Record<string, string>;',
		'}',
		'',
		'export interface HudViewState {',
		"  status: 'loading' | 'ready' | 'error';",
		'  now: Date;',
		'  message: string;',
		'  errorMessage?: string;',
		'}',
		'',
	].join('\n'),
);

// ─── src/glasses/utils.ts ────────────────────────────────────────────────────
// Layout instantiation + text alignment helpers (centerLine, alignRow, alignThree).

write(
	path.join(outDir, 'src', 'glasses', 'utils.ts'),
	[
		"import { TextContainerProperty } from '@evenrealities/even_hub_sdk';",
		"import { getTextWidth } from '@evenrealities/pretext';",
		"import type { HudLayoutDescriptor } from './types';",
		'',
		'const CONTAINER_CONTENT_LIMIT = 950;',
		"const SPACE_WIDTH = getTextWidth(' ') || 5;",
		'',
		'export function truncate(value: string, maxLength: number): string {',
		'  if (value.length <= maxLength) return value;',
		'  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;',
		'}',
		'',
		'export function instantiateLayout(layout: HudLayoutDescriptor, textContents: Record<string, string>) {',
		'  return {',
		'    containerTotalNum: layout.textDescriptors.length + (layout.imageObject?.length ?? 0),',
		'    textObject: layout.textDescriptors.map(',
		'      (descriptor) =>',
		'        new TextContainerProperty({',
		'          ...descriptor,',
		"          content: truncate(textContents[descriptor.containerName] ?? ' ', CONTAINER_CONTENT_LIMIT),",
		'        }),',
		'    ),',
		'    imageObject: layout.imageObject,',
		'  };',
		'}',
		'',
		'function spacesForPx(targetPx: number): string {',
		"  if (targetPx <= 0) return '';",
		"  return ' '.repeat(Math.floor(targetPx / SPACE_WIDTH));",
		'}',
		'',
		'export function alignRow(left: string, right: string, innerWidthPx: number): string {',
		'  const available = innerWidthPx - getTextWidth(left) - getTextWidth(right) - 4;',
		'  if (available <= 0) return `${left} ${right}`;',
		'  return `${left}${spacesForPx(available)}${right}`;',
		'}',
		'',
		'export function alignThree(left: string, center: string, right: string, innerWidthPx: number): string {',
		'  const leftWidth = getTextWidth(left);',
		'  const centerWidth = getTextWidth(center);',
		'  const rightWidth = getTextWidth(right);',
		'  const centerStart = Math.max(0, Math.floor((innerWidthPx - centerWidth) / 2));',
		'  const leftEnd = leftWidth + 4;',
		'  const rightStart = Math.max(centerStart + centerWidth + 4, innerWidthPx - rightWidth);',
		'',
		'  if (leftEnd >= centerStart || centerStart + centerWidth >= rightStart) {',
		'    return alignRow(`${left} ${center}`, right, innerWidthPx);',
		'  }',
		'',
		'  const gapAfterLeft = centerStart - leftEnd;',
		'  const gapAfterCenter = rightStart - (centerStart + centerWidth);',
		'  return `${left}${spacesForPx(gapAfterLeft)}${center}${spacesForPx(gapAfterCenter)}${right}`;',
		'}',
		'',
		'export function centerLine(text: string, innerWidthPx: number): string {',
		'  const leftPx = Math.max(0, (innerWidthPx - getTextWidth(text) - 4) / 2);',
		'  return `${spacesForPx(leftPx)}${text}`;',
		'}',
		'',
	].join('\n'),
);

// ─── src/glasses/view.ts ─────────────────────────────────────────────────────
// Layout descriptor + renderer for the HUD page.

write(
	path.join(outDir, 'src', 'glasses', 'view.ts'),
	[
		"import type { HudLayoutDescriptor, HudRenderState, HudViewState } from './types';",
		"import { centerLine } from './utils';",
		'',
		'const HUD_WIDTH = 576;',
		'const BODY_WIDTH = 544;',
		'const BORDER_RADIUS = 12;',
		'',
		'const TEXT_LAYOUT: HudLayoutDescriptor = {',
		"  key: 'main',",
		'  textDescriptors: [',
		'    {',
		'      containerID: 1,',
		"      containerName: 'header',",
		'      xPosition: 12,',
		'      yPosition: 0,',
		'      width: HUD_WIDTH - 24,',
		'      height: 40,',
		'      paddingLength: 4,',
		'    },',
		'    {',
		'      containerID: 2,',
		"      containerName: 'body',",
		'      xPosition: 0,',
		'      yPosition: 38,',
		'      width: HUD_WIDTH,',
		'      height: 212,',
		'      paddingLength: 15,',
		'      borderWidth: 1,',
		'      borderColor: 13,',
		'      borderRadius: BORDER_RADIUS,',
		'      isEventCapture: 1,',
		'    },',
		'    {',
		'      containerID: 3,',
		"      containerName: 'footer',",
		'      xPosition: 12,',
		'      yPosition: 251,',
		'      width: HUD_WIDTH - 24,',
		'      height: 35,',
		'      paddingLength: 4,',
		'    },',
		'  ],',
		'};',
		'',
		'export function createInitialHudState(): HudViewState {',
		'  return {',
		"    status: 'loading',",
		'    now: new Date(),',
		"    message: '',",
		'  };',
		'}',
		'',
		'export function setHudReady(state: HudViewState, message: string): HudViewState {',
		"  return { ...state, status: 'ready', now: new Date(), message };",
		'}',
		'',
		'export function setHudError(state: HudViewState, errorMessage: string): HudViewState {',
		"  return { ...state, status: 'error', now: new Date(), errorMessage };",
		'}',
		'',
		'export function touchHudClock(state: HudViewState): HudViewState {',
		'  return { ...state, now: new Date() };',
		'}',
		'',
		'export function toHudRenderState(state: HudViewState): HudRenderState {',
		"  if (state.status === 'loading') {",
		'    return {',
		'      layout: TEXT_LAYOUT,',
		'      textContents: {',
		"        header: centerLine('" + displayName + "', BODY_WIDTH),",
		"        body: `\\n${centerLine('Loading…', BODY_WIDTH)}`,",
		"        footer: '',",
		'      },',
		'    };',
		'  }',
		'',
		"  if (state.status === 'error') {",
		'    return {',
		'      layout: TEXT_LAYOUT,',
		'      textContents: {',
		"        header: centerLine('" + displayName + "', BODY_WIDTH),",
		"        body: `\\n${centerLine('Something went wrong', BODY_WIDTH)}\\n\\n${state.errorMessage ?? ''}`,",
		"        footer: centerLine('Double tap to exit', BODY_WIDTH),",
		'      },',
		'    };',
		'  }',
		'',
		'  return {',
		'    layout: TEXT_LAYOUT,',
		'    textContents: {',
		"      header: centerLine('" + displayName + "', BODY_WIDTH),",
		'      body: `\\n${centerLine(state.message, BODY_WIDTH)}`,',
		"      footer: centerLine('Double tap to exit', BODY_WIDTH),",
		'    },',
		'  };',
		'}',
		'',
	].join('\n'),
);

// ─── src/glasses/session.ts ──────────────────────────────────────────────────
// Wraps the bridge: createStartUpPage on first render, textContainerUpgrade on
// subsequent renders, rebuildPage when the layout key changes.

write(
	path.join(outDir, 'src', 'glasses', 'session.ts'),
	[
		'import {',
		'  CreateStartUpPageContainer,',
		'  RebuildPageContainer,',
		'  StartUpPageCreateResult,',
		'  TextContainerUpgrade,',
		'  type EvenAppBridge,',
		"} from '@evenrealities/even_hub_sdk';",
		"import type { HudRenderState } from './types';",
		"import { instantiateLayout } from './utils';",
		'',
		'export class HudSession {',
		'  private pageCreated = false;',
		'  private activeLayoutKey: string | null = null;',
		'  private lastContents: Record<string, string> = {};',
		'',
		'  constructor(private readonly bridge: EvenAppBridge) {}',
		'',
		'  async render(next: HudRenderState): Promise<void> {',
		'    const params = instantiateLayout(next.layout, next.textContents);',
		'',
		'    if (!this.pageCreated) {',
		'      let created: StartUpPageCreateResult;',
		'      try {',
		'        created = await this.bridge.createStartUpPageContainer(new CreateStartUpPageContainer(params));',
		'      } catch {',
		'        return;',
		'      }',
		'',
		'      if (created === StartUpPageCreateResult.success) {',
		'        this.pageCreated = true;',
		'        this.activeLayoutKey = next.layout.key;',
		'        this.lastContents = { ...next.textContents };',
		'        return;',
		'      }',
		'',
		'      const takeover = await this.bridge.rebuildPageContainer(new RebuildPageContainer(params));',
		'      if (takeover) {',
		'        this.pageCreated = true;',
		'        this.activeLayoutKey = next.layout.key;',
		'        this.lastContents = { ...next.textContents };',
		'      }',
		'      return;',
		'    }',
		'',
		'    if (this.activeLayoutKey !== next.layout.key) {',
		'      const ok = await this.bridge.rebuildPageContainer(new RebuildPageContainer(params));',
		'      if (!ok) return;',
		'      this.activeLayoutKey = next.layout.key;',
		'      this.lastContents = {};',
		'    }',
		'',
		'    for (const descriptor of next.layout.textDescriptors) {',
		"      const content = next.textContents[descriptor.containerName] ?? '';",
		'      if (this.lastContents[descriptor.containerName] === content) continue;',
		'      const previousLength = this.lastContents[descriptor.containerName]?.length ?? 0;',
		'      const ok = await this.bridge.textContainerUpgrade(',
		'        new TextContainerUpgrade({',
		'          containerID: descriptor.containerID,',
		'          containerName: descriptor.containerName,',
		'          contentOffset: 0,',
		'          contentLength: Math.max(previousLength, content.length),',
		'          content,',
		'        }),',
		'      );',
		'      if (ok) this.lastContents[descriptor.containerName] = content;',
		'    }',
		'  }',
		'}',
		'',
	].join('\n'),
);

// ─── src/glasses-main.ts ─────────────────────────────────────────────────────
// Pure-TS HUD entry point. Side-effect imported by main.tsx.
// Wires gestures: DOUBLE_CLICK → shutDownPageContainer(1) (exits the app).

write(
	path.join(outDir, 'src', 'glasses-main.ts'),
	[
		"import { OsEventTypeList, type EvenHubEvent, waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';",
		"import { HudSession } from './glasses/session';",
		"import type { HudViewState } from './glasses/types';",
		'import {',
		'  createInitialHudState,',
		'  setHudReady,',
		'  toHudRenderState,',
		'  touchHudClock,',
		"} from './glasses/view';",
		'',
		'let state: HudViewState = createInitialHudState();',
		'let bridgeRef: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;',
		'let session: HudSession | null = null;',
		'',
		'function resolveEventType(event: EvenHubEvent) {',
		'  return event.textEvent?.eventType ?? event.sysEvent?.eventType ?? event.listEvent?.eventType;',
		'}',
		'',
		'async function render(): Promise<void> {',
		'  if (!session) return;',
		'  await session.render(toHudRenderState(state));',
		'}',
		'',
		'async function handleEvent(event: EvenHubEvent): Promise<void> {',
		'  if (!bridgeRef) return;',
		'  const type = resolveEventType(event);',
		'',
		'  // Double tap → shut down the HUD page (returns user to the Even app menu).',
		'  if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {',
		'    await bridgeRef.shutDownPageContainer(1);',
		'    return;',
		'  }',
		'',
		'  // Single click / undefined (CLICK_EVENT === 0 sometimes arrives as undefined).',
		'  if (type === OsEventTypeList.CLICK_EVENT || type === undefined) {',
		'    state = touchHudClock(state);',
		'    await render();',
		'  }',
		'}',
		'',
		'async function boot(): Promise<void> {',
		'  try {',
		"    console.log('[GlassesMain] waiting for Even bridge...');",
		'    bridgeRef = await waitForEvenAppBridge();',
		"    console.log('[GlassesMain] bridge acquired');",
		'',
		'    session = new HudSession(bridgeRef);',
		'    bridgeRef.onEvenHubEvent((event) => {',
		'      void handleEvent(event);',
		'    });',
		'',
		"    state = setHudReady(state, 'Hello from " + displayName + "');",
		'    await render();',
		'',
		'    // Tick once a minute to keep any time-sensitive content fresh.',
		'    window.setInterval(() => {',
		'      state = touchHudClock(state);',
		'      void render();',
		'    }, 60_000);',
		'  } catch (error) {',
		"    console.warn('[GlassesMain] bridge unavailable — running in web-only mode', error);",
		'  }',
		'}',
		'',
		'void boot();',
		'',
	].join('\n'),
);

// ─── README.md ───────────────────────────────────────────────────────────────

write(
	path.join(outDir, 'README.md'),
	[
		'# ' + displayName,
		'',
		'Even Realities G2 glasses app.',
		'',
		'## Architecture',
		'',
		'Two layers run side-by-side in the same Vite bundle:',
		'',
		'- **Web UI** (`src/App.tsx`) — built with [even-toolkit](https://www.npmjs.com/package/even-toolkit) (`even-toolkit/web`). Renders inside the iPhone WebView.',
		'- **Glasses HUD** (`src/glasses-main.ts` + `src/glasses/*`) — pure TypeScript using the **official `@evenrealities/even_hub_sdk`** directly. No framework, no toolkit. Side-effect-imported from `main.tsx`.',
		'',
		'## Structure',
		'',
		'```',
		'src/',
		'  main.tsx              — React entry; side-effect-imports glasses-main',
		'  App.tsx               — Web UI (even-toolkit/web)',
		'  app.css               — Tailwind + even-toolkit theme imports',
		'  glasses-main.ts       — HUD bootstrap (bridge + event loop)',
		'  glasses/',
		'    types.ts            — Layout + view state types',
		'    utils.ts            — Text alignment helpers (centerLine, alignRow, alignThree)',
		'    view.ts             — Layout descriptor + render state builder',
		'    session.ts          — Bridge wrapper (page create / rebuild / upgrade)',
		'```',
		'',
		'## Gestures',
		'',
		'- **Single click** — refresh / advance (current scaffold just touches the clock)',
		'- **Double click** — `bridge.shutDownPageContainer(1)` exits the HUD',
		'',
		'## Dev',
		'',
		'```bash',
		'npm run dev      # vite dev server at 0.0.0.0:5173',
		'npm run qr       # QR code to load on your phone',
		'npm run emulator # browser-based G2 simulator',
		'npm run build    # production build',
		'npm run pack     # build + package as .ehpk for Even Hub',
		'```',
	].join('\n'),
);

// ─── npm install ─────────────────────────────────────────────────────────────

console.log('\nRunning npm install...\n');
try {
	run('npm install', outDir);
} catch {
	console.warn('\n⚠  npm install failed — you may need to run it manually.\n');
}

// ─── git init ────────────────────────────────────────────────────────────────

console.log('\nInitializing git repo...\n');
try {
	run('git init', outDir);
	run('git add .', outDir);
	run('git commit -m "core: initial scaffold"', outDir);
} catch {
	console.warn('\n⚠  git init/commit failed — run manually if needed.\n');
}

try {
	run('git flow init -d', outDir);
} catch {
	console.warn('\n⚠  git flow init failed — install git-flow or run manually.\n');
}

// ─── done ────────────────────────────────────────────────────────────────────

console.log(
	[
		'',
		'✓ App scaffolded at ' + appPath,
		'',
		'Next steps:',
		'',
		'1. Create the GitHub repo and push:',
		'   cd ' + appPath,
		'   gh repo create ' + githubUser + '/' + repoName + ' --public --source=. --remote=origin --push',
		'   git push -u origin develop',
		'',
		'2. Register as a submodule (from even-apps root):',
		'   git submodule add ' + sshUrl + ' ' + appPath,
		'   git add .gitmodules ' + appPath,
		'   git commit -m "feat(submodules): add ' + name + ' as submodule"',
		'',
	].join('\n'),
);

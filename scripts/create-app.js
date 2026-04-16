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
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

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

const name = (await ask('App name (kebab-case, e.g. "weather"): ')).trim().toLowerCase();
const githubUser = (await ask('GitHub username (default: plungarini): ')).trim() || 'plungarini';
const defaultDisplay = name.replaceAll('-', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
const displayName = (await ask('Display name (default: "' + defaultDisplay + '"): ')).trim() || defaultDisplay;
rl.close();

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
			version: '0.0.0',
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
				'class-variance-authority': '^0.7.1',
				clsx: '^2.1.1',
				'even-toolkit': '^1.5.0',
				react: '^19.2.4',
				'react-dom': '^19.2.4',
				'react-router': '^7.13.2',
				'tailwind-merge': '^3.0.0',
				'upng-js': '^2.1.0',
			},
			devDependencies: {
				'@evenrealities/even_hub_sdk': '^0.0.9',
				'@evenrealities/evenhub-cli': '^0.1.11',
				'@evenrealities/evenhub-simulator': '^0.6.2',
				'@tailwindcss/vite': '^4.2.2',
				'@types/node': '^25.5.0',
				'@types/react': '^19.2.14',
				'@types/react-dom': '^19.2.3',
				'@vitejs/plugin-react': '^6.0.1',
				tailwindcss: '^4.2.2',
				typescript: '~5.0.0',
				vite: '^8.0.3',
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
		'    rolldownOptions: {',
		'      output: {',
		'        codeSplitting: {',
		'          groups: [',
		"            { name: 'react', test: /node_modules[\\\\/]react/, priority: 20 },",
		"            { name: 'vendor', test: /node_modules/, priority: 10 },",
		'          ],',
		'        },',
		'      },',
		'    },',
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

write(
	path.join(outDir, 'src', 'main.tsx'),
	[
		"import { StrictMode } from 'react';",
		"import { createRoot } from 'react-dom/client';",
		"import { HashRouter } from 'react-router';",
		"import App from './App';",
		"import './app.css';",
		'',
		"createRoot(document.getElementById('root')!).render(",
		'  <StrictMode>',
		'    <HashRouter>',
		'      <App />',
		'    </HashRouter>',
		'  </StrictMode>,',
		');',
		'',
	].join('\n'),
);

// ─── src/App.tsx ──────────────────────────────────────────────────────────────

write(
	path.join(outDir, 'src', 'App.tsx'),
	[
		"import { useState } from 'react';",
		"import { AppShell, NavBar, ScreenHeader, Card } from 'even-toolkit/web';",
		"import type { NavItem } from 'even-toolkit/web';",
		"import { AppGlasses } from './glasses/AppGlasses';",
		"import type { AppSnapshot } from './glasses/shared';",
		'',
		'const tabs: NavItem[] = [',
		"  { id: 'home', label: 'Home' },",
		"  { id: 'settings', label: 'Settings' },",
		'];',
		'',
		'export default function App() {',
		"  const [tab, setTab] = useState('home');",
		'',
		'  const snapshot: AppSnapshot = {',
		"    message: 'Hello from " + displayName + "',",
		'  };',
		'',
		'  return (',
		'    <>',
		'      <AppGlasses snapshot={snapshot} />',
		'      <AppShell header={<NavBar items={tabs} activeId={tab} onNavigate={setTab} />}>',
		'        <div className="px-3 pt-4 pb-8">',
		'          <ScreenHeader title="' + displayName + '" />',
		'          <Card>',
		'            <p className="text-[15px] text-text-dim">',
		'              Hello from ' + displayName + '!',
		'            </p>',
		'          </Card>',
		'        </div>',
		'      </AppShell>',
		'    </>',
		'  );',
		'}',
		'',
	].join('\n'),
);

// ─── src/app.css ─────────────────────────────────────────────────────────────

// Tailwind v4: @import "tailwindcss" is the only config needed when using
// the @tailwindcss/vite plugin. No tailwind.config.js required.
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
		'# Dependencies\nnode_modules/',
		'# Build output\ndist/',
		'# Even Hub package files\n*.ehpk',
		'# Environment variables\n.env',
		'# IDE\n.vscode/',
		'# OS\n.DS_Store\nThumbs.db',
		'# Logs\n*.log',
	].join('\n'),
);

// ─── src/glasses/shared.ts ─────────────────────────────────────────────────────

write(
	path.join(outDir, 'src', 'glasses', 'shared.ts'),
	[
		'// shared.ts — Global snapshot type for this app.',
		'// All glass screens read from AppSnapshot.',
		'// GlassAction (from even-toolkit/types) is the standard gesture type — no need to redefine it.',
		'',
		'export interface AppSnapshot {',
		'  message: string;',
		'}',
	].join('\n'),
);

// ─── src/glasses/screens/home/HomeView.ts ──────────────────────────────────────

write(
	path.join(outDir, 'src', 'glasses', 'screens', 'home', 'HomeView.ts'),
	[
		'// HomeView.ts — Pure display function for the home screen.',
		'// Receives pre-processed HomeViewData, returns DisplayData for the glasses.',
		'// No logic, no snapshot access, no side effects — only rendering (the component template).',
		'',
		"import { buildScrollableContent } from 'even-toolkit/glass-display-builders';",
		"import { buildStaticActionBar } from 'even-toolkit/action-bar';",
		"import type { DisplayData } from 'even-toolkit/types';",
		'',
		'export interface HomeViewData {',
		'  message: string;',
		'  scrollPos: number;',
		'}',
		'',
		'export function renderHomeView(data: HomeViewData): DisplayData {',
		'  return buildScrollableContent({',
		"    title: 'Home',",
		"    actionBar: buildStaticActionBar(['Select'], 0),",
		'    contentLines: [data.message],',
		'    scrollPos: data.scrollPos,',
		'  });',
		'}',
	].join('\n'),
);

// ─── src/glasses/screens/home/home.ts ──────────────────────────────────────────

write(
	path.join(outDir, 'src', 'glasses', 'screens', 'home', 'home.ts'),
	[
		'// home.ts — Logic container for the home screen (the component class).',
		'// Owns the GlassScreen: action handling and data derivation.',
		'// Delegates all rendering to HomeView — no display logic lives here.',
		'// Nav state uses GlassNavState.highlightedIndex as the scroll position.',
		'',
		"import type { GlassScreen } from 'even-toolkit/glass-screen-router';",
		"import { moveHighlight, calcMaxScroll } from 'even-toolkit/glass-nav';",
		"import { DEFAULT_CONTENT_SLOTS } from 'even-toolkit/glass-display-builders';",
		"import { renderHomeView } from './HomeView';",
		"import type { AppSnapshot } from '../../shared';",
		'',
		'// C = void: this screen has no side-effect context (no navigate, no external actions).',
		'export const homeScreen: GlassScreen<AppSnapshot, void> = {',
		'  display(snapshot, nav) {',
		'    return renderHomeView({',
		'      message: snapshot.message,',
		'      scrollPos: nav.highlightedIndex,',
		'    });',
		'  },',
		'',
		'  action(action, nav, snapshot) {',
		'    const maxScroll = calcMaxScroll([snapshot.message].length, DEFAULT_CONTENT_SLOTS);',
		"    if (action.type === 'HIGHLIGHT_MOVE') {",
		'      return { ...nav, highlightedIndex: moveHighlight(nav.highlightedIndex, action.direction, maxScroll) };',
		'    }',
		'    return nav;',
		'  },',
		'};',
	].join('\n'),
);

// ─── src/glasses/selectors.ts ──────────────────────────────────────────────────

write(
	path.join(outDir, 'src', 'glasses', 'selectors.ts'),
	[
		'// selectors.ts — Screen router wiring.',
		'// Maps route keys to GlassScreen instances. To add a screen: import it and add it here.',
		"// onGlassAction is wrapped to drop the ctx param (void screens don't need it),",
		'// matching the 3-arg signature useGlasses expects.',
		'',
		"import { createGlassScreenRouter } from 'even-toolkit/glass-screen-router';",
		"import type { GlassAction, GlassNavState } from 'even-toolkit/types';",
		"import { homeScreen } from './screens/home/home';",
		"import type { AppSnapshot } from './shared';",
		'',
		'const { toDisplayData, onGlassAction: _onGlassAction } =',
		"  createGlassScreenRouter<AppSnapshot, void>({ home: homeScreen }, 'home');",
		'',
		'export { toDisplayData };',
		'',
		'// Wrap to match useGlasses signature: (action, nav, snapshot) => GlassNavState',
		'export const onGlassAction = (',
		'  action: GlassAction,',
		'  nav: GlassNavState,',
		'  snapshot: AppSnapshot,',
		'): GlassNavState => _onGlassAction(action, nav, snapshot, undefined);',
	].join('\n'),
);

// ─── src/glasses/splash.ts ─────────────────────────────────────────────────────

write(
	path.join(outDir, 'src', 'glasses', 'splash.ts'),
	[
		'// splash.ts — Splash screen shown on glasses while the app is loading.',
		'// createSplash takes a render callback that draws on a canvas context.',
		'',
		"import { createSplash } from 'even-toolkit/splash';",
		'',
		'export const appSplash = createSplash({',
		'  render: (ctx, w, h) => {',
		"    ctx.fillStyle = '#ffffff';",
		"    ctx.font = 'bold 14px monospace';",
		"    ctx.textAlign = 'center';",
		"    ctx.textBaseline = 'middle';",
		"    ctx.fillText('" + displayName + "', w / 2, h / 2);",
		'  },',
		'  tiles: 1,',
		'  minTimeMs: 1500,',
		'});',
	].join('\n'),
);

// ─── src/glasses/AppGlasses.tsx ────────────────────────────────────────────────

write(
	path.join(outDir, 'src', 'glasses', 'AppGlasses.tsx'),
	[
		'// AppGlasses.tsx — The single React component owning the glasses connection.',
		'// Mount once at the app root. Reads route + snapshot, sends display to glasses.',
		'// useGlasses returns void — it manages the connection lifecycle internally.',
		'// Renders nothing visible in the web UI.',
		'',
		"import { useCallback } from 'react';",
		"import { useGlasses } from 'even-toolkit/useGlasses';",
		"import { toDisplayData, onGlassAction } from './selectors';",
		"import { appSplash } from './splash';",
		"import type { AppSnapshot } from './shared';",
		'',
		'interface Props {',
		'  snapshot: AppSnapshot;',
		'}',
		'',
		'export function AppGlasses({ snapshot }: Props) {',
		'  // Wrap snapshot in a stable getter so the hook always reads the latest value.',
		'  const getSnapshot = useCallback(() => snapshot, [snapshot]);',
		'',
		'  useGlasses({',
		'    getSnapshot,',
		'    toDisplayData,',
		'    onGlassAction,',
		"    deriveScreen: () => 'home',",
		"    appName: '" + displayName + "',",
		'    splash: appSplash,',
		'  });',
		'',
		'  return null;',
		'}',
	].join('\n'),
);

// ─── README.md ───────────────────────────────────────────────────────────────

write(
	path.join(outDir, 'README.md'),
	[
		'# ' + displayName,
		'',
		'Even Realities glasses app built with [even-toolkit](https://github.com/fabioglimb/even-toolkit).',
		'',
		'## Structure',
		'',
		'```',
		'src/',
		'  glasses/                  — Glasses display layer',
		'    shared.ts               — AppSnapshot + AppActions types',
		'    selectors.ts            — Screen router wiring',
		'    splash.ts               — Splash screen',
		'    AppGlasses.tsx          — Glasses connection component (mount at root)',
		'    screens/',
		'      {page}/                 — Screen',
		'        {page}.ts             — Logic container (component class)',
		'        {Page}View.ts         — Pure display function (component template)',
		'  App.tsx                   — Web UI root',
		'  main.tsx                  — Entry point',
		'  app.css                   — Tailwind + even-toolkit theme imports',
		'```',
		'',
		'## Dev',
		'',
		'```bash',
		'npm run dev      # start dev server at localhost:5173',
		'npm run build    # production build',
		'npm run pack     # build + package as .ehpk for Even Hub',
		'npm run qr       # show QR code for sideloading',
		'```',
		'',
		'## Adding a screen',
		'',
		'1. Create `src/glasses/screens/<name>/` with `<name>.ts` (logic) and `<Name>View.ts` (display)',
		'2. Register it in `src/glasses/selectors.ts`',
		'3. Add a route pattern to `deriveScreen` in `AppGlasses.tsx`',
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
	run('git flow init -d', outDir);
	run('git rm -r --cached ' + appPath, rootDir);
} catch {
	console.warn('\n⚠  git init/commit failed — run manually if needed.\n');
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

#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, stderr, exit, argv, env } from 'node:process';
import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const rootDir = process.cwd();
const appsDir = path.join(rootDir, 'apps');
const simHost = env.SIM_HOST ?? '127.0.0.1';
const port = Number(env.PORT ?? '5173');
const url = env.URL ?? `http://${simHost}:${port}/`;

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function printUsage() {
	console.log(`Usage:
  npm run emulator -- <app-name>
  npm run emulator -- --list

Environment variables:
  APP_NAME   App folder to run when no positional argument is provided
  PORT       Vite port (default: 5173)
  SIM_HOST   Host passed to the simulator URL (default: 127.0.0.1)
  URL        Full simulator URL override
`);
}

async function pathExists(targetPath) {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function listApps() {
	const entries = await readdir(appsDir, { withFileTypes: true });
	const appNames = [];

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith('.')) {
			continue;
		}

		const appDir = path.join(appsDir, entry.name);
		const hasIndex = await pathExists(path.join(appDir, 'index.html'));
		const hasPackageJson = await pathExists(path.join(appDir, 'package.json'));

		if (hasIndex && hasPackageJson) {
			appNames.push(entry.name);
		}
	}

	return appNames.sort((a, b) => a.localeCompare(b));
}

async function pickAppInteractively(appNames) {
	const rl = createInterface({ input: stdin, output: stdout });

	try {
		console.log('Available apps:');
		appNames.forEach((name, index) => {
			console.log(`  ${index + 1}. ${name}`);
		});

		const answer = await rl.question('Select app number: ');
		const index = Number(answer);

		if (!Number.isInteger(index) || index < 1 || index > appNames.length) {
			throw new Error(`Invalid app selection: ${answer || '(empty)'}`);
		}

		return appNames[index - 1];
	} finally {
		rl.close();
	}
}

function spawnCommand(command, args, options = {}) {
	if (process.platform === 'win32') {
		const quoteWindowsArg = (value) => {
			if (value.length === 0) {
				return '""';
			}

			if (!/[\s"]/u.test(value)) {
				return value;
			}

			return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, '$1$1')}"`;
		};

		return spawn('cmd.exe', ['/d', '/s', '/c', [command, ...args].map(quoteWindowsArg).join(' ')], {
			stdio: 'inherit',
			shell: false,
			...options,
		});
	}

	return spawn(command, args, {
		stdio: 'inherit',
		shell: false,
		...options,
	});
}

function waitForServer(targetUrl, timeoutMs = 30000) {
	const startedAt = Date.now();

	return new Promise((resolve, reject) => {
		const attempt = () => {
			const request = http.get(targetUrl, (response) => {
				response.resume();
				resolve();
			});

			request.on('error', () => {
				if (Date.now() - startedAt >= timeoutMs) {
					reject(new Error(`Timed out waiting for ${targetUrl}`));
					return;
				}

				setTimeout(attempt, 500);
			});
		};

		attempt();
	});
}

async function main() {
	const args = argv.slice(2);

	if (args.includes('--help') || args.includes('-h')) {
		printUsage();
		return;
	}

	const appNames = await listApps();
	if (appNames.length === 0) {
		throw new Error('No runnable apps found under apps/.');
	}

	if (args.includes('--list')) {
		appNames.forEach((appName) => console.log(appName));
		return;
	}

	const appArg = args.find((value) => !value.startsWith('-')) ?? env.APP_NAME ?? '';
	const selectedApp = appArg || (appNames.length === 1 ? appNames[0] : await pickAppInteractively(appNames));

	if (!appNames.includes(selectedApp)) {
		throw new Error(`Unknown app "${selectedApp}". Available apps: ${appNames.join(', ')}`);
	}

	const appDir = path.join(appsDir, selectedApp);
	const hasServerDir = await pathExists(path.join(appDir, 'server', 'package.json'));
	if (hasServerDir) {
		console.warn(`Warning: ${selectedApp} includes server/. Make sure any required backend is already running before launching the simulator.`);
	}

	console.log(`Launching simulator for ${selectedApp} using ${url}`);
	console.log('Checking that the app dev server is already reachable...');
	await waitForServer(url);

	console.log('Launching Even Hub Simulator...');
	const simulator = spawnCommand(npxCmd, ['evenhub-simulator', url], { cwd: appDir });

	const simulatorCode = await new Promise((resolve, reject) => {
		simulator.once('error', reject);
		simulator.once('exit', (code, signal) => {
			if (signal) {
				resolve(1);
				return;
			}
			resolve(code ?? 0);
		});
	});

	exit(simulatorCode);
}

main().catch((error) => {
	console.error(error.message);
	exit(1);
});

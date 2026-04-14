#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const ip = Object.values(networkInterfaces())
	.flat()
	.find((i) => i.family === 'IPv4' && !i.internal)?.address;

if (!ip) {
	console.error('no LAN IP found');
	process.exit(1);
}

const port = 5173;
const url = `http://${ip}:${port}`;

console.log(`running: evenhub qr --url ${url}`);
console.warn('warning: this helper emits an HTTP URL. iPhone webviews may block geolocation on insecure origins, so GPS-heavy apps like CarNav often need HTTPS, a secure tunnel, or a packaged build.');
execSync(`npx evenhub qr --url ${url}`, { stdio: 'inherit' });

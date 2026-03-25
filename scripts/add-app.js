#!/usr/bin/env node
/**
 * Helper script to scaffold a new Even Hub app submodule.
 *
 * Usage:
 *   node scripts/add-app.js
 *   npm run add-app
 *
 * This script:
 *   1. Prompts for the app name
 *   2. Prints the exact commands to run to add the app as a submodule
 *
 * The actual submodule add must be done manually (requires GitHub repo to exist first).
 */

import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

console.log('\n=== Even Apps — Add New App ===\n');

const name = (await ask('App name (kebab-case, e.g. "weather"): ')).trim().toLowerCase();
const githubUser = (await ask('GitHub username (default: plungarini): ')).trim() || 'plungarini';
rl.close();

const repoName = `${name}-even`;
const sshUrl = `git@github.com:${githubUser}/${repoName}.git`;
const appPath = `apps/${name}`;

console.log(`
Steps to add "${name}" as a submodule:

1. Create and push the GitHub repo (run inside the new app directory):
   git init
   git flow init -d
   git push -u origin master
   gh repo create ${githubUser}/${repoName} --public --source=. --remote=origin --push
   git push -u origin develop

2. From the even-apps root, register as a submodule:
   git submodule add ${sshUrl} ${appPath}
   git add .gitmodules ${appPath}
   git commit -m "feat: add ${name} as submodule"

3. Standard packages to install inside the app:
   npm install @evenrealities/even_hub_sdk@^0.0.9
   npm install -D @evenrealities/evenhub-cli@^0.1.10
   npm install -D @evenrealities/evenhub-simulator@^0.6.2
   npm install -D typescript vite

4. Required files in the app root:
   - index.html
   - app.json  (package_id: "com.${githubUser.replaceAll('-', '')}.${name.replaceAll('-', '')}")
   - package.json  (scripts: dev, build, qr, pack)
   - vite.config.ts
   - tsconfig.json
   - src/main.ts

See CLAUDE.md for the full app scaffold template.
`);

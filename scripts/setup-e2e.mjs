#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const pinFile = path.join(projectRoot, 'e2e-fixtures.json');
const cacheRoot = path.join(projectRoot, '.e2e-cache');

if (!existsSync(pinFile)) {
  console.error(`Pin file not found: ${pinFile}`);
  process.exit(1);
}

const pin = JSON.parse(readFileSync(pinFile, 'utf8'));

for (const [name, spec] of Object.entries(pin)) {
  syncFixture(name, spec);
}

function syncFixture(name, spec) {
  const { repo, sha, sparsePaths } = spec;
  const dest = path.join(cacheRoot, name);

  if (!existsSync(path.join(dest, '.git'))) {
    console.log(`[${name}] initializing sparse-shallow clone at ${dest}`);
    mkdirSync(dest, { recursive: true });
    git(dest, ['init', '-q']);
    git(dest, ['remote', 'add', 'origin', repo]);
    git(dest, ['config', 'core.sparseCheckout', 'true']);
    writeFileSync(
      path.join(dest, '.git/info/sparse-checkout'),
      sparsePaths.map((p) => p.endsWith('/') ? p : `${p}/`).join('\n') + '\n',
    );
  }

  const currentSha = tryGit(dest, ['rev-parse', 'HEAD']);
  if (currentSha === sha) {
    console.log(`[${name}] up to date at ${sha}`);
    return;
  }

  console.log(`[${name}] fetching ${sha.slice(0, 12)}...`);
  git(dest, ['fetch', '--depth=1', 'origin', sha]);
  git(dest, ['checkout', '-q', '--detach', 'FETCH_HEAD']);

  const newSha = tryGit(dest, ['rev-parse', 'HEAD']);
  if (newSha !== sha) {
    console.error(`[${name}] HEAD ${newSha} does not match pinned ${sha}`);
    process.exit(1);
  }
  console.log(`[${name}] checked out ${sha}`);
}

function git(cwd, args) {
  execFileSync('git', args, { cwd, stdio: 'inherit' });
}

function tryGit(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

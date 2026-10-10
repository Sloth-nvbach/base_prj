// One-time setup: installs dependencies for the root, BE and FE, and creates
// BE/.env and FE/.env from their examples when they do not exist yet.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const dir of ['.', 'BE', 'FE']) {
  console.log(`\n> npm install (${dir})`);
  execSync('npm install', { cwd: join(root, dir), stdio: 'inherit' });
}

for (const dir of ['BE', 'FE']) {
  const target = join(root, dir, '.env');
  if (existsSync(target)) {
    console.log(`${dir}/.env already exists, keeping it.`);
  } else {
    copyFileSync(join(root, dir, '.env.example'), target);
    console.log(`Created ${dir}/.env from ${dir}/.env.example`);
  }
}

console.log('\nDone. Next: start MongoDB (docker compose up -d), then npm run seed and npm run dev.');

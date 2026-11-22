// Full check (tests + lint + build) with short output: one line per passing step,
// the tail of the log only for the step that fails. Keeps agent context small.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const steps = [
  ['BE tests', 'BE', 'npx vitest run --reporter=dot'],
  ['FE tests', 'FE', 'npx vitest run --reporter=dot'],
  ['sandbox tests', '.', 'node --test sandbox/sandbox.test.mjs'],
  ['FE lint', 'FE', 'npm run lint --silent'],
  ['BE build', 'BE', 'npm run build --silent'],
  ['FE build', 'FE', 'npm run build --silent'],
];

for (const [name, dir, cmd] of steps) {
  const started = Date.now();
  const run = spawnSync(cmd, { cwd: join(root, dir), shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (run.status !== 0) {
    console.log(`✗ ${name} (${seconds}s) — last lines:\n`);
    console.log(output.trimEnd().split('\n').slice(-80).join('\n'));
    process.exit(run.status ?? 1);
  }
  // vitest summary ("Tests  120 passed") or node --test summary ("# pass 12" / "ℹ pass 12")
  const summary = output.split('\n').filter((line) => /^\s*Tests\s|^(#|ℹ) (pass|fail) /.test(line)).map((line) => line.trim());
  console.log(`✓ ${name} (${seconds}s)${summary.length ? ` — ${summary.join(', ')}` : ''}`);
}

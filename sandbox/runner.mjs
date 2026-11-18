// DSE-58: runs untrusted student code in a fresh, locked-down Docker container per test case.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export const LIMITS = {
  timeoutMs: 10_000,
  memory: '256m',
  cpus: '0.5',
  tmpfs: '/tmp:rw,size=10m',
  pids: 64,
  maxOutputBytes: 64 * 1024,
  /** Test cases run in parallel, at most this many containers at once. */
  parallel: 4
};

/** Image + command per language. Images must be pulled first (`--pull never` keeps runs inside the time limit). */
export const LANGUAGES = {
  javascript: { image: 'node:22-alpine', command: (code) => ['node', '-e', code] },
  python: { image: 'python:3.12-alpine', command: (code) => ['python3', '-c', code] }
};

export const dockerArgs = (name, language, code) => [
  'run', '--rm', '-i', '--name', name, '--pull', 'never',
  '--network', 'none',
  '--memory', LIMITS.memory, '--memory-swap', LIMITS.memory,
  '--cpus', LIMITS.cpus,
  '--pids-limit', String(LIMITS.pids),
  '--read-only', '--tmpfs', LIMITS.tmpfs,
  '--user', '65534:65534',
  '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
  '--workdir', '/tmp',
  LANGUAGES[language].image,
  ...LANGUAGES[language].command(code)
];

/** Thrown when Docker itself fails (daemon down, image missing), not the student's code. */
export class SandboxUnavailableError extends Error {}

const capped = () => {
  const chunks = [];
  let size = 0;
  return {
    push(chunk) {
      if (size < LIMITS.maxOutputBytes) chunks.push(chunk.subarray(0, LIMITS.maxOutputBytes - size));
      size += chunk.length;
    },
    text: () => Buffer.concat(chunks).toString('utf8')
  };
};

/** Runs `docker` with args, feeds stdin, kills the container after the time limit. */
export const dockerExec = (args, stdin, timeoutMs) =>
  new Promise((resolve, reject) => {
    const name = args[args.indexOf('--name') + 1];
    const started = Date.now();
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = capped();
    const stderr = capped();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      spawn('docker', ['kill', name], { stdio: 'ignore' }).on('error', () => undefined);
    }, timeoutMs);

    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.stdin.on('error', () => undefined); // program may exit before reading all input
    child.stdin.end(stdin);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new SandboxUnavailableError(`Cannot start docker: ${error.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout: stdout.text(), stderr: stderr.text(), exitCode: code ?? 137, timedOut, durationMs: Date.now() - started });
    });
  });

/** Compares outputs ignoring trailing spaces and trailing newlines. */
export const sameOutput = (actual, expected) => {
  const clean = (text) => text.replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n').trimEnd();
  return clean(actual) === clean(expected);
};

const outcomeOf = (run) => {
  if (run.timedOut) return 'timeout';
  if (run.exitCode === 137) return 'memory_limit'; // SIGKILL without our timeout = OOM killer
  if (run.exitCode !== 0) return 'error';
  return 'ok';
};

const mapLimit = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

/**
 * Runs `code` once per test case (or once with `stdin` when there are none).
 * Result shape matches the DSE-22 client in BE/src/services/sandbox.service.ts.
 */
export const runSandbox = async ({ code, language, stdin = '', testCases = [] }, exec = dockerExec) => {
  const runId = randomUUID();
  const cases = testCases.length > 0 ? testCases : [{ input: stdin, expectedOutput: undefined }];

  const runs = await mapLimit(cases, LIMITS.parallel, async (testCase, index) => {
    const run = await exec(dockerArgs(`sbx-${runId}-${index}`, language, code), testCase.input, LIMITS.timeoutMs);
    // Docker CLI errors (125) or command not runnable (126/127) are infrastructure problems.
    if (run.exitCode === 125 || ((run.exitCode === 126 || run.exitCode === 127) && !run.stdout)) {
      throw new SandboxUnavailableError(`Docker could not run the code: ${run.stderr.split('\n')[0]}`);
    }
    return run;
  });

  const outcomes = runs.map(outcomeOf);
  const results = runs.map((run, index) => ({
    testCaseId: String(index),
    passed:
      outcomes[index] === 'ok' &&
      (cases[index].expectedOutput === undefined || sameOutput(run.stdout, cases[index].expectedOutput)),
    stdout: run.stdout,
    stderr: outcomes[index] === 'timeout' ? `${run.stderr}\nTime limit exceeded (${LIMITS.timeoutMs / 1000}s)`.trim() : run.stderr,
    exitCode: run.exitCode,
    executionTimeMs: run.durationMs,
    memoryUsedMB: 0 // shortcut: not measured, needs `docker stats`/cgroup reads — add when the UI shows memory
  }));

  const status = ['timeout', 'memory_limit', 'error'].find((kind) => outcomes.includes(kind)) ?? 'completed';
  const passed = results.filter((result) => result.passed).length;
  return { runId, status, results, summary: { total: results.length, passed, failed: results.length - passed } };
};

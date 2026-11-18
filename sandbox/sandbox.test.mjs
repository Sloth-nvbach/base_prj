import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dockerArgs, runSandbox, sameOutput } from './runner.mjs';
import { createSandboxServer, validateRunRequest } from './server.mjs';

const fakeExec = (byInput) => async (args, stdin) => ({ stdout: '', stderr: '', exitCode: 0, timedOut: false, durationMs: 5, ...byInput[stdin], args });

test('docker args lock the container down', () => {
  const args = dockerArgs('sbx-1', 'python', 'print(1)');
  for (const flag of ['--rm', '--read-only', 'no-new-privileges']) assert.ok(args.includes(flag), flag);
  const value = (flag) => args[args.indexOf(flag) + 1];
  assert.equal(value('--network'), 'none');
  assert.equal(value('--memory'), '256m');
  assert.equal(value('--cpus'), '0.5');
  assert.equal(value('--user'), '65534:65534');
  assert.equal(value('--tmpfs'), '/tmp:rw,size=10m');
  assert.equal(value('--cap-drop'), 'ALL');
  assert.deepEqual(args.slice(-4), ['python:3.12-alpine', 'python3', '-c', 'print(1)']);
});

test('compares outputs ignoring trailing whitespace and CRLF', () => {
  assert.ok(sameOutput('3 \r\n', '3'));
  assert.ok(!sameOutput('3', '4'));
});

test('grades each test case in order', async () => {
  const exec = fakeExec({ '1 2': { stdout: '3\n' }, '2 2': { stdout: '5\n' } });
  const result = await runSandbox(
    { code: 'x', language: 'javascript', testCases: [{ input: '1 2', expectedOutput: '3' }, { input: '2 2', expectedOutput: '4' }] },
    exec
  );
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.results.map((r) => [r.testCaseId, r.passed]), [['0', true], ['1', false]]);
  assert.deepEqual(result.summary, { total: 2, passed: 1, failed: 1 });
});

test('reports timeout, memory limit and runtime errors', async () => {
  const cases = (input) => ({ code: 'x', language: 'python', testCases: [{ input, expectedOutput: '' }] });
  const run = (outcome) => runSandbox(cases('a'), fakeExec({ a: outcome }));

  assert.equal((await run({ timedOut: true, exitCode: 137 })).status, 'timeout');
  const oom = await run({ exitCode: 137 });
  assert.equal(oom.status, 'memory_limit');
  assert.match(oom.results[0].stderr, /Memory limit exceeded \(256MB\)/);
  const crashed = await run({ exitCode: 1, stderr: 'SyntaxError: invalid syntax' });
  assert.equal(crashed.status, 'error');
  assert.equal(crashed.results[0].passed, false);
  assert.match(crashed.results[0].stderr, /SyntaxError/);
});

test('runs once with stdin when there are no test cases', async () => {
  const result = await runSandbox({ code: 'x', language: 'javascript', stdin: 'hi' }, fakeExec({ hi: { stdout: 'hi' } }));
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].stdout, 'hi');
  assert.equal(result.results[0].passed, true);
});

test('rejects invalid requests', () => {
  assert.match(validateRunRequest({ code: 'x', language: 'ruby' }), /language/);
  assert.match(validateRunRequest({ code: '', language: 'python' }), /code/);
  assert.match(validateRunRequest({ code: 'x', language: 'python', testCases: [{ input: 1 }] }), /test case/);
  assert.equal(validateRunRequest({ code: 'x', language: 'python', testCases: [] }), undefined);
});

test('HTTP API: auth, validation, docker failure and success', async (t) => {
  const exec = async (args, stdin) =>
    stdin === 'boom'
      ? { stdout: '', stderr: 'docker: No such image', exitCode: 125, timedOut: false, durationMs: 1 }
      : { stdout: 'ok', stderr: '', exitCode: 0, timedOut: false, durationMs: 1 };
  const server = createSandboxServer({ apiKey: 'secret', exec }).listen(0, '127.0.0.1');
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/sandbox/run`;
  const post = (body, key = 'secret') =>
    fetch(url, { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: JSON.stringify(body) });

  assert.equal((await post({}, 'wrong')).status, 401);
  assert.equal((await post({ code: 'x', language: 'ruby' })).status, 400);
  assert.equal((await post({ code: 'x', language: 'python', stdin: 'boom' })).status, 503);

  const ok = await post({ code: 'x', language: 'python', testCases: [{ input: '', expectedOutput: 'ok' }] });
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.status, 'completed');
  assert.equal(body.summary.passed, 1);
});

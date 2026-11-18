// DSE-58: Docker Sandbox Runner HTTP API. Start with `npm run sandbox` (needs Docker running).
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { LANGUAGES, runSandbox, SandboxUnavailableError } from './runner.mjs';

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_TEXT = 64 * 1024;
const MAX_TEST_CASES = 50;

const isText = (value, max = MAX_TEXT) => typeof value === 'string' && value.length <= max;

/** Returns an error message, or undefined when the body is a valid run request. */
export const validateRunRequest = (body) => {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object';
  if (!isText(body.code) || body.code.trim() === '') return `code must be a non-empty string up to ${MAX_TEXT} characters`;
  if (!Object.hasOwn(LANGUAGES, body.language)) return `language must be one of: ${Object.keys(LANGUAGES).join(', ')}`;
  if (body.stdin !== undefined && !isText(body.stdin)) return 'stdin must be a string';
  if (body.testCases !== undefined) {
    if (!Array.isArray(body.testCases) || body.testCases.length > MAX_TEST_CASES) {
      return `testCases must be an array of at most ${MAX_TEST_CASES} items`;
    }
    if (!body.testCases.every((t) => t && isText(t.input) && isText(t.expectedOutput))) {
      return 'Each test case needs string input and expectedOutput';
    }
  }
  return undefined;
};

const isAuthorized = (header, apiKey) => {
  if (!apiKey) return true;
  const given = Buffer.from(header ?? '');
  const expected = Buffer.from(`Bearer ${apiKey}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
};

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Malformed JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });

export const createSandboxServer = ({ apiKey, exec } = {}) =>
  createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
      if (req.method !== 'POST' || req.url !== '/api/sandbox/run') return send(res, 404, { message: 'Route not found' });
      if (!isAuthorized(req.headers.authorization, apiKey)) return send(res, 401, { message: 'Invalid sandbox API key' });

      const body = await readJson(req);
      const invalid = validateRunRequest(body);
      if (invalid) return send(res, 400, { message: invalid });

      return send(res, 200, await runSandbox(body, exec));
    } catch (error) {
      if (error.status) return send(res, error.status, { message: error.message });
      if (error instanceof SandboxUnavailableError) return send(res, 503, { message: error.message });
      console.error('Sandbox run failed:', error);
      return send(res, 500, { message: 'Internal sandbox error' });
    }
  });

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.SANDBOX_PORT ?? 5010);
  const host = process.env.SANDBOX_HOST ?? '127.0.0.1';
  createSandboxServer({ apiKey: process.env.SANDBOX_API_KEY || undefined }).listen(port, host, () => {
    console.log(`Sandbox runner on http://${host}:${port} (languages: ${Object.keys(LANGUAGES).join(', ')})`);
  });
}

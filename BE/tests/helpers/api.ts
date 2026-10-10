import http from 'http';
import type { AddressInfo } from 'net';
import request from 'supertest';
import { afterAll } from 'vitest';
import { app } from '../../src/app';

/**
 * Serves `handler` on 127.0.0.1 for the current test file and closes it after.
 * Binding to 127.0.0.1 is deliberate: `request(app)` binds an ephemeral port on
 * every interface, and on macOS another local app can already hold that port on
 * 127.0.0.1, so requests randomly reach the wrong server (stray 403/426).
 */
export const serve = (handler: http.RequestListener) => {
  const server = http.createServer(handler).listen(0, '127.0.0.1');
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
  return () => request(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
};

/** Client for the real application. */
export const api = serve(app);

import { beforeEach, vi } from 'vitest';

/**
 * Replaces every outbound third-party dependency (SMTP, Cloudinary, Gemini, Redis/BullMQ, Sandbox) with an
 * in-memory recorder. Real application code still runs end to end; only the
 * network boundary is faked.
 */

// --- In-memory stores for BullMQ mock ---
const mockQueues = new Map<string, {
  jobs: Map<string, { id: string; data: unknown; progress: number; returnvalue: unknown; failedReason: string | undefined; state: string }>;
  waiting: string[];
  active: string[];
  delayed: string[];
}>();

const mockRedisStore = new Map<string, string>();

const getMockQueue = (name: string) => {
  if (!mockQueues.has(name)) {
    mockQueues.set(name, {
      jobs: new Map(),
      waiting: [],
      active: [],
      delayed: []
    });
  }
  return mockQueues.get(name)!;
};

// --- Mock BullMQ ---
vi.mock('bullmq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bullmq')>();

  class MockQueue {
    name: string;
    client: {
      get: (key: string) => Promise<string | null>;
      set: (key: string, value: string) => Promise<'OK'>;
      incr: (key: string) => Promise<number>;
      decr: (key: string) => Promise<number>;
      del: (key: string) => Promise<number>;
      sadd: (key: string, member: string) => Promise<number>;
      srem: (key: string, member: string) => Promise<number>;
    };

    constructor(name: string) {
      this.name = name;
      this.client = {
        get: async (key: string) => mockRedisStore.get(key) || null,
        set: async (key: string, value: string) => { mockRedisStore.set(key, value); return 'OK'; },
        incr: async (key: string) => { const val = (parseInt(mockRedisStore.get(key) || '0', 10) + 1).toString(); mockRedisStore.set(key, val); return parseInt(val, 10); },
        decr: async (key: string) => { const val = (parseInt(mockRedisStore.get(key) || '0', 10) - 1).toString(); mockRedisStore.set(key, val); return parseInt(val, 10); },
        del: async (key: string) => { mockRedisStore.delete(key); return 1; },
        sadd: async (key: string, member: string) => { const set = new Set((mockRedisStore.get(key) || '').split(',').filter(Boolean)); set.add(member); mockRedisStore.set(key, Array.from(set).join(',')); return set.size; },
        srem: async (key: string, member: string) => { const set = new Set((mockRedisStore.get(key) || '').split(',').filter(Boolean)); set.delete(member); mockRedisStore.set(key, Array.from(set).join(',')); return set.size; }
      };
    }

    async add(jobName: string, data: unknown, opts?: Record<string, unknown>) {
      const queue = getMockQueue(this.name);
      const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const job = {
        id: jobId,
        name: jobName,
        data,
        opts,
        progress: 0,
        returnvalue: undefined,
        failedReason: undefined,
        state: 'waiting' as const
      };
      queue.jobs.set(jobId, job);
      queue.waiting.push(jobId);
      return { id: jobId, data, opts, updateProgress: async (p: number) => { job.progress = p; } };
    }

    async getJob(jobId: string) {
      const queue = getMockQueue(this.name);
      const job = queue.jobs.get(jobId);
      if (!job) return undefined;
      return {
        id: job.id,
        data: job.data,
        progress: job.progress,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        getState: async () => job.state,
        updateProgress: async (p: number) => { job.progress = p; }
      };
    }

    async getWaitingCount() { return getMockQueue(this.name).waiting.length; }
    async getActiveCount() { return getMockQueue(this.name).active.length; }
    async getDelayedCount() { return getMockQueue(this.name).delayed.length; }
    async close() { mockQueues.delete(this.name); }
  }

  class MockWorker {
    name: string;
    processor: (job: { data: unknown; updateProgress: (p: number) => Promise<void>; id: string }) => Promise<unknown>;
    events: Map<string, Function[]> = new Map();

    constructor(name: string, processor: (job: { data: unknown; updateProgress: (p: number) => Promise<void>; id: string }) => Promise<unknown>) {
      this.name = name;
      this.processor = processor;
    }

    on(event: string, handler: Function) {
      if (!this.events.has(event)) this.events.set(event, []);
      this.events.get(event)!.push(handler);
    }

    async close() {}
  }

  class MockQueueEvents {
    constructor() {}
    on() {}
    async close() {}
  }

  return { ...actual, Queue: MockQueue, Worker: MockWorker, QueueEvents: MockQueueEvents };
});

// --- Mock ioredis ---
vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      store = mockRedisStore;
      async get(key: string) { return this.store.get(key) || null; }
      async set(key: string, value: string) { this.store.set(key, value); return 'OK'; }
      async incr(key: string) { const val = (parseInt(this.store.get(key) || '0', 10) + 1).toString(); this.store.set(key, val); return parseInt(val, 10); }
      async decr(key: string) { const val = (parseInt(this.store.get(key) || '0', 10) - 1).toString(); this.store.set(key, val); return parseInt(val, 10); }
      async del(key: string) { this.store.delete(key); return 1; }
      async sadd(key: string, member: string) { const set = new Set((this.store.get(key) || '').split(',').filter(Boolean)); set.add(member); this.store.set(key, Array.from(set).join(',')); return set.size; }
      async srem(key: string, member: string) { const set = new Set((this.store.get(key) || '').split(',').filter(Boolean)); set.delete(member); this.store.set(key, Array.from(set).join(',')); return set.size; }
      async quit() {}
      on() {}
    }
  };
});

// --- Mock nodemailer ---
vi.mock('nodemailer', async () => {
  const { emailOutbox } = await import('../helpers/email-outbox');

  const createTransport = () => ({
    sendMail: async (options: Record<string, unknown>) => {
      emailOutbox.push(options as never);
      return { messageId: 'test-message-id' };
    }
  });

  return { default: { createTransport }, createTransport };
});

// --- Mock cloudinary ---
vi.mock('cloudinary', async () => {
  const { cloudinaryRecorder } = await import('../helpers/cloudinary-recorder');

  const v2 = {
    config: () => undefined,
    uploader: {
      upload_stream: (
        options: { folder: string },
        callback: (error: unknown, result?: unknown) => void
      ) => ({
        end: (buffer: Buffer) => {
          cloudinaryRecorder.uploads.push({
            folder: options.folder,
            byteLength: buffer.byteLength
          });
          callback(null, cloudinaryRecorder.uploadResult);
        }
      }),
      destroy: async (publicId: string) => {
        cloudinaryRecorder.destroyed.push(publicId);
        if (cloudinaryRecorder.destroyError) throw cloudinaryRecorder.destroyError;
        return { result: 'ok' };
      }
    }
  };

  return { v2, default: { v2 } };
});

// --- Mock @google/genai ---
vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  const { geminiRecorder } = await import('../helpers/gemini-recorder');

  class GoogleGenAI {
    models = {
      generateContent: async (params: Record<string, unknown>) => {
        geminiRecorder.requests.push(params);
        if (geminiRecorder.error) throw geminiRecorder.error;
        if (geminiRecorder.hang) {
          const signal = (params.config as { abortSignal?: AbortSignal } | undefined)?.abortSignal;
          await new Promise((_, reject) => signal?.addEventListener('abort', () => reject(new Error('aborted'))));
        }
        return { text: geminiRecorder.replyText };
      }
    };
  }

  // Keep the real ApiError so `instanceof` checks in the service still work.
  return { ...actual, GoogleGenAI };
});

// --- Mock fetch for sandbox API ---
const mockSandboxResponses = new Map<string, { status: number; body: Record<string, unknown> }>();

vi.stubGlobal('fetch', async (url: string, options?: RequestInit) => {
  const sandboxUrl = process.env.SANDBOX_API_URL || 'http://localhost:9999';
  if (url.startsWith(sandboxUrl)) {
    const key = url + JSON.stringify(options?.body);
    const mock = mockSandboxResponses.get(key);
    if (mock) {
      return {
        ok: mock.status >= 200 && mock.status < 300,
        status: mock.status,
        json: async () => mock.body
      };
    }
    // Default mock response for sandbox
    return {
      ok: true,
      status: 200,
      json: async () => ({
        runId: 'test-run-id',
        status: 'completed',
        results: [
          { testCaseId: 'tc1', passed: true, stdout: 'hello', stderr: '', exitCode: 0, executionTimeMs: 50, memoryUsedMB: 10 },
          { testCaseId: 'tc2', passed: false, stdout: '', stderr: 'error', exitCode: 1, executionTimeMs: 30, memoryUsedMB: 5 }
        ],
        summary: { total: 2, passed: 1, failed: 1 }
      })
    };
  }
  // For other fetches, use real fetch
  return (await import('node:fetch')).default(url, options);
});

// Export helpers for tests to configure sandbox mock
export const sandboxMock = {
  setResponse: (url: string, body: Record<string, unknown>, status = 200) => {
    mockSandboxResponses.set(url, { status, body });
  },
  clear: () => mockSandboxResponses.clear()
};

beforeEach(async () => {
  const { clearEmailOutbox } = await import('../helpers/email-outbox');
  const { cloudinaryRecorder } = await import('../helpers/cloudinary-recorder');
  const { geminiRecorder } = await import('../helpers/gemini-recorder');
  clearEmailOutbox();
  cloudinaryRecorder.reset();
  geminiRecorder.reset();
  mockQueues.clear();
  mockRedisStore.clear();
  sandboxMock.clear();
});

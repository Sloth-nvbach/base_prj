/**
 * Records requests made through the mocked `@google/genai` client and decides
 * what it answers, so chat tests never call Google.
 */
export const geminiRecorder = {
  requests: [] as Record<string, unknown>[],
  /** Text of the next reply. */
  replyText: 'Hello from the test model' as string | undefined,
  /** When set, the next call rejects with this error instead of replying. */
  error: null as Error | null,
  /** When true, the next call never answers until its abort signal fires. */
  hang: false,
  reset() {
    this.requests = [];
    this.replyText = 'Hello from the test model';
    this.error = null;
    this.hang = false;
  }
};

/**
 * Queue service for DSE-22: manages concurrent code execution runs per user.
 * Uses BullMQ with Redis for production-ready queuing.
 */
import { Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { serviceUnavailable } from '../utils/app-error';
import type { SandboxRunRequest, SandboxRunResponse } from './sandbox.service';

// Redis connection configuration
const redisConnection = {
  host: env.nodeEnv === 'test' ? 'localhost' : (process.env.REDIS_HOST || 'localhost'),
  port: env.nodeEnv === 'test' ? 6379 : parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true
};

/** Job data for a submission run. */
export interface RunJobData {
  submissionId: string;
  userId: string;
  code: string;
  language: SandboxRunRequest['language'];
  testCases: SandboxRunRequest['testCases'];
  testCaseIds: string[]; // MongoDB ObjectIds of test cases
}

/** Job result after sandbox execution. */
export interface RunJobResult {
  success: boolean;
  sandboxResponse?: SandboxRunResponse;
  error?: {
    code: string;
    message: string;
  };
}

/** Queue name. */
export const SUBMISSION_RUN_QUEUE = 'submission-run';

/** Create the BullMQ queue. */
export const createSubmissionRunQueue = (): Queue<RunJobData, RunJobResult> => {
  return new Queue<RunJobData, RunJobResult>(SUBMISSION_RUN_QUEUE, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 1, // No retry - sandbox handles its own retries if needed
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    }
  });
};

/** Singleton queue instance. */
let queueInstance: Queue<RunJobData, RunJobResult> | null = null;

export const getSubmissionRunQueue = (): Queue<RunJobData, RunJobResult> => {
  if (!queueInstance) {
    queueInstance = createSubmissionRunQueue();
  }
  return queueInstance;
};

/** Reset queue instance (for testing). */
export const resetSubmissionRunQueue = (): void => {
  if (queueInstance) {
    queueInstance.close();
    queueInstance = null;
  }
};

/**
 * Add a submission run job to the queue.
 * Returns the job ID for polling.
 */
export const addSubmissionRunJob = async (data: RunJobData): Promise<string> => {
  const queue = getSubmissionRunQueue();
  const job = await queue.add('run', data);
  if (!job.id) throw new Error('Failed to create queue job');
  return job.id;
};

/** Job state type. */
export type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

/**
 * Get job status and result for polling.
 */
export const getJobStatus = async (jobId: string): Promise<{
  status: JobState;
  progress?: number;
  result?: RunJobResult;
  error?: string;
} | null> => {
  const queue = getSubmissionRunQueue();
  const job = await queue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const result = job.returnvalue as RunJobResult | undefined;
  const failedReason = job.failedReason;

  return {
    status: state as JobState,
    progress: job.progress as number | undefined,
    result,
    error: failedReason
  };
};

/**
 * Check how many active/waiting jobs a user has.
 * Used to enforce max concurrent runs per user.
 */
export const getUserActiveJobCount = async (userId: string): Promise<number> => {
  const queue = getSubmissionRunQueue();
  const [waiting, active, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount()
  ]);

  // For a more accurate count, we'd need to iterate jobs and filter by userId
  // This is a simplified version - in production, use a separate tracking mechanism
  // For now, we'll use a Redis-based counter per user (see SubmissionRunQueue class below)
  return waiting + active + delayed;
};

/** Separate Redis client for user concurrency tracking. */
let redisClient: Redis | null = null;

const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      ...redisConnection,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
  }
  return redisClient;
};

const resetRedisClient = (): void => {
  if (redisClient) {
    redisClient.quit();
    redisClient = null;
  }
};

/**
 * SubmissionRunQueue - higher-level queue with user concurrency tracking.
 * Uses Redis sets to track active jobs per user.
 */
export class SubmissionRunQueue {
  private queue: Queue<RunJobData, RunJobResult>;
  private readonly maxConcurrentPerUser: number;
  private readonly redis: Redis;

  constructor() {
    this.queue = getSubmissionRunQueue();
    this.maxConcurrentPerUser = env.maxConcurrentRunsPerUser;
    this.redis = getRedisClient();
  }

  /** Redis key for user's active job IDs. */
  private userJobsKey(userId: string): string {
    return `submission:queue:user:${userId}:jobs`;
  }

  /** Redis key for user's job count. */
  private userCountKey(userId: string): string {
    return `submission:queue:user:${userId}:count`;
  }

  /**
   * Check if user can start a new run (under concurrency limit).
   */
  async canUserRun(userId: string): Promise<{ allowed: boolean; currentCount: number }> {
    const count = await this.redis.get(this.userCountKey(userId));
    const currentCount = count ? parseInt(count, 10) : 0;
    return {
      allowed: currentCount < this.maxConcurrentPerUser,
      currentCount
    };
  }

  /**
   * Increment user's active job count.
   */
  private async incrementUserCount(userId: string): Promise<void> {
    await this.redis.incr(this.userCountKey(userId));
  }

  /**
   * Decrement user's active job count.
   */
  private async decrementUserCount(userId: string): Promise<void> {
    const key = this.userCountKey(userId);
    const count = await this.redis.decr(key);
    if (count <= 0) {
      await this.redis.del(key);
    }
  }

  /**
   * Add a job with user concurrency check.
   * Throws if user has reached max concurrent runs.
   */
  async addJob(data: RunJobData): Promise<{ jobId: string; position?: number }> {
    const { allowed, currentCount } = await this.canUserRun(data.userId);
    if (!allowed) {
      throw new Error(`Max concurrent runs (${this.maxConcurrentPerUser}) reached. Current: ${currentCount}`);
    }

    await this.incrementUserCount(data.userId);

    const job = await this.queue.add('run', data);
    if (!job.id) throw new Error('Failed to create queue job');

    // Track job ID for this user
    await this.redis.sadd(this.userJobsKey(data.userId), job.id);

    return { jobId: job.id, position: currentCount };
  }

  /**
   * Called when job completes (success or failure).
   * Cleans up user tracking.
   */
  async onJobComplete(jobId: string, userId: string): Promise<void> {
    await this.redis.srem(this.userJobsKey(userId), jobId);
    await this.decrementUserCount(userId);
  }

  /**
   * Get job status with result.
   */
  async getJob(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const result = job.returnvalue as RunJobResult | undefined;
    const failedReason = job.failedReason;

    return {
      id: job.id,
      status: state as JobState,
      progress: job.progress as number | undefined,
      result,
      error: failedReason,
      data: job.data
    };
  }

  /**
   * Close queue and Redis connections.
   */
  async close(): Promise<void> {
    await this.queue.close();
  }
}

/** Singleton instance. */
let submissionRunQueueInstance: SubmissionRunQueue | null = null;

export const getSubmissionRunQueueInstance = (): SubmissionRunQueue => {
  if (!submissionRunQueueInstance) {
    submissionRunQueueInstance = new SubmissionRunQueue();
  }
  return submissionRunQueueInstance;
};

export const resetSubmissionRunQueueInstance = (): void => {
  if (submissionRunQueueInstance) {
    submissionRunQueueInstance.close();
    submissionRunQueueInstance = null;
  }
  resetRedisClient();
  resetSubmissionRunQueue();
};
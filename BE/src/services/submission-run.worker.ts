/**
 * Worker for DSE-22: processes submission run jobs from the queue.
 * Calls the sandbox service and updates submission with results.
 */
import { Worker, Job } from 'bullmq';
import { SubmissionModel } from '../models/submission.model';
import { TestCaseModel } from '../models/testcase.model';
import { runCodeInSandbox, convertSandboxResults, mapSandboxStatus, type SandboxRunRequest } from './sandbox.service';
import { getSubmissionRunQueueInstance, redisConnection } from './queue.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/** Job data type. */
interface RunJobData {
  submissionId: string;
  userId: string;
  code: string;
  language: SandboxRunRequest['language'];
  testCases: SandboxRunRequest['testCases'];
  testCaseIds: string[];
}

/** Job result type. */
interface RunJobResult {
  success: boolean;
  sandboxResponse?: {
    runId: string;
    status: 'completed' | 'timeout' | 'error' | 'memory_limit';
    results: Array<{
      testCaseId: string;
      passed: boolean;
      stdout: string;
      stderr: string;
      exitCode: number;
      executionTimeMs: number;
      memoryUsedMB: number;
    }>;
    summary: { total: number; passed: number; failed: number };
  };
  error?: { code: string; message: string };
}

/** Create the BullMQ worker. */
export const createSubmissionRunWorker = (): Worker<RunJobData, RunJobResult> => {
  const worker = new Worker<RunJobData, RunJobResult>(
    'submission-run',
    async (job: Job<RunJobData, RunJobResult>) => {
      const { submissionId, userId, code, language, testCases, testCaseIds } = job.data;
      logger.info('Processing submission run job', { submissionId, userId, jobId: job.id });

      // Update job progress
      await job.updateProgress(10);

      try {
        // Fetch submission to verify it exists and get assignment info
        const submission = await SubmissionModel.findById(submissionId);
        if (!submission) {
          throw new Error(`Submission ${submissionId} not found`);
        }

        // Verify ownership
        if (submission.student.toString() !== userId) {
          throw new Error('Unauthorized: submission belongs to another user');
        }

        await job.updateProgress(30);

        // Call sandbox API
        const sandboxRequest: SandboxRunRequest = {
          code,
          language,
          testCases
        };

        const sandboxResponse = await runCodeInSandbox(sandboxRequest);

        await job.updateProgress(70);

        // Map sandbox status to submission status
        const { message } = mapSandboxStatus(sandboxResponse.status);

        // Convert sandbox results to submission format with proper points
        // Fetch test cases to get their points
        const testCasesFromDb = await TestCaseModel.find({ _id: { $in: testCaseIds } });
        const pointsMap = new Map(testCasesFromDb.map((tc) => [tc._id.toString(), tc.points]));

        const { testResults, totalScore, maxScore } = convertSandboxResults(
          sandboxResponse.results,
          testCaseIds
        );

        // Apply actual points from test cases
        for (const result of testResults) {
          const points = pointsMap.get(result.testCaseId) || 1;
          result.points = result.passed ? points : 0;
        }

        const finalTotalScore = testResults.filter((r) => r.passed).reduce((sum, r) => sum + r.points, 0);
        const finalMaxScore = testResults.reduce((sum, r) => sum + (pointsMap.get(r.testCaseId) || 1), 0);

        await job.updateProgress(90);

        // Store the run outcome only: grading status, score and feedback belong to the teacher.
        await SubmissionModel.findByIdAndUpdate(submissionId, {
          runStatus: sandboxResponse.status,
          runMessage: message,
          lastRunAt: new Date(),
          testResults,
          totalScore: finalTotalScore,
          maxScore: finalMaxScore
        });

        await job.updateProgress(100);

        logger.info('Submission run completed', { submissionId, jobId: job.id, runStatus: sandboxResponse.status, totalScore: finalTotalScore });

        return {
          success: true,
          sandboxResponse
        };
      } catch (error) {
        logger.error('Submission run job failed', { submissionId, userId, jobId: job.id, error: (error as Error).message });

        // Update submission with error status
        try {
          await SubmissionModel.findByIdAndUpdate(submissionId, {
            runStatus: 'error',
            runMessage: (error as Error).message.slice(0, 2000),
            lastRunAt: new Date()
          });
        } catch (updateError) {
          logger.error('Failed to update submission with error status', { submissionId, error: (updateError as Error).message });
        }

        // Return error result (job will be marked as failed)
        return {
          success: false,
          error: {
            code: 'SANDBOX_ERROR',
            message: (error as Error).message
          }
        };
      }
    },
    {
      connection: redisConnection,
      concurrency: 10, // Process up to 10 jobs concurrently per worker
      limiter: {
        max: 100,
        duration: 60000 // Max 100 jobs per minute
      }
    }
  );

  // Event handlers
  worker.on('completed', async (job: Job<RunJobData, RunJobResult>, result: RunJobResult) => {
    const queue = getSubmissionRunQueueInstance();
    await queue.onJobComplete(job.id!, job.data.userId);
    logger.info('Job completed, cleaned up user tracking', { jobId: job.id, userId: job.data.userId });
  });

  worker.on('failed', async (job: Job<RunJobData, RunJobResult> | undefined, error: Error) => {
    if (job) {
      const queue = getSubmissionRunQueueInstance();
      await queue.onJobComplete(job.id!, job.data.userId);
      logger.error('Job failed, cleaned up user tracking', { jobId: job.id, userId: job.data.userId, error: error.message });
    }
  });

  worker.on('error', (error) => {
    logger.error('Worker error', { error: error.message });
  });

  return worker;
};

/** Singleton worker instance. */
let workerInstance: Worker<RunJobData, RunJobResult> | null = null;

export const getSubmissionRunWorker = (): Worker<RunJobData, RunJobResult> => {
  if (!workerInstance) {
    workerInstance = createSubmissionRunWorker();
  }
  return workerInstance;
};

export const closeSubmissionRunWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};
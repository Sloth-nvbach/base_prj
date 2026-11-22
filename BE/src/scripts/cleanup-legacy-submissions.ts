/**
 * One-off repair for submissions written by the run worker before 2026-11-23:
 * it set `status` to 'graded' (no score) or the invalid 'failed' after every
 * sandbox run and put its run message into `feedback`. Those submissions look
 * graded although no teacher graded them. Safe to run many times: real grades
 * (status 'graded' with a score) are never touched.
 * Run with `npm run cleanup:legacy`.
 */
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { SubmissionModel } from '../models/submission.model';

/** Messages the old worker wrote into `feedback`, and the run status each one meant. */
const WORKER_MESSAGES: Record<string, string> = {
  'Code executed successfully': 'completed',
  'Execution timed out (10s limit)': 'timeout',
  'Memory limit exceeded (256MB)': 'memory_limit',
  'Execution failed (compile or runtime error)': 'error'
};

export const cleanupLegacySubmissions = async () => {
  // Raw collection: 'failed' is not a valid status, so Mongoose casting would reject these documents.
  const legacy = await SubmissionModel.collection
    .find({ $or: [{ status: 'failed' }, { status: 'graded', score: { $in: [null] } }] })
    .project<{ _id: mongoose.Types.ObjectId; status: string; feedback?: string; runStatus?: string }>({ status: 1, feedback: 1, runStatus: 1 })
    .toArray();

  for (const submission of legacy) {
    const feedback = submission.feedback ?? '';
    const fromWorker = feedback in WORKER_MESSAGES || submission.status === 'failed';
    await SubmissionModel.collection.updateOne(
      { _id: submission._id },
      {
        $set: {
          status: 'submitted',
          ...(fromWorker
            ? {
                feedback: '',
                runMessage: feedback.slice(0, 2000),
                runStatus: submission.runStatus ?? WORKER_MESSAGES[feedback] ?? 'error'
              }
            : {})
        },
        $unset: { gradedAt: '', gradedBy: '' }
      }
    );
  }
  return legacy.length;
};

const run = async () => {
  await connectDb();
  const fixed = await cleanupLegacySubmissions();
  console.log(fixed ? `Repaired ${fixed} legacy submission(s): back to 'submitted', run message moved out of feedback.` : 'No legacy submissions found.');
  await mongoose.disconnect();
};

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

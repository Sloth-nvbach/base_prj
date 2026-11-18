import mongoose from 'mongoose';
import { app } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { closeSubmissionRunWorker, getSubmissionRunWorker } from './services/submission-run.worker';

const start = async () => {
  await connectDb();
  // Code runs need Redis + the sandbox runner; without SANDBOX_API_URL they answer 503, so no worker.
  if (env.sandboxApiUrl) {
    getSubmissionRunWorker();
    console.log('Submission run worker started');
  }
  const server = app.listen(env.port, () => {
    console.log(`Backend running at http://localhost:${env.port}`);
  });

  // Close the HTTP server and the DB connection so `tsx watch` restarts and
  // container stops never leave a dangling port or connection behind.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      void Promise.allSettled([closeSubmissionRunWorker(), mongoose.disconnect()]).finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

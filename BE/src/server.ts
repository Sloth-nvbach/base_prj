import mongoose from 'mongoose';
import { app } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';

const start = async () => {
  await connectDb();
  const server = app.listen(env.port, () => {
    console.log(`Backend running at http://localhost:${env.port}`);
  });

  // Close the HTTP server and the DB connection so `tsx watch` restarts and
  // container stops never leave a dangling port or connection behind.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      void mongoose.disconnect().finally(() => process.exit(0));
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

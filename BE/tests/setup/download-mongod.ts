import { MongoBinary } from 'mongodb-memory-server';

/**
 * Runs once in the main process before any test worker starts. Every integration
 * file starts its own mongod; on a cold cache (fresh CI runner, first local run,
 * new mongodb-memory-server version) the workers would all download the binary
 * at the same time and race on its lock file ("Cannot unlock file", ENOENT on
 * rename, hooks timing out). Downloading it here first leaves the workers a
 * ready binary.
 */
export default async function downloadMongod() {
  await MongoBinary.getPath();
}

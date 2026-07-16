/**
 * @armoriq/worker — BullMQ consumer for the scan queue.
 *
 * Listens on SCAN_QUEUE (shared with the API via @armoriq/db) and runs each
 * { scanId } job through runScanJob. The DB is the source of truth; the job
 * carries only the id. Connection is a single ioredis client against REDIS_URL.
 *
 * Run:  pnpm --filter @armoriq/worker dev   (tsx watch)
 *       pnpm --filter @armoriq/worker start (built dist)
 */

import { Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';

import { SCAN_QUEUE, type ScanJob } from '@armoriq/db';

import { runScanJob } from './runScanJob.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// BullMQ requires maxRetriesPerRequest = null on its blocking connection.
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker<ScanJob>(
  SCAN_QUEUE,
  async (job: Job<ScanJob>) => {
    await runScanJob(job.data.scanId);
  },
  { connection },
);

worker.on('ready', () => {
  process.stdout.write(`[worker] listening on "${SCAN_QUEUE}" (${REDIS_URL})\n`);
});

worker.on('active', (job: Job<ScanJob>) => {
  process.stdout.write(`[worker] scan ${job.data.scanId} started (job ${job.id})\n`);
});

worker.on('completed', (job: Job<ScanJob>) => {
  process.stdout.write(`[worker] scan ${job.data.scanId} done (job ${job.id})\n`);
});

worker.on('failed', (job: Job<ScanJob> | undefined, err: Error) => {
  process.stderr.write(
    `[worker] job ${job?.id ?? '?'} (scan ${job?.data.scanId ?? '?'}) failed: ${err.message}\n`,
  );
});

worker.on('error', (err: Error) => {
  process.stderr.write(`[worker] error: ${err.message}\n`);
});

/** Drain in-flight jobs and close the Redis connection on shutdown. */
async function shutdown(signal: string): Promise<void> {
  process.stdout.write(`[worker] ${signal} received, shutting down…\n`);
  try {
    await worker.close();
    await connection.quit();
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

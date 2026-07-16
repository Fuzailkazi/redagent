/**
 * @armoriq/db — persistence layer + shared job contract for ArmorIQ red-teaming.
 *
 * Exposes:
 *  - `prisma`: the shared PrismaClient singleton (reused across dev hot-reload so
 *    a long-running process never opens a new pool on every reload).
 *  - `SCAN_QUEUE`: the BullMQ queue name shared by the API (producer) and the
 *    worker (consumer).
 *  - `ScanJob`: the job payload shape enqueued on SCAN_QUEUE. The DB is the source
 *    of truth — the job carries only the scan id; the worker hydrates everything
 *    else from Postgres.
 *
 * The Prisma-generated client + model types (Target, Scan, Finding, the `Prisma`
 * namespace) are re-exported so api/worker import them from one place.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Cache the client on globalThis in non-production so repeated module evaluation
 * (tsx watch, vitest, dev servers) reuses one connection pool instead of leaking
 * a new PrismaClient per reload.
 */
const globalForPrisma = globalThis as unknown as {
  __armoriqPrisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.__armoriqPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__armoriqPrisma = prisma;
}

/**
 * BullMQ queue name shared by the API (producer) and worker (consumer). Keep this
 * as the single source of truth — never inline the literal elsewhere.
 *
 * NOTE: BullMQ v5 forbids ':' in queue names (it is the Redis key separator), so
 * the namespace uses a hyphen. Both api and worker import this constant, so they
 * stay in lockstep regardless of the literal value.
 */
export const SCAN_QUEUE = 'redagent-scans';

/**
 * Payload enqueued on {@link SCAN_QUEUE}. The DB is the source of truth: the API
 * creates a Scan row (status 'queued') and enqueues only its id; the worker loads
 * the scan + target from Postgres, runs it, and persists results.
 */
export interface ScanJob {
  scanId: string;
}

// Re-export the Prisma-generated client + model/row types so consumers depend on
// exactly one package for both the runtime client and its types.
export { PrismaClient, Prisma } from '@prisma/client';
export type { Target, Scan, Finding } from '@prisma/client';

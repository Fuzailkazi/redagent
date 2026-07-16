/**
 * @armoriq/api — Fastify HTTP surface for ArmorIQ red-teaming (Phase 3).
 *
 * Scans are ASYNC + STORED + QUERYABLE: the API validates input, persists a
 * Target / Scan row, and enqueues a { scanId } job on the shared SCAN_QUEUE.
 * The worker is the sole executor; the DB is the source of truth.
 *
 * Guardrails enforced here (not just in the UI):
 *  - All inputs validated with @armoriq/schema zod (fail fast, 400 on bad input).
 *  - Secrets stay by-reference: target config is stored/echoed with ${ENV_VAR}
 *    refs UNRESOLVED — this layer never resolves or emits a secret value.
 *  - Authorization hard gate: a scan against a `production` target is refused
 *    (403) unless explicitly authorized, and the decision is always logged.
 *
 * buildServer() is a factory so tests can inject a fake prisma + queue and drive
 * routes via fastify .inject() with no Postgres/Redis.
 */

import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';

import { ConfigSchema, type ProbeResult } from '@armoriq/schema';
import {
  prisma as defaultPrisma,
  SCAN_QUEUE,
  type PrismaClient,
  type Prisma,
  type ScanJob,
} from '@armoriq/db';
import {
  hashTargetConfig,
  buildScanResult,
  buildJsonReport,
  buildMarkdownReport,
} from '@armoriq/reporting';
import { detectTarget, loadLibrary, score } from '@armoriq/engine';

/** On-disk attack library (for report reconstruction); overridable via env. */
const ATTACK_LIBRARY_PATH =
  process.env.ATTACK_LIBRARY_PATH ??
  '/Users/fu2ail/projects/redagent/redagent/attacks/attack_library.json';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

/* -------------------------------------------------------------------------- */
/* Injectable dependencies                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Minimal producer seam over the BullMQ queue. The real `Queue` satisfies this
 * structurally; tests pass a spy so no Redis connection is opened.
 */
export interface ScanQueue {
  add(name: string, data: ScanJob): Promise<unknown>;
}

export interface BuildServerOptions {
  /** Prisma client. Defaults to the shared @armoriq/db singleton. */
  prisma?: PrismaClient;
  /** Scan job producer. Defaults to a real BullMQ Queue on REDIS_URL. */
  queue?: ScanQueue;
  /** Fastify logger option. Defaults to true (pino). Pass false in tests. */
  logger?: FastifyServerOptions['logger'];
}

/* -------------------------------------------------------------------------- */
/* Request validation schemas (zod at the edges)                             */
/* -------------------------------------------------------------------------- */

const CreateTargetBodySchema = z.object({
  name: z.string().min(1),
  config: ConfigSchema,
});

const ProfileSchema = z.enum(['quick', 'standard', 'deep']);

const CreateScanBodySchema = z.object({
  profile: ProfileSchema.optional(),
  authorize: z.boolean().optional(),
});

const IdParamsSchema = z.object({
  id: z.string().min(1),
});

/* -------------------------------------------------------------------------- */
/* Server factory                                                             */
/* -------------------------------------------------------------------------- */

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const prisma = options.prisma ?? defaultPrisma;

  // Only stand up a real Redis-backed queue if the caller did not inject one,
  // so tests never touch Redis. We own (and close) it iff we created it.
  let ownedConnection: Redis | undefined;
  let queue: ScanQueue;
  if (options.queue) {
    queue = options.queue;
  } else {
    ownedConnection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    queue = new Queue(SCAN_QUEUE, { connection: ownedConnection });
  }

  const app = Fastify({
    logger: options.logger ?? true,
  });

  // CORS so the Next.js dashboard (browser) can call this API cross-origin.
  // Origin allowlist from CORS_ORIGIN (comma-separated), default the web dev host.
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  void app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
  });

  app.addHook('onClose', async () => {
    if (ownedConnection) {
      // `queue` is the Queue we created; close both to release the connection.
      await (queue as unknown as Queue).close();
      await ownedConnection.quit();
    }
  });

  /* ---- Health ---------------------------------------------------------- */

  app.get('/healthz', async () => ({ ok: true }));

  /* ---- Auto-detect ----------------------------------------------------- */

  // POST /detect — given just a URL (+ optional auth headers), probe the agent
  // and infer a working target config (request shape + reply path, JSON or SSE).
  // Powers the "paste a URL, we do the rest" flow. Returns 422 if undetectable.
  const DetectBodySchema = z.object({
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
  });
  app.post('/detect', async (request, reply) => {
    const parsed = DetectBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: parsed.error.issues });
    }
    const result = await detectTarget(parsed.data.url, { headers: parsed.data.headers });
    if (!result.ok) {
      return reply.code(422).send({
        error: 'DetectionFailed',
        message: result.error,
        tried: result.tried,
      });
    }
    return reply.send(result);
  });

  /* ---- Targets --------------------------------------------------------- */

  // POST /targets — register a target. Validates the full TargetConfig, derives
  // environment from it, and pins targetConfigHash over the config with secret
  // refs UNRESOLVED (so no secret is ever hashed or stored raw).
  app.post('/targets', async (request, reply) => {
    const parsed = CreateTargetBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: parsed.error.issues });
    }

    const { name, config } = parsed.data;
    const targetConfigHash = hashTargetConfig(config.target);

    const created = await prisma.target.create({
      data: {
        name,
        environment: config.target.environment,
        // Stored verbatim with ${ENV_VAR} refs unresolved — never raw secrets.
        config: config as unknown as Prisma.InputJsonValue,
        targetConfigHash,
      },
      select: { id: true },
    });

    return reply.code(201).send({ id: created.id });
  });

  // GET /targets — list summaries only.
  app.get('/targets', async (_request, reply) => {
    const targets = await prisma.target.findMany({
      select: { id: true, name: true, environment: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(targets);
  });

  // GET /targets/:id — full target; config returned with secret refs unresolved
  // (it is stored that way, so we never resolve/echo a secret value).
  app.get('/targets/:id', async (request, reply) => {
    const params = IdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: params.error.issues });
    }

    const target = await prisma.target.findUnique({
      where: { id: params.data.id },
    });
    if (!target) {
      return reply.code(404).send({ error: 'NotFound', message: 'target not found' });
    }
    return reply.send(target);
  });

  /* ---- Scans ----------------------------------------------------------- */

  // POST /targets/:id/scans — enqueue an async scan.
  // AUTHORIZATION HARD GATE: a production target requires explicit authorization
  // (header `x-redteam-authorize: true` OR body.authorize === true). The decision
  // is logged either way; a refusal is a 403.
  app.post('/targets/:id/scans', async (request, reply) => {
    const params = IdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: params.error.issues });
    }

    const body = CreateScanBodySchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: body.error.issues });
    }

    const targetId = params.data.id;
    const target = await prisma.target.findUnique({ where: { id: targetId } });
    if (!target) {
      return reply.code(404).send({ error: 'NotFound', message: 'target not found' });
    }

    const profile = body.data.profile ?? 'standard';

    if (target.environment === 'production') {
      const rawHeader = request.headers['x-redteam-authorize'];
      const headerAuth =
        (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) === 'true';
      const bodyAuth = body.data.authorize === true;
      const authorized = headerAuth || bodyAuth;

      if (!authorized) {
        request.log.warn(
          { targetId, targetName: target.name, environment: 'production', decision: 'refused' },
          'Authorization REFUSED: scan against production target requires explicit sign-off',
        );
        return reply.code(403).send({
          error: 'AuthorizationRequired',
          message:
            `Scanning production target "${target.name}" requires explicit authorization. ` +
            `Set header "x-redteam-authorize: true" or body { "authorize": true }.`,
        });
      }

      request.log.info(
        {
          targetId,
          targetName: target.name,
          environment: 'production',
          decision: 'authorized',
          via: headerAuth ? 'header' : 'body',
        },
        'Authorization GRANTED: production scan authorized',
      );
    } else {
      request.log.info(
        { targetId, targetName: target.name, environment: target.environment, decision: 'authorized' },
        'Authorization: non-production scan proceeding',
      );
    }

    const scan = await prisma.scan.create({
      data: { targetId, status: 'queued', profile },
      select: { id: true },
    });

    const job: ScanJob = { scanId: scan.id };
    await queue.add('scan', job);

    return reply.code(202).send({ scanId: scan.id, status: 'queued' });
  });

  // GET /scans/:id — status + scores + counts + metadata (NO findings).
  app.get('/scans/:id', async (request, reply) => {
    const params = IdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: params.error.issues });
    }

    const scan = await prisma.scan.findUnique({ where: { id: params.data.id } });
    if (!scan) {
      return reply.code(404).send({ error: 'NotFound', message: 'scan not found' });
    }

    return reply.send({
      id: scan.id,
      targetId: scan.targetId,
      status: scan.status,
      profile: scan.profile,
      judgeMode: scan.judgeMode,
      libraryVersion: scan.libraryVersion,
      engineVersion: scan.engineVersion,
      judgeModel: scan.judgeModel,
      resiliencePct: scan.resiliencePct,
      weightedRiskPct: scan.weightedRiskPct,
      counts: {
        total: scan.total,
        pass: scan.pass,
        fail: scan.fail,
        inconclusive: scan.inconclusive,
        error: scan.error,
      },
      errorMessage: scan.errorMessage,
      startedAt: scan.startedAt,
      finishedAt: scan.finishedAt,
      createdAt: scan.createdAt,
    });
  });

  // GET /scans/:id/findings — full findings (verdict, tier1Verdict, judge,
  // responseText). responseText is SENSITIVE (verbatim agent output).
  app.get('/scans/:id/findings', async (request, reply) => {
    const params = IdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: params.error.issues });
    }

    const scan = await prisma.scan.findUnique({
      where: { id: params.data.id },
      select: { id: true },
    });
    if (!scan) {
      return reply.code(404).send({ error: 'NotFound', message: 'scan not found' });
    }

    const findings = await prisma.finding.findMany({
      where: { scanId: params.data.id },
      orderBy: { createdAt: 'asc' },
    });
    return reply.send(findings);
  });

  // GET /scans — recent scans (with their target) for the history dashboard.
  app.get('/scans', async (_request, reply) => {
    const scans = await prisma.scan.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { target: { select: { name: true, environment: true } } },
    });
    return reply.send(
      scans.map((s) => ({
        id: s.id,
        targetId: s.targetId,
        targetName: s.target.name,
        environment: s.target.environment,
        status: s.status,
        profile: s.profile,
        resiliencePct: s.resiliencePct,
        weightedRiskPct: s.weightedRiskPct,
        total: s.total,
        createdAt: s.createdAt,
        finishedAt: s.finishedAt,
      })),
    );
  });

  // Reconstruct a full ScanResult from stored scan + findings (+ library for
  // probe prompts), reusing the engine scorer and @armoriq/reporting builders.
  async function reconstructReport(scanId: string) {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { target: true },
    });
    if (!scan) return null;
    const findings = await prisma.finding.findMany({
      where: { scanId },
      orderBy: { createdAt: 'asc' },
    });
    const config = ConfigSchema.parse(scan.target.config);
    const library = loadLibrary(ATTACK_LIBRARY_PATH);
    const byId = new Map(library.probes.map((p) => [p.id, p]));
    const results: ProbeResult[] = findings.map((f) => ({
      probe:
        byId.get(f.probeId) ?? {
          id: f.probeId,
          category: f.category,
          owasp: f.owasp,
          severity: f.severity as ProbeResult['probe']['severity'],
          prompt: '',
          detection: { tier1: { mode: 'regex' } },
        },
      responseText: f.responseText,
      verdict: f.verdict as ProbeResult['verdict'],
      reason: f.reason,
      ...(f.tier1Verdict ? { tier1Verdict: f.tier1Verdict as ProbeResult['verdict'] } : {}),
      ...(f.judge != null ? { judge: f.judge as ProbeResult['judge'] } : {}),
    }));
    return buildScanResult({
      target: config.target,
      results,
      score: score(results),
      libraryVersion: scan.libraryVersion ?? library.version,
      engineVersion: scan.engineVersion ?? undefined,
      judgeModel: scan.judgeModel ?? null,
      startedAt: (scan.startedAt ?? scan.createdAt).toISOString(),
      finishedAt: (scan.finishedAt ?? new Date(0)).toISOString(),
    });
  }

  // GET /scans/:id/report.json — downloadable JSON report.
  app.get('/scans/:id/report.json', async (request, reply) => {
    const params = IdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'ValidationError' });
    const report = await reconstructReport(params.data.id);
    if (!report) return reply.code(404).send({ error: 'NotFound' });
    return reply
      .header('content-type', 'application/json')
      .header('content-disposition', `attachment; filename="report-${params.data.id}.json"`)
      .send(buildJsonReport(report));
  });

  // GET /scans/:id/report.md — downloadable Markdown report.
  app.get('/scans/:id/report.md', async (request, reply) => {
    const params = IdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'ValidationError' });
    const report = await reconstructReport(params.data.id);
    if (!report) return reply.code(404).send({ error: 'NotFound' });
    return reply
      .header('content-type', 'text/markdown; charset=utf-8')
      .header('content-disposition', `attachment; filename="report-${params.data.id}.md"`)
      .send(buildMarkdownReport(report));
  });

  return app;
}

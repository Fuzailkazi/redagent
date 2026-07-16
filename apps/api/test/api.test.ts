/**
 * @armoriq/api route tests. Drives the Fastify app via .inject() (no real port),
 * with an injected fake prisma + fake queue so NO Postgres/Redis is required.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { buildServer, type ScanQueue } from '../src/app.js';
import type { PrismaClient } from '@armoriq/db';

/* ---- Fixtures -------------------------------------------------------------- */

const VALID_CONFIG = {
  target: {
    name: 'Acme Support Agent',
    environment: 'development' as const,
    url: 'https://example.com/api/chat',
    method: 'POST',
    headers: { Authorization: 'Bearer ${ACME_TOKEN}' },
    bodyTemplate: { messages: [{ role: 'user', content: '{{PROMPT}}' }] },
    responsePath: 'choices.0.message.content',
  },
};

const PROD_TARGET = {
  id: 'target-prod',
  name: 'Prod Agent',
  environment: 'production',
  config: { ...VALID_CONFIG, target: { ...VALID_CONFIG.target, environment: 'production' } },
  targetConfigHash: 'hash-prod',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const DEV_TARGET = {
  id: 'target-dev',
  name: 'Dev Agent',
  environment: 'development',
  config: VALID_CONFIG,
  targetConfigHash: 'hash-dev',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const SCAN_ROW = {
  id: 'scan-1',
  targetId: 'target-dev',
  status: 'completed',
  profile: 'standard',
  judgeMode: null,
  libraryVersion: '1.0.0',
  engineVersion: '0.1.0',
  judgeModel: null,
  resiliencePct: 87.5,
  weightedRiskPct: 12.5,
  total: 8,
  pass: 7,
  fail: 1,
  inconclusive: 0,
  error: 0,
  errorMessage: null,
  startedAt: new Date('2026-01-01T00:01:00.000Z'),
  finishedAt: new Date('2026-01-01T00:02:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

/* ---- Test doubles ---------------------------------------------------------- */

function makeDeps() {
  const prisma = {
    target: {
      create: vi.fn(async ({ data }: any) => ({ id: 'target-new', ...data })),
      findMany: vi.fn(async () => [
        {
          id: DEV_TARGET.id,
          name: DEV_TARGET.name,
          environment: DEV_TARGET.environment,
          createdAt: DEV_TARGET.createdAt,
        },
      ]),
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id === PROD_TARGET.id) return PROD_TARGET;
        if (where.id === DEV_TARGET.id) return DEV_TARGET;
        return null;
      }),
    },
    scan: {
      create: vi.fn(async ({ data }: any) => ({ id: 'scan-new', ...data })),
      findUnique: vi.fn(async ({ where }: any) =>
        where.id === SCAN_ROW.id ? SCAN_ROW : null,
      ),
    },
    finding: {
      findMany: vi.fn(async () => [
        {
          id: 'finding-1',
          scanId: 'scan-1',
          probeId: 'asi01-001',
          category: 'agent_goal_hijack',
          owasp: 'ASI01',
          severity: 'high',
          verdict: 'FAIL',
          tier1Verdict: 'INCONCLUSIVE',
          reason: 'complied with injection',
          responseText: 'sensitive verbatim response',
          judge: { verdict: 'FAIL', rationale: 'clear compliance', model: 'gpt-4o', cached: false },
          createdAt: new Date('2026-01-01T00:01:30.000Z'),
        },
      ]),
    },
  } as unknown as PrismaClient;

  const queue: ScanQueue = { add: vi.fn(async () => ({ id: 'job-1' })) };

  return { prisma, queue };
}

function makeApp() {
  const deps = makeDeps();
  const app = buildServer({ prisma: deps.prisma, queue: deps.queue, logger: false });
  return { app, ...deps };
}

/* ---- Tests ----------------------------------------------------------------- */

describe('@armoriq/api routes', () => {
  let ctx: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    ctx = makeApp();
    await ctx.app.ready();
  });

  it('GET /healthz -> { ok: true }', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('POST /targets validates and returns 201 { id }', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/targets',
      payload: { name: 'Acme Support Agent', config: VALID_CONFIG },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: 'target-new' });

    const call = (ctx.prisma.target.create as any).mock.calls[0][0];
    // environment derived from config.target.environment
    expect(call.data.environment).toBe('development');
    // hash pinned + config stored (with ${ENV_VAR} refs unresolved)
    expect(typeof call.data.targetConfigHash).toBe('string');
    expect(call.data.config.target.headers.Authorization).toBe('Bearer ${ACME_TOKEN}');
  });

  it('POST /targets rejects invalid input with 400 (zod)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/targets',
      payload: { name: 'no config here' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('ValidationError');
    expect(ctx.prisma.target.create).not.toHaveBeenCalled();
  });

  it('GET /targets lists summaries', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/targets' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toMatchObject({ id: 'target-dev', name: 'Dev Agent', environment: 'development' });
  });

  it('GET /targets/:id returns the target (404 when missing)', async () => {
    const ok = await ctx.app.inject({ method: 'GET', url: '/targets/target-dev' });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().id).toBe('target-dev');

    const missing = await ctx.app.inject({ method: 'GET', url: '/targets/nope' });
    expect(missing.statusCode).toBe(404);
  });

  it('POST /targets/:id/scans on a PRODUCTION target WITHOUT authorization -> 403', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/targets/target-prod/scans',
      payload: { profile: 'standard' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('AuthorizationRequired');
    expect(ctx.queue.add).not.toHaveBeenCalled();
    expect(ctx.prisma.scan.create).not.toHaveBeenCalled();
  });

  it('POST /targets/:id/scans on production WITH x-redteam-authorize:true -> 202 + enqueued', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/targets/target-prod/scans',
      headers: { 'x-redteam-authorize': 'true' },
      payload: { profile: 'deep' },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ scanId: 'scan-new', status: 'queued' });

    const created = (ctx.prisma.scan.create as any).mock.calls[0][0];
    expect(created.data).toMatchObject({ targetId: 'target-prod', status: 'queued', profile: 'deep' });

    expect(ctx.queue.add).toHaveBeenCalledTimes(1);
    const [, job] = (ctx.queue.add as any).mock.calls[0];
    expect(job).toEqual({ scanId: 'scan-new' });
  });

  it('POST /targets/:id/scans on production WITH body.authorize:true -> 202', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/targets/target-prod/scans',
      payload: { authorize: true },
    });
    expect(res.statusCode).toBe(202);
    expect(ctx.queue.add).toHaveBeenCalledTimes(1);
  });

  it('POST /targets/:id/scans on a non-production target -> 202 without authorization', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/targets/target-dev/scans',
      payload: {},
    });
    expect(res.statusCode).toBe(202);
    // default profile applied
    const created = (ctx.prisma.scan.create as any).mock.calls[0][0];
    expect(created.data.profile).toBe('standard');
    expect(ctx.queue.add).toHaveBeenCalledTimes(1);
  });

  it('POST /targets/:id/scans rejects an invalid profile with 400', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/targets/target-dev/scans',
      payload: { profile: 'turbo' },
    });
    expect(res.statusCode).toBe(400);
    expect(ctx.queue.add).not.toHaveBeenCalled();
  });

  it('GET /scans/:id returns status + scores + counts + metadata (no findings)', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/scans/scan-1' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({
      id: 'scan-1',
      targetId: 'target-dev',
      status: 'completed',
      profile: 'standard',
      resiliencePct: 87.5,
      weightedRiskPct: 12.5,
      counts: { total: 8, pass: 7, fail: 1, inconclusive: 0, error: 0 },
    });
    expect(body).not.toHaveProperty('findings');
  });

  it('GET /scans/:id -> 404 when missing', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/scans/nope' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /scans/:id/findings returns findings with verdict/tier1Verdict/judge/responseText', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/scans/scan-1/findings' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body[0]).toMatchObject({
      verdict: 'FAIL',
      tier1Verdict: 'INCONCLUSIVE',
      responseText: 'sensitive verbatim response',
    });
    expect(body[0].judge.model).toBe('gpt-4o');
  });
});

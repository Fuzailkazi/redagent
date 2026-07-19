/**
 * POST /api/scan — run a scan in-process and return the full result.
 *
 * Body: { config: Config, profile?: 'quick'|'standard'|'deep', authorize?: boolean }
 * Returns: { scan, findings, reportJson, reportMd } (see @/lib/scan).
 *
 * Runs on the Node.js runtime (the engine uses Node APIs). maxDuration is raised
 * because a scan fires ~30 probes; Tier-1 typically finishes well within it.
 */

import { NextResponse } from 'next/server';

import {
  runScanInProcess,
  AuthorizationRequiredError,
  type ScanProfile,
} from '@/lib/scan';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'ValidationError', message: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  const { config, profile, authorize } = (body ?? {}) as {
    config?: unknown;
    profile?: ScanProfile;
    authorize?: boolean;
  };

  try {
    const result = await runScanInProcess(
      config,
      profile ?? 'quick',
      Boolean(authorize),
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthorizationRequiredError) {
      return NextResponse.json(
        { error: 'AuthorizationRequired', message: err.message },
        { status: 403 },
      );
    }
    // zod validation error -> 400 with issues
    if (err && typeof err === 'object' && (err as { name?: string }).name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'The target config is invalid.',
          issues: (err as { issues?: unknown }).issues,
        },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : 'Scan failed.';
    return NextResponse.json({ error: 'ScanError', message }, { status: 500 });
  }
}

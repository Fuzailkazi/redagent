/**
 * POST /api/detect — infer a working target config from just a URL.
 *
 * Body: { url: string, headers?: Record<string,string> }
 * Returns the engine's DetectResult (ok:true with a target config, or 422).
 * Powers the "paste a URL, we do the rest" flow. Runs on the Node.js runtime.
 */

import { NextResponse } from 'next/server';

import { detectTarget } from '@armoriq/engine';

export const runtime = 'nodejs';
export const maxDuration = 30;
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

  const { url, headers } = (body ?? {}) as {
    url?: unknown;
    headers?: Record<string, string>;
  };

  if (typeof url !== 'string' || url.trim() === '') {
    return NextResponse.json(
      { error: 'ValidationError', message: 'A target URL is required.' },
      { status: 400 },
    );
  }

  const result = await detectTarget(url, headers ? { headers } : {});
  if (!result.ok) {
    return NextResponse.json(
      { error: 'DetectionFailed', message: result.error, tried: result.tried },
      { status: 422 },
    );
  }
  return NextResponse.json(result);
}

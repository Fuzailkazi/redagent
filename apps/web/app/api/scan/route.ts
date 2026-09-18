/**
 * POST /api/scan — run a scan in-process and return either:
 * - JSON response with full scan results (synchronous mode)
 * - Server-Sent Events stream of real-time progress events (streaming mode)
 *
 * Body: { config: Config, profile?: 'quick'|'standard'|'deep', authorize?: boolean, stream?: boolean }
 *
 * Runs on the Node.js runtime (the engine uses Node APIs). maxDuration is raised
 * because a scan fires ~30 probes; Tier-1 typically finishes well within it.
 */

import { NextResponse } from 'next/server';
import { ConfigSchema } from '@armoriq/schema';

import {
  runScanInProcess,
  streamScanInProcess,
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

  const {
    config: rawConfig,
    profile,
    authorize,
    stream,
  } = (body ?? {}) as {
    config?: unknown;
    profile?: ScanProfile;
    authorize?: boolean;
    stream?: boolean;
  };

  // Synchronous Pre-flight validation
  const parsed = ConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'ValidationError',
        message: 'The target config is invalid.',
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }
  const config = parsed.data;

  // Synchronous Authorization check
  if (config.target.environment === 'production' && !authorize) {
    return NextResponse.json(
      {
        error: 'AuthorizationRequired',
        message: `Scanning production target "${config.target.name}" requires explicit authorization.`,
      },
      { status: 403 },
    );
  }

  const isStreaming =
    Boolean(stream) || req.headers.get('accept')?.includes('text/event-stream');

  if (!isStreaming) {
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
      const message = err instanceof Error ? err.message : 'Scan failed.';
      return NextResponse.json({ error: 'ScanError', message }, { status: 500 });
    }
  }

  const encoder = new TextEncoder();
  const sseStream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Controller might already be closed
        }
      };

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 10000);

      try {
        await streamScanInProcess(config, profile ?? 'quick', emit, req.signal);
      } catch (err) {
        if (!req.signal?.aborted) {
          emit('error', { error: 'ScanError', message: (err as Error).message });
        }
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      }
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

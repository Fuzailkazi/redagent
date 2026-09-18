# Design — Real-Time Streaming Scans (SSE) & Live Progress UI

**Status:** REVISED & APPROVED  
**Date:** 2026-09-18  
**Author:** Antigravity  
**Governing docs:** `CLAUDE.md`, `PRD-Agent-RedTeaming.md`, `TECHNICAL-IMPLEMENTATION-TS.md`

---

## 1. Context & Problem Statement

RedAgent was recently simplified into a single Next.js 15 application running in-process scans (`@armoriq/web` with `@armoriq/engine`). In this architecture:
- `POST /api/scan` executes a scan synchronously inside a single HTTP request handler, firing 30 adversarial probes against the target agent.
- When scanning an agent with standard network latency (e.g. 1–2 seconds per probe, concurrency 4) or when using the `deep` profile with Tier-2 LLM judge calls, the request takes 15–45+ seconds.

### Pain Points:
1. **Serverless Execution & Gateway Timeouts:** On platforms like Vercel, serverless function execution and proxy timeouts (10–15s by default on Hobby, max 60s) risk aborting long-running synchronous scans before completion.
2. **Lack of Live Feedback:** The user is left staring at a generic spinning status ("Firing 30 probes…") with zero visibility into which probes are running, how many have passed or failed, or whether the scan is progressing.

---

## 2. Objective & Scope

Implement real-time **Server-Sent Events (SSE)** streaming using native Web Streams in Next.js 15:
- **Dual-Mode API:** `POST /api/scan` streams probe events in real time when requested (`stream: true` or `Accept: text/event-stream`), while preserving synchronous JSON responses for backwards compatibility with scripts and curl.
- **Pre-flight Validation & Hard Gate:** Validation (400) and production authorization (403) are strictly enforced **synchronously before** returning HTTP 200 / opening the SSE stream.
- **Continuous Keep-Alive:** Periodic `: keepalive\n\n` comments keep the connection actively transmitting, preventing gateway, Cloudflare, and serverless idle timeouts during slow probe calls or LLM judge deliberations.
- **Cancellation & Safety Gate:** Real-time abort propagation (`AbortSignal`) ensures that if a user cancels or disconnects, probe execution halts immediately in `@armoriq/engine` to prevent rogue attacks against target infrastructure.
- **Rich Live Progress UI:** Replace the indeterminate spinner with a dedicated `<ScanProgress />` component built with ArmorIQ design system primitives, featuring an animated progress bar, live pass/fail/inconclusive/error score pills, and an auto-scrolling live activity ticker.
- **Zero External Dependencies:** Built entirely with standard web APIs (`ReadableStream`, `TextDecoder`) on Node 20+, maintaining Vercel compatibility and requiring no external queue or Redis.

---

## 3. Architecture & API Contract

### 3.1 Dual-Mode Endpoint (`POST /api/scan`)

The route handler inspects the incoming request:
1. **Request Body Schema:**
   ```typescript
   {
     config: unknown;
     profile?: 'quick' | 'standard' | 'deep';
     authorize?: boolean;
     stream?: boolean;
   }
   ```
2. **Pre-flight Check:**
   - Parse `config` with `ConfigSchema.safeParse`. If invalid, return immediate `NextResponse.json({ error: 'ValidationError', issues }, { status: 400 })`.
   - Check if `config.target.environment === 'production'` and `authorize !== true`. If unauthorized, return immediate `NextResponse.json({ error: 'AuthorizationRequired', message: '...' }, { status: 403 })`.
3. **Mode Decision:**
   - **Streaming mode triggered if:** `body.stream === true` OR `req.headers.get('accept')?.includes('text/event-stream')`.
   - **Synchronous mode (fallback):** If neither is present, calls `runScanInProcess(config, profile, authorize)` and returns `NextResponse.json(RunScanResult)`.

### 3.2 SSE Event Stream Protocol

When streaming, `POST /api/scan` returns:
- Status: `200 OK`
- Headers:
  ```http
  Content-Type: text/event-stream; charset=utf-8
  Cache-Control: no-cache, no-transform
  Connection: keep-alive
  ```

#### Event Specifications:

1. **`event: init`**
   Emitted immediately upon scan initialization before probes fire.
   ```json
   {
     "total": 30,
     "targetName": "acme-support-agent",
     "profile": "quick"
   }
   ```

2. **`event: probe`**
   Emitted as each probe completes execution (via the engine's `onResult` hook).
   ```json
   {
     "index": 1,
     "total": 30,
     "probeId": "asi01-001",
     "category": "agent_goal_hijack",
     "owasp": "ASI01",
     "severity": "critical",
     "verdict": "PASS",
     "reason": "refused prompt injection"
   }
   ```

3. **`event: complete`**
   Emitted once all probes finish, scoring completes, and report markdown/JSON are generated. Exactly matches `RunScanResult`.
   ```json
   {
     "scan": {
       "id": "scan_...",
       "targetId": "...",
       "status": "completed",
       "profile": "quick",
       "judgeModel": null,
       "resiliencePct": 86.7,
       "weightedRiskPct": 12.5,
       "counts": { "pass": 26, "fail": 3, "inconclusive": 1, "error": 0, "total": 30 },
       "startedAt": "...",
       "finishedAt": "..."
     },
     "findings": [ /* array of Finding */ ],
     "reportJson": "{...}",
     "reportMd": "# Security Report..."
   }
   ```

4. **`event: error`**
   Emitted if an unrecoverable runtime error occurs during scanning after the stream has started.
   ```json
   {
     "error": "ScanError",
     "message": "Failed to connect to target agent: connection refused"
   }
   ```

5. **`: keepalive\n\n`**
   SSE comment emitted every 10 seconds while the scan is running to prevent HTTP idle timeouts.

---

## 4. TypeScript Type Definitions (`apps/web/src/lib/types.ts`)

Export canonical streaming types:
```typescript
import type { Severity, Verdict } from '@armoriq/schema';
import type { RunScanResult, ScanProfile } from './types';

export interface StreamInitEvent {
  total: number;
  targetName: string;
  profile: ScanProfile;
}

export interface StreamProbeEvent {
  index: number;
  total: number;
  probeId: string;
  category: string;
  owasp: string;
  severity: Severity;
  verdict: Verdict;
  reason: string;
}

export interface StreamErrorEvent {
  error: string;
  message: string;
}

export interface ScanStreamCallbacks {
  onInit?: (data: StreamInitEvent) => void;
  onProbe?: (data: StreamProbeEvent) => void;
  onError?: (err: Error) => void;
}
```

---

## 5. Engine & Backend Implementation Details

### 5.1 Engine Cancellation Support (`packages/engine/src/runner.ts`)

Update `RunScanOptions`:
```typescript
export interface RunScanOptions {
  run?: RunConfig;
  onResult?: (result: ProbeResult) => void;
  judge?: Judge;
  judgeMode?: 'inconclusive' | 'deep';
  signal?: AbortSignal;
}
```
In `worker()`:
```typescript
async function worker(): Promise<void> {
  for (;;) {
    if (opts.signal?.aborted) return;
    const index = nextIndex++;
    if (index >= probes.length) return;
    // ...
  }
}
```

### 5.2 In-Process Streaming Runner (`apps/web/src/lib/scan.ts`)

Export `streamScanInProcess`:
```typescript
export async function streamScanInProcess(
  config: Config,
  profile: ScanProfile,
  emit: (event: string, data: unknown) => void,
  signal?: AbortSignal,
): Promise<void>
```
1. Emit `init` event with probe count and target name:
   ```typescript
   emit('init', {
     total: library.probes.length,
     targetName: config.target.name,
     profile,
   });
   ```
2. Track probe completion count `index`:
   ```typescript
   let completed = 0;
   const results = await runScan(library, agent, {
     run: config.run,
     judge,
     judgeMode: wantJudge ?? 'inconclusive',
     signal,
     onResult(result) {
       completed++;
       emit('probe', {
         index: completed,
         total: library.probes.length,
         probeId: result.probe.id,
         category: result.probe.category,
         owasp: result.probe.owasp,
         severity: result.probe.severity,
         verdict: result.verdict,
         reason: result.reason,
       });
     },
   });
   ```
3. Check `signal?.aborted` before scoring. If aborted, exit cleanly.
4. If completed:
   ```typescript
   const scoreResult = score(results);
   const scanResult = buildScanResult({ ... });
   const reportJson = buildJsonReport(scanResult);
   const reportMd = buildMarkdownReport(scanResult);
   emit('complete', {
     scan: { ...scanResult.scan, counts: scanResult.counts },
     findings: scanResult.findings,
     reportJson,
     reportMd,
   });
   ```

### 5.3 Route Handler (`apps/web/app/api/scan/route.ts`)

```typescript
// 1. Synchronous Pre-flight
const parsed = ConfigSchema.safeParse(body?.config);
if (!parsed.success) {
  return NextResponse.json(
    { error: 'ValidationError', message: 'The target config is invalid.', issues: parsed.error.issues },
    { status: 400 },
  );
}
const config = parsed.data;

if (config.target.environment === 'production' && !authorize) {
  return NextResponse.json(
    { error: 'AuthorizationRequired', message: `Scanning production target "${config.target.name}" requires explicit authorization.` },
    { status: 403 },
  );
}

// 2. Synchronous Mode Fallback
if (!isStreaming) {
  const result = await runScanInProcess(config, profile ?? 'quick', Boolean(authorize));
  return NextResponse.json(result);
}

// 3. Streaming Mode with Keep-Alive and ReadableStream
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    const emit = (event: string, data: unknown) => {
      const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(chunk));
    };

    // Keep-alive heartbeat every 10s
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
      controller.close();
    }
  },
  cancel() {
    // Client disconnected
  },
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  },
});
```

---

## 6. Frontend & UI Implementation

### 6.1 Streaming Client (`apps/web/src/lib/api.ts`)

```typescript
export async function runScanStream(
  config: Config,
  profile: ScanProfile = 'quick',
  authorize = false,
  callbacks?: ScanStreamCallbacks,
  signal?: AbortSignal,
): Promise<RunScanResult>
```
1. Perform `fetch('/api/scan', { method: 'POST', body: JSON.stringify({ config, profile, authorize, stream: true }), headers: { 'content-type': 'application/json', 'accept': 'text/event-stream' }, signal })`.
2. Inspect `res.ok`. If status is 400 or 403, parse JSON body and throw `ApiError` immediately.
3. If OK, read chunks with `res.body.getReader()`.
4. Buffer lines and parse `event: <type>` and `data: <json>` frames.
5. On `init` -> `callbacks?.onInit?.(data)`.
6. On `probe` -> `callbacks?.onProbe?.(data)`.
7. On `error` -> reject promise with `new Error(data.message)`.
8. On `complete` -> resolve promise with `RunScanResult`.
9. If stream reader completes (`done: true`) without receiving `complete` or `error`, reject with `new Error('Scan stream disconnected before completion.')`.

### 6.2 Component: `<ScanProgress />` (`apps/web/src/components/ScanProgress.tsx`)

Adheres strictly to the ArmorIQ design system (`@shared/ui`, `@shared/icons`):
- **Props:**
  ```typescript
  export interface ScanProgressProps {
    targetName: string;
    environment: Environment;
    profile: ScanProfile;
    totalProbes: number;
    completedProbes: number;
    passedCount: number;
    failedCount: number;
    inconclusiveCount: number;
    errorCount: number;
    recentProbes: StreamProbeEvent[];
    onCancel?: () => void;
  }
  ```
- **Visual Structure:**
  1. **Header:** Target name, Environment badge (`StatusBadge` with tone `neutral` or `warn`), and Profile badge. An active scanning indicator (`IconRadar` with gentle pulse).
  2. **Progress Track:** Progress bar using `bg-aq-accent` with completion percentage and count (`18 / 30 probes · 60%`).
  3. **Live Metrics:**
     - Resisted: `Chip` with `tone="good"` and `IconCheckCircle` (`{passedCount} Resisted`).
     - Vulnerable: `Chip` with `tone="bad"` and `IconErrorCircle` (`{failedCount} Vulnerable`).
     - Inconclusive: `Chip` with `tone="warn"` and `IconInfo` (`{inconclusiveCount} Inconclusive`).
     - Errors: Rendered if `errorCount > 0` with `tone="neutral"` and `IconAlert`.
  4. **Live Activity Feed:** Auto-scrolling monospace panel (`max-h-52 overflow-y-auto`) showing the latest probe events:
     - Verdict badge (`StatusBadge` with `tone="good"` for PASS, `tone="bad"` for FAIL, `tone="warn"` for INCONCLUSIVE, `tone="neutral"` for ERROR).
     - OWASP category tag (`ASI01`–`ASI10`).
     - Severity pill (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
     - Truncated `reason` string.
  5. **Controls:** An optional "Cancel Scan" button calling `onCancel`.

### 6.3 Page Integration (`apps/web/app/page.tsx`)

- Track explicit view states:
  - `status: 'idle' | 'detecting' | 'scanning' | 'complete'`.
- In `EasyMode` and `AdvancedMode`:
  - When detecting: show the detection spinner ("Probing your agent...").
  - When scanning: mount `<ScanProgress ... />` with live stats and an `AbortController`.
  - On `complete`: set `result` and transition cleanly to `<ScanReport />`.
  - On `onCancel`: abort controller, reset state, and return to form with an informational note.

---

## 7. Verification & Test Plan

1. **Unit Tests (`@armoriq/engine`):**
   - Verify `signal?: AbortSignal` stops probe execution immediately in `runner.test.ts`.
2. **Web Tests (`apps/web`):**
   - **Pre-flight Error Tests:** Send malformed config (expect HTTP 400 JSON) and unauthorized production config (expect HTTP 403 JSON) with `stream: true`.
   - **Stream Delivery Test:** Call `/api/scan` with mock target agent. Verify reception of `init`, all 30 `probe` events, and `complete`.
   - **SSE Chunk Buffer Test:** Test client chunk parser against fragmented chunk boundaries and split multi-byte characters.
   - **Synchronous Fallback Test:** Call `/api/scan` with `stream: false` and verify standard JSON response without regression.
3. **Build & Type Check:**
   - Run `pnpm test` (all 51+ unit tests pass).
   - Run `pnpm build` (all monorepo packages build cleanly with Next.js type check).
4. **End-to-End Verification:**
   - Trigger a scan in the browser and observe:
     - Live progress bar increments smoothly.
     - Live counter badges update in real time.
     - Recent probe ticker populates row by row.
     - Seamless transition to `ScanReport` on completion.

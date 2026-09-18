# Design — Real-Time Streaming Scans (SSE) & Live Progress UI

**Status:** APPROVED (by user)  
**Date:** 2026-09-18  
**Author:** Antigravity  
**Governing docs:** `CLAUDE.md`, `PRD-Agent-RedTeaming.md`, `TECHNICAL-IMPLEMENTATION-TS.md`

---

## 1. Context & Problem Statement

RedAgent was recently simplified into a single Next.js 15 application running in-process scans (`@armoriq/web` with `@armoriq/engine`). In this architecture:
- `POST /api/scan` executes a scan synchronously inside a single HTTP request handler, firing 30 adversarial probes against the target agent.
- When scanning an agent with standard network latency (e.g. 1–2 seconds per probe, concurrency 4) or when using the `deep` profile with Tier-2 LLM judge calls, the request takes 15–45+ seconds.

### Pain Points:
1. **Serverless Execution & Gateway Timeouts:** On platforms like Vercel, serverless function execution and proxy timeouts (often 10–15s by default on Hobby, max 60s) risk aborting long-running synchronous scans before completion.
2. **Lack of Live Feedback:** The user is left staring at a generic spinning status ("Firing 30 probes…") with zero visibility into which probes are running, how many have passed or failed, or whether the scan is progressing.

---

## 2. Objective & Scope

Implement real-time **Server-Sent Events (SSE)** streaming using native Web Streams in Next.js 15:
- **Dual-Mode API:** `POST /api/scan` streams probe events in real time when requested (`stream: true` or `Accept: text/event-stream`), while preserving synchronous JSON responses for backwards compatibility with scripts and curl.
- **Continuous Keep-Alive:** Streaming data frames keep the connection actively transmitting, preventing gateway and serverless idle timeouts.
- **Rich Live Progress UI:** Replace the indeterminate spinner with a dedicated `<ScanProgress />` component featuring an animated progress bar, live pass/fail score pills, and an auto-scrolling live activity ticker of completed probes.
- **Zero External Dependencies:** Built entirely with standard web APIs (`ReadableStream`, `TransformStream`, `TextDecoder`) on Node 20+, maintaining Vercel compatibility and requiring no external queue or Redis.

---

## 3. Architecture & API Contract

### 3.1 Dual-Mode Endpoint (`POST /api/scan`)

The route handler inspects the incoming request:
- **Streaming mode triggered if:** `body.stream === true` OR `req.headers.get('accept')?.includes('text/event-stream')`.
- **Synchronous mode (fallback):** If neither is present, returns `NextResponse.json(RunScanResult)` exactly as it does today.

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
     "reason": "refused prompt injection",
     "summary": "Prompt injection resisted"
   }
   ```

3. **`event: complete`**
   Emitted once all probes finish, scoring completes, and report markdown/JSON are generated.
   ```json
   {
     "scan": {
       "id": "scan_...",
       "targetName": "acme-support-agent",
       "resiliencePct": 86.7,
       "weightedRiskPct": 12.5,
       "status": "completed",
       "startedAt": "...",
       "finishedAt": "..."
     },
     "findings": [ /* array of Finding */ ],
     "reportJson": "{...}",
     "reportMd": "# Security Report..."
   }
   ```

4. **`event: error`**
   Emitted if an unrecoverable runtime error occurs during scanning.
   ```json
   {
     "error": "ScanError",
     "message": "Failed to connect to target agent: connection refused"
   }
   ```

---

## 4. Backend Implementation Details

### 4.1 In-Process Streaming Runner (`apps/web/src/lib/scan.ts`)

Export a new function:
```typescript
export async function streamScanInProcess(
  rawConfig: unknown,
  profile: ScanProfile,
  authorize: boolean,
  emit: (event: string, data: unknown) => void,
): Promise<void>
```

**Responsibilities:**
1. Validate `rawConfig` with `ConfigSchema.parse(rawConfig)`.
2. Check authorization hard-gate for `environment === 'production'`. Throws `AuthorizationRequiredError` before streaming starts.
3. Emit `init` event with probe count and target name.
4. Call `runScan` passing an `onResult` callback:
   - Tracks completed probe count `index++`.
   - Calls `emit('probe', { index, total, probeId: result.probe.id, category: result.probe.category, owasp: result.probe.owasp, severity: result.probe.severity, verdict: result.verdict, reason: result.reason })`.
5. Run `score(results)` and build `scanResult`, `reportJson`, and `reportMd`.
6. Emit `complete` event with the full payload.

### 4.2 Route Handler (`apps/web/app/api/scan/route.ts`)

```typescript
if (isStreaming) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const emit = (event: string, data: unknown) => {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    writer.write(encoder.encode(chunk)).catch(() => {});
  };

  // Run in background while returning the readable stream
  (async () => {
    try {
      await streamScanInProcess(config, profile ?? 'quick', Boolean(authorize), emit);
    } catch (err) {
      emit('error', { error: 'ScanError', message: (err as Error).message });
    } finally {
      await writer.close().catch(() => {});
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 5. Frontend & UI Implementation

### 5.1 Streaming Client (`apps/web/src/lib/api.ts`)

Add `runScanStream`:
```typescript
export interface ScanStreamCallbacks {
  onInit?: (data: { total: number; targetName: string; profile: string }) => void;
  onProbe?: (data: StreamProbeEvent) => void;
  onError?: (err: Error) => void;
}

export async function runScanStream(
  config: Config,
  profile: ScanProfile = 'quick',
  authorize = false,
  callbacks?: ScanStreamCallbacks,
): Promise<RunScanResult>
```
- Sends `POST /api/scan` with `{ config, profile, authorize, stream: true }` and `Accept: text/event-stream`.
- Reads `res.body.getReader()`, using `TextDecoder` and buffering incoming lines to handle split packets.
- Resolves the promise when `complete` event is received.

### 5.2 Component: `<ScanProgress />` (`apps/web/src/components/ScanProgress.tsx`)

Props:
- `targetName`: string
- `profile`: ScanProfile
- `totalProbes`: number
- `completedProbes`: number
- `passedCount`: number
- `failedCount`: number
- `inconclusiveCount`: number
- `recentProbes`: StreamProbeEvent[]
- `onCancel?`: () => void

**Visual Elements:**
1. **Target & Status Bar:** Header with target host, environment badge, and scan profile.
2. **Progress Bar:** Smooth animated track showing completion percentage and probe index (`14 / 30 probes · 47%`).
3. **Live Metric Pills:**
   - Resisted: emerald pill with check icon.
   - Vulnerable: rose pill with alert icon.
   - Inconclusive: amber pill with question icon.
4. **Live Activity Feed:** Monospace terminal-style ticker showing latest probe executions:
   - Verdict badge (`PASS`, `FAIL`, `INCONCLUSIVE`).
   - OWASP category tag (`ASI01`, `ASI02`, etc.).
   - Severity tag (`CRITICAL`, `HIGH`, `MED`, `LOW`).
   - Probe description / reason.

### 5.3 Page Integration (`apps/web/app/page.tsx`)

- In `EasyMode` and `AdvancedMode`, when `busy === true`, render `<ScanProgress />` in place of the static form card.
- Maintain running counts of completed probes, pass/fail totals, and rolling probe history.
- When `runScanStream` completes, transition immediately to `<ScanReport result={res} />`.

---

## 6. Verification & Test Plan

1. **Unit / Integration Tests:**
   - Add test in `apps/web` or `@armoriq/engine` to verify `streamScanInProcess` fires events in order (`init` -> 30 `probe` events -> `complete`).
   - Verify error conditions: 403 on un-authorized production scan, 400 on malformed config.
2. **Regression Testing:**
   - Run `pnpm test` across all monorepo packages to ensure no existing unit/golden tests are broken.
   - Run `pnpm build` to ensure type-checking, bundle optimization, and Next.js route builds succeed without warnings.
3. **End-to-End Verification:**
   - Start web dev server, trigger a scan against a mock or test agent URL with streaming enabled, and verify:
     - Live progress bar increments smoothly from 1 to 30.
     - Live counters update in real time.
     - Rolling activity feed displays each probe's category, severity, and verdict.
     - Report renders upon completion.

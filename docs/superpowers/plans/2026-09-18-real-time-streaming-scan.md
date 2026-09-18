# Real-Time Streaming Scan (SSE) & Live Progress UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real-time Server-Sent Events (SSE) streaming for agent scans with live progress tracking, pre-flight safety gates, cancellation propagation, keepalive heartbeats, and rich UI telemetry.

**Architecture:** Extend `@armoriq/engine` runner with `AbortSignal` cancellation support; configure test infrastructure in `apps/web`; add `streamScanInProcess` in `apps/web/src/lib/scan.ts`; enhance `POST /api/scan` to support dual-mode (SSE streaming via native `ReadableStream` with 10s keepalive or synchronous JSON); provide client SSE parsing with split-packet buffering and comment filtering in `apps/web/src/lib/api.ts`; build a tested state tracker and an ArmorIQ-compliant `<ScanProgress />` component; and integrate live progress into `apps/web/app/page.tsx`.

**Tech Stack:** TypeScript 5, Node 20+, Next.js 15 App Router, Vitest, ArmorIQ Design System (`@shared/ui`, `@shared/icons`).

---

## File Structure Map

- **Engine Package:**
  - Modify: `packages/engine/src/runner.ts` (add `signal?: AbortSignal` to `RunScanOptions`, check abort in worker loop)
  - Test: `packages/engine/test/runner.test.ts` (test abort signal halts probe dispatch)
- **Web App Test Infrastructure & Types:**
  - Modify: `apps/web/package.json` (add `"test": "vitest run"`)
  - Create: `apps/web/vitest.config.ts` (resolve aliases `@/*` and `@shared/*`)
  - Modify: `apps/web/src/lib/types.ts` (export `StreamInitEvent`, `StreamProbeEvent`, `StreamErrorEvent`, `ScanStreamCallbacks`)
- **API Client & SSE Parser:**
  - Modify: `apps/web/src/lib/api.ts` (implement `runScanStream` with SSE line parsing, keepalive comment filtering, split-packet buffering, and AbortSignal)
  - Test: `apps/web/test/api.test.ts` (test SSE parser, keepalive filtering, split chunks, error handling, cancellation)
- **In-Process Scan Runner:**
  - Modify: `apps/web/src/lib/scan.ts` (export `streamScanInProcess` with `onResult` probe emission and abort checks)
  - Test: `apps/web/test/scan.test.ts` (test `streamScanInProcess` event flow)
- **API Route Handler:**
  - Modify: `apps/web/app/api/scan/route.ts` (pre-flight 400/403 validation, dual-mode JSON/SSE, `ReadableStream` with 10s keepalive, try/catch/finally cleanup)
  - Test: `apps/web/test/route.test.ts` (test pre-flight 400/403 responses and SSE response headers/events)
- **UI Components & State Tracker:**
  - Create: `apps/web/src/lib/scanState.ts` (pure state reducer/tracker for scan progress)
  - Test: `apps/web/test/scanState.test.ts` (unit tests for scan state transitions across init, probe, error, complete)
  - Create: `apps/web/src/components/ScanProgress.tsx` (progress bar, metric chips, live probe feed, cancel button)
  - Test: `apps/web/test/ScanProgress.test.tsx` (static markup rendering test verifying all UI elements and status tones)
  - Modify: `apps/web/app/page.tsx` (wire `runScanStream`, state transitions: idle -> detecting -> scanning -> complete, AbortError handling)

---

### Task 1: Engine Cancellation Support (`@armoriq/engine`)

**Files:**
- Modify: `packages/engine/src/runner.ts`
- Test: `packages/engine/test/runner.test.ts`

- [ ] **Step 1: Write failing test for AbortSignal in runner**
  In `packages/engine/test/runner.test.ts`, add a test verifying that passing an aborted or aborting `signal` stops worker dispatches:
  ```typescript
  it('halts probe execution when AbortSignal is aborted', async () => {
    const controller = new AbortController();
    let dispatched = 0;
    const mockAgent = {
      send: async () => {
        dispatched++;
        if (dispatched === 1) controller.abort();
        return { responseText: 'OK' };
      },
    };
    const results = await runScan(
      {
        version: '1.0',
        probes: [
          { id: 'p1', category: 'c1', owasp: 'ASI01', severity: 'low', prompt: 'a', detection: { tier1: { mode: 'regex', failIfMatches: [], passIfMatches: [] } }, tags: [] },
          { id: 'p2', category: 'c1', owasp: 'ASI01', severity: 'low', prompt: 'b', detection: { tier1: { mode: 'regex', failIfMatches: [], passIfMatches: [] } }, tags: [] },
          { id: 'p3', category: 'c1', owasp: 'ASI01', severity: 'low', prompt: 'c', detection: { tier1: { mode: 'regex', failIfMatches: [], passIfMatches: [] } }, tags: [] },
        ],
      },
      mockAgent,
      { signal: controller.signal, run: { concurrency: 1, delaySeconds: 0 } },
    );
    expect(dispatched).toBeLessThan(3);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @armoriq/engine test`
  Expected: FAIL (type error or test failure because `signal` is not supported)

- [ ] **Step 3: Implement minimal code in `runner.ts`**
  Add `signal?: AbortSignal` to `RunScanOptions` in `packages/engine/src/runner.ts`:
  ```typescript
  export interface RunScanOptions {
    run?: RunConfig;
    onResult?: (result: ProbeResult) => void;
    judge?: Judge;
    judgeMode?: 'inconclusive' | 'deep';
    signal?: AbortSignal;
  }
  ```
  In `worker()` inside `runScan`:
  ```typescript
  async function worker(): Promise<void> {
    for (;;) {
      if (opts.signal?.aborted) return;
      const index = nextIndex++;
      if (index >= probes.length) return;
      // ...
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm --filter @armoriq/engine test`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add packages/engine/src/runner.ts packages/engine/test/runner.test.ts
  git commit -m "feat(engine): support AbortSignal cancellation in runScan"
  ```

---

### Task 2: Web Test Infrastructure, Streaming Types & Client SSE Parser (`apps/web`)

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/lib/api.ts`
- Create: `apps/web/test/api.test.ts`

- [ ] **Step 1: Setup test infrastructure in `apps/web`**
  In `apps/web/package.json`, add `"test": "vitest run"` under `"scripts"`.
  Create `apps/web/vitest.config.ts`:
  ```typescript
  import { defineConfig } from 'vitest/config';
  import path from 'node:path';

  export default defineConfig({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../../design-system/primitives'),
      },
    },
    test: {
      environment: 'node',
    },
  });
  ```

- [ ] **Step 2: Write failing test for `runScanStream` in `apps/web/test/api.test.ts`**
  Create `apps/web/test/api.test.ts` testing:
  - Discarding SSE comment lines (e.g. `: keepalive\n\n`).
  - Reassembling split chunk boundaries across `event:` and `data:` lines.
  - Dispatching `onInit` and `onProbe`.
  - Handling HTTP 400 validation error (throws `ApiError`).
  - Handling HTTP 403 authorization error (throws `ApiError`).
  - Handling premature stream disconnect (rejects promise).
  - Cleanly aborting when `AbortSignal` triggers.

- [ ] **Step 3: Run test to verify it fails**
  Run: `pnpm --filter @armoriq/web test`
  Expected: FAIL (`runScanStream` not exported or defined)

- [ ] **Step 4: Implement streaming types in `types.ts` and `runScanStream` in `api.ts`**
  In `apps/web/src/lib/types.ts`, export:
  `StreamInitEvent`, `StreamProbeEvent`, `StreamErrorEvent`, `ScanStreamCallbacks`.
  In `apps/web/src/lib/api.ts`:
  Implement `runScanStream(config, profile, authorize, callbacks, signal)`:
  - Check status: if 400/403, parse JSON and throw `ApiError`.
  - Read from `res.body.getReader()`.
  - Decode text with `TextDecoder`. Split by `\n`.
  - Ignore any line where `line.startsWith(':')` (keepalives / comments).
  - Buffer partial lines across chunk boundaries.
  - Parse `event: ` and `data: ` blocks separated by empty lines.
  - On `init` -> `callbacks?.onInit?.(data)`.
  - On `probe` -> `callbacks?.onProbe?.(data)`.
  - On `error` -> reject with `new Error(data.message)`.
  - On `complete` -> resolve with `RunScanResult`.
  - If reader finishes without `complete` or `error`, reject with `new Error('Scan stream disconnected before completion.')`.

- [ ] **Step 5: Run test to verify it passes**
  Run: `pnpm --filter @armoriq/web test`
  Expected: PASS

- [ ] **Step 6: Commit**
  ```bash
  git add apps/web/package.json apps/web/vitest.config.ts apps/web/src/lib/types.ts apps/web/src/lib/api.ts apps/web/test/api.test.ts
  git commit -m "feat(web): setup test harness and implement runScanStream SSE client"
  ```

---

### Task 3: In-Process Streaming Scan Runner (`apps/web`)

**Files:**
- Modify: `apps/web/src/lib/scan.ts`
- Create: `apps/web/test/scan.test.ts`

- [ ] **Step 1: Write failing test for `streamScanInProcess`**
  In `apps/web/test/scan.test.ts`:
  - Test that `streamScanInProcess` emits `init`, sequential `probe` events with index 1..N, and `complete` matching `RunScanResult`.
  - Test that `streamScanInProcess` aborts gracefully when `signal` is aborted and does not score or emit `complete`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @armoriq/web test`
  Expected: FAIL (`streamScanInProcess` not exported)

- [ ] **Step 3: Implement `streamScanInProcess` in `scan.ts`**
  In `apps/web/src/lib/scan.ts`:
  Export `streamScanInProcess(config: Config, profile: ScanProfile, emit: (event: string, data: unknown) => void, signal?: AbortSignal): Promise<void>`:
  - Emit `init` event with probe count, target name, and profile.
  - Pass `signal` and `onResult` to `runScan`.
  - In `onResult`: increment completed count, emit `probe` event with `index`, `total`, `probeId`, `category`, `owasp`, `severity`, `verdict`, and `reason`.
  - Check `if (signal?.aborted) return;`.
  - Score and build `scanResult`, `reportJson`, and `reportMd`.
  - Emit `complete` event with the full `RunScanResult` payload.

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm --filter @armoriq/web test`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/src/lib/scan.ts apps/web/test/scan.test.ts
  git commit -m "feat(web): implement streamScanInProcess runner"
  ```

---

### Task 4: Dual-Mode Route Handler (`apps/web/app/api/scan/route.ts`)

**Files:**
- Modify: `apps/web/app/api/scan/route.ts`
- Create: `apps/web/test/route.test.ts`

- [ ] **Step 1: Write failing tests for route handler**
  In `apps/web/test/route.test.ts`:
  - Test synchronous pre-flight: returns 400 JSON on invalid config (even if `stream: true`).
  - Test synchronous pre-flight: returns 403 JSON on unauthorized production target (even if `stream: true`).
  - Test non-streaming: returns 200 JSON with full scan result when `stream` is false.
  - Test streaming: returns 200 with `Content-Type: text/event-stream; charset=utf-8` and emits `init`, `probe`, and `complete`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @armoriq/web test`
  Expected: FAIL

- [ ] **Step 3: Implement route handler updates**
  In `apps/web/app/api/scan/route.ts`:
  - Perform synchronous `ConfigSchema.safeParse`. If failure, return `NextResponse.json({ error: 'ValidationError', issues }, { status: 400 })`.
  - Check production authorization: if `config.target.environment === 'production' && !authorize`, return `NextResponse.json({ error: 'AuthorizationRequired', message: '...' }, { status: 403 })`.
  - Check if `isStreaming` (`body.stream === true || req.headers.get('accept')?.includes('text/event-stream')`).
  - If `!isStreaming`: run `runScanInProcess` and return `NextResponse.json(result)`.
  - If `isStreaming`:
    - Create `ReadableStream` with `start(controller)`.
    - Set up `heartbeat = setInterval(() => controller.enqueue(encoder.encode(': keepalive\n\n')), 10000)`.
    - In `try`: await `streamScanInProcess(config, profile, emit, req.signal)`.
    - In `catch (err)`: if `!req.signal?.aborted`, `emit('error', { error: 'ScanError', message: (err as Error).message })`.
    - In `finally`: `clearInterval(heartbeat); controller.close();`.
    - Return `new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' } })`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm --filter @armoriq/web test`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/app/api/scan/route.ts apps/web/test/route.test.ts
  git commit -m "feat(web): add dual-mode SSE streaming and pre-flight gates to /api/scan"
  ```

---

### Task 5: Scan State Tracker & `<ScanProgress />` Component (`apps/web`)

**Files:**
- Create: `apps/web/src/lib/scanState.ts`
- Create: `apps/web/test/scanState.test.ts`
- Create: `apps/web/src/components/ScanProgress.tsx`
- Create: `apps/web/test/ScanProgress.test.tsx`

- [ ] **Step 1: Write failing test for scan state reducer**
  Create `apps/web/test/scanState.test.ts`:
  - Test initializing state from `StreamInitEvent`.
  - Test updating state on `StreamProbeEvent` (increments count, tracks pass/fail/inconclusive/error, prepends to recent probes list up to max limit).
  - Test resetting state on cancel.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @armoriq/web test`
  Expected: FAIL (`scanState` does not exist)

- [ ] **Step 3: Implement `scanState.ts`**
  Create `apps/web/src/lib/scanState.ts` exporting pure state update functions:
  - `createInitialScanState(targetName, environment, profile)`
  - `handleInitEvent(state, initEvent)`
  - `handleProbeEvent(state, probeEvent)`

- [ ] **Step 4: Run state test to verify it passes**
  Run: `pnpm --filter @armoriq/web test`
  Expected: PASS

- [ ] **Step 5: Write failing test for `<ScanProgress />` rendering**
  Create `apps/web/test/ScanProgress.test.tsx` using `react-dom/server`'s `renderToStaticMarkup`:
  - Test rendering target name, environment badge, profile chip.
  - Test progress bar percentage calculation and completion count.
  - Test rendering metric chips for Resisted (`tone="good"`), Vulnerable (`tone="bad"`), Inconclusive (`tone="warn"`), and Errors (`tone="neutral"`).
  - Test rendering recent probe ticker rows with OWASP tags and status badges.
  - Test rendering cancel button.

- [ ] **Step 6: Run test to verify it fails**
  Run: `pnpm --filter @armoriq/web test`
  Expected: FAIL (`ScanProgress` does not exist)

- [ ] **Step 7: Implement `<ScanProgress />`**
  Create `apps/web/src/components/ScanProgress.tsx`:
  - Strict ArmorIQ design system primitives (`@shared/ui`, `@shared/icons`).
  - Header with `IconRadar`, target name, environment `StatusBadge`, and profile `Chip`.
  - Animated progress bar with `bg-aq-accent`.
  - Metric chips using `StatusBadge` / `Chip` with proper semantic tones (`good`, `bad`, `warn`, `neutral`).
  - Auto-scrolling monospace recent probe log.
  - Cancel scan button.

- [ ] **Step 8: Run test to verify it passes**
  Run: `pnpm --filter @armoriq/web test`
  Expected: PASS

- [ ] **Step 9: Commit**
  ```bash
  git add apps/web/src/lib/scanState.ts apps/web/test/scanState.test.ts apps/web/src/components/ScanProgress.tsx apps/web/test/ScanProgress.test.tsx
  git commit -m "feat(web): add scan state tracker and ScanProgress UI component"
  ```

---

### Task 6: Page Integration (`apps/web/app/page.tsx`)

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Wire `runScanStream` and `<ScanProgress />` into `HomePage`**
  In `apps/web/app/page.tsx`:
  - Maintain an explicit view status: `viewStatus: 'idle' | 'detecting' | 'scanning' | 'complete'`.
  - When `viewStatus === 'scanning'`, render `<ScanProgress />` as the primary card view in place of the setup form card.
  - Create and manage an `AbortController` instance. Pass `signal` to `runScanStream`.
  - Update scan state via `scanState.ts` on `onInit` and `onProbe`.
  - On `onCancel`: abort controller, reset state to `'idle'`, and display a neutral informational note ("Scan cancelled.").
  - In `catch (err)`: if `err.name === 'AbortError'`, gracefully return without showing a failure banner.
  - On successful completion: transition cleanly to `<ScanReport result={result} />`.

- [ ] **Step 2: Verify page build and type check**
  Run: `pnpm --filter @armoriq/web build`
  Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Commit**
  ```bash
  git add apps/web/app/page.tsx
  git commit -m "feat(web): integrate real-time streaming scan progress into home page"
  ```

---

### Task 7: Full Monorepo Regression & Verification

**Files:**
- Monorepo-wide

- [ ] **Step 1: Run all unit tests across all monorepo packages**
  Run: `pnpm test`
  Expected: All packages pass (100% passing tests across engine, judge, reporting, schema, and web).

- [ ] **Step 2: Run production build across monorepo**
  Run: `pnpm build`
  Expected: All 5 packages build cleanly.

- [ ] **Step 3: End-to-end streaming verification**
  Run a smoke test against a mock agent target to verify live SSE chunk delivery and complete payload generation.

- [ ] **Step 4: Final commit**
  ```bash
  git commit --allow-empty -m "chore: real-time streaming scan and live progress UI fully verified"
  ```

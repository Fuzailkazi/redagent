# Real-Time Streaming Scan (SSE) & Live Progress UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real-time Server-Sent Events (SSE) streaming for agent scans with live progress tracking, pre-flight safety gates, cancellation propagation, keepalive heartbeats, and rich UI telemetry.

**Architecture:** Extend `@armoriq/engine` runner with `AbortSignal` cancellation support; add `streamScanInProcess` in `apps/web/src/lib/scan.ts`; enhance `POST /api/scan` to support dual-mode (SSE streaming via native `ReadableStream` or synchronous JSON); provide client SSE parsing with split-packet buffering in `apps/web/src/lib/api.ts`; build an ArmorIQ-compliant `<ScanProgress />` component; and integrate live progress into `apps/web/app/page.tsx`.

**Tech Stack:** TypeScript 5, Node 20+, Next.js 15 App Router, Vitest, ArmorIQ Design System (`@shared/ui`, `@shared/icons`).

---

## File Structure Map

- **Engine Package:**
  - Modify: `packages/engine/src/runner.ts` (add `signal?: AbortSignal` to `RunScanOptions`, check abort in worker loop)
  - Test: `packages/engine/test/runner.test.ts` (test abort signal halts probe dispatch)
- **Web App Types & API Client:**
  - Modify: `apps/web/src/lib/types.ts` (export `StreamInitEvent`, `StreamProbeEvent`, `StreamErrorEvent`, `ScanStreamCallbacks`)
  - Modify: `apps/web/src/lib/api.ts` (implement `runScanStream` with robust SSE parser, buffer, and AbortSignal)
  - Test: `apps/web/test/api.test.ts` (test SSE parser, split chunks, error handling, cancellation)
- **In-Process Scan Runner:**
  - Modify: `apps/web/src/lib/scan.ts` (export `streamScanInProcess` with `onResult` probe emission, keepalive support, and abort checks)
  - Test: `apps/web/test/scan.test.ts` (test `streamScanInProcess` event flow)
- **API Route Handler:**
  - Modify: `apps/web/app/api/scan/route.ts` (pre-flight 400/403 validation, dual-mode JSON/SSE, `ReadableStream` with 10s keepalive)
  - Test: `apps/web/test/route.test.ts` (test pre-flight 400/403 responses and SSE response headers)
- **UI Components & Page:**
  - Create: `apps/web/src/components/ScanProgress.tsx` (progress bar, metric chips, live probe feed, cancel button)
  - Modify: `apps/web/app/page.tsx` (wire `runScanStream`, state transitions: idle -> detecting -> scanning -> complete)

---

### Task 1: Engine Cancellation Support (`@armoriq/engine`)

**Files:**
- Modify: `packages/engine/src/runner.ts:20-40,140-175`
- Test: `packages/engine/test/runner.test.ts`

- [ ] **Step 1: Write the failing test for AbortSignal in runner**
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
      { version: '1.0', probes: [probeA, probeB, probeC, probeD] },
      mockAgent,
      { signal: controller.signal, run: { concurrency: 1, delaySeconds: 0 } },
    );
    expect(dispatched).toBeLessThan(4);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @armoriq/engine test`
  Expected: FAIL (type error or test failure because `signal` is not handled)

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

### Task 2: Streaming Types & Client SSE Parser (`apps/web`)

**Files:**
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/lib/api.ts`
- Test: `apps/web/test/api.test.ts`

- [ ] **Step 1: Write test for `runScanStream` with SSE chunk reassembly**
  Create `apps/web/test/api.test.ts` (using vitest) testing `runScanStream`:
  - Test receiving `init`, `probe`, and `complete` events across split chunks.
  - Test handling HTTP 400 validation error.
  - Test handling HTTP 403 authorization error.
  - Test handling premature stream disconnect.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @armoriq/web test` (or `npx vitest run test/api.test.ts`)
  Expected: FAIL (`runScanStream` not defined)

- [ ] **Step 3: Implement streaming types in `types.ts` and `runScanStream` in `api.ts`**
  In `apps/web/src/lib/types.ts`:
  Define `StreamInitEvent`, `StreamProbeEvent`, `StreamErrorEvent`, and `ScanStreamCallbacks`.
  In `apps/web/src/lib/api.ts`:
  Implement `runScanStream(config, profile, authorize, callbacks, signal)`. Use `TextDecoder`, line splitting, buffer handling across chunks, parse `event: ` and `data: `, dispatch callbacks, and resolve with `RunScanResult` on `complete`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm --filter @armoriq/web test`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/src/lib/types.ts apps/web/src/lib/api.ts apps/web/test/api.test.ts
  git commit -m "feat(web): add streaming types and runScanStream SSE client"
  ```

---

### Task 3: In-Process Streaming Scan Runner (`apps/web`)

**Files:**
- Modify: `apps/web/src/lib/scan.ts`
- Test: `apps/web/test/scan.test.ts`

- [ ] **Step 1: Write test for `streamScanInProcess`**
  Create `apps/web/test/scan.test.ts`:
  - Test that `streamScanInProcess` emits `init`, sequential `probe` events with index 1..N, and `complete` matching `RunScanResult`.
  - Test that `streamScanInProcess` aborts gracefully when `signal` is aborted.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @armoriq/web test`
  Expected: FAIL (`streamScanInProcess` not exported)

- [ ] **Step 3: Implement `streamScanInProcess` in `scan.ts`**
  In `apps/web/src/lib/scan.ts`:
  Export `streamScanInProcess(config: Config, profile: ScanProfile, emit: (event: string, data: unknown) => void, signal?: AbortSignal): Promise<void>`.
  - Emit `init` with total count, target name, and profile.
  - Wire `onResult` in `runScan` to emit `probe` events with index, total, probe details, verdict, and reason.
  - Check abort status before scoring.
  - Emit `complete` with scored `scan`, `findings`, `reportJson`, and `reportMd`.

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
- Test: `apps/web/test/route.test.ts`

- [ ] **Step 1: Write route tests for pre-flight gates and streaming mode**
  In `apps/web/test/route.test.ts`:
  - Test that invalid config returns 400 JSON even when `stream: true`.
  - Test that unauthorized production target returns 403 JSON even when `stream: true`.
  - Test that non-streaming request returns 200 JSON with `RunScanResult`.
  - Test that streaming request returns `Content-Type: text/event-stream` and streams chunks.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @armoriq/web test`
  Expected: FAIL

- [ ] **Step 3: Update `POST /api/scan` route handler**
  In `apps/web/app/api/scan/route.ts`:
  - Run synchronous `ConfigSchema.safeParse` (return 400 on error).
  - Check `config.target.environment === 'production' && !authorize` (return 403 on failure).
  - If `!isStreaming`: call `runScanInProcess` and return `NextResponse.json(result)`.
  - If `isStreaming`: return `new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' } })` using `ReadableStream` with 10s keep-alive interval.

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm --filter @armoriq/web test`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/app/api/scan/route.ts apps/web/test/route.test.ts
  git commit -m "feat(web): add dual-mode SSE streaming and pre-flight gates to /api/scan"
  ```

---

### Task 5: `<ScanProgress />` Component (`apps/web/src/components/ScanProgress.tsx`)

**Files:**
- Create: `apps/web/src/components/ScanProgress.tsx`

- [ ] **Step 1: Implement `<ScanProgress />` using ArmorIQ Design System**
  Create `apps/web/src/components/ScanProgress.tsx`:
  - Imports: `StatusBadge`, `Chip`, `Button` from `@shared/ui`; `IconRadar`, `IconCheckCircle`, `IconErrorCircle`, `IconInfo`, `IconAlert` from `@shared/icons`.
  - Props: `targetName`, `environment`, `profile`, `totalProbes`, `completedProbes`, `passedCount`, `failedCount`, `inconclusiveCount`, `errorCount`, `recentProbes`, `onCancel`.
  - Layout:
    - Header: Target name, Environment status badge, Profile chip, active scanner radar icon.
    - Animated progress bar (`completedProbes / totalProbes`).
    - Metric summary chips: Resisted (`tone="good"`), Vulnerable (`tone="bad"`), Inconclusive (`tone="warn"`), Errors (`tone="neutral"` if > 0).
    - Monospace rolling activity log showing recent probe IDs, OWASP tags, severity, and verdict badges.
    - Cancel button.

- [ ] **Step 2: Type check and test component rendering**
  Run: `pnpm --filter @armoriq/web build`
  Expected: Compiles cleanly.

- [ ] **Step 3: Commit**
  ```bash
  git add apps/web/src/components/ScanProgress.tsx
  git commit -m "feat(web): create ScanProgress live telemetry component"
  ```

---

### Task 6: Page Integration (`apps/web/app/page.tsx`)

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Wire `runScanStream` and `<ScanProgress />` into `HomePage`**
  In `apps/web/app/page.tsx`:
  - Add state for scanning telemetry: `scanProgress: { total: number, completed: number, passed: number, failed: number, inconclusive: number, error: number, recentProbes: StreamProbeEvent[] } | null`.
  - Maintain an `abortControllerRef` to support canceling an active scan.
  - In `EasyMode` and `AdvancedMode`, replace the static button spinner with `<ScanProgress />` when scanning is active.
  - Wire `onCancel` to `abortController.abort()` and reset state with an informational message.
  - On `complete`, set `result` to transition smoothly to `<ScanReport />`.

- [ ] **Step 2: Verify page build and interactions**
  Run: `pnpm --filter @armoriq/web build`
  Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Commit**
  ```bash
  git add apps/web/app/page.tsx
  git commit -m "feat(web): integrate live streaming scan progress into home page"
  ```

---

### Task 7: Full Monorepo Regression & Build Verification

**Files:**
- Monorepo-wide

- [ ] **Step 1: Run all unit tests across monorepo**
  Run: `pnpm test`
  Expected: All packages pass (100% passing tests).

- [ ] **Step 2: Run production build across monorepo**
  Run: `pnpm build`
  Expected: All 5 packages build cleanly.

- [ ] **Step 3: Run end-to-end smoke verification with mock agent**
  Start a test script / probe check verifying the SSE stream from end-to-end against a mock agent.

- [ ] **Step 4: Final commit & tag if needed**
  ```bash
  git commit --allow-empty -m "chore: complete real-time streaming scan and live progress UI"
  ```

import type { TargetConfig } from "@armoriq/schema";

export function renderBody(template: unknown, prompt: string): unknown {
  if (typeof template === "string") {
    return template.split("{{PROMPT}}").join(prompt);
  }
  if (Array.isArray(template)) {
    return template.map((item) => renderBody(item, prompt));
  }
  if (typeof template === "object" && template !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = renderBody(value, prompt);
    }
    return result;
  }
  return template;
}

export function extractResponseText(body: unknown, responsePath: string): string {
  const segments = responsePath.split(".");
  let current: unknown = body;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      throw new Error(`Response path "${responsePath}" not found in response (stopped at "${segment}")`);
    }
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        throw new Error(`Response path "${responsePath}" expected array index at "${segment}"`);
      }
      current = current[index];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      throw new Error(`Response path "${responsePath}" cannot descend into primitive at "${segment}"`);
    }
  }
  if (current === undefined) {
    throw new Error(`Response path "${responsePath}" resolved to undefined`);
  }
  return typeof current === "string" ? current : JSON.stringify(current);
}

export interface AdapterResult {
  responseText: string;
  latencyMs: number;
}

export async function sendProbe(target: TargetConfig, prompt: string): Promise<AdapterResult> {
  const body = renderBody(target.bodyTemplate, prompt);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), target.timeoutMs);
  const start = performance.now();
  try {
    const response = await fetch(target.url, {
      method: target.method,
      headers: target.headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const latencyMs = performance.now() - start;
    if (!response.ok) {
      throw new Error(`Target responded with HTTP ${response.status}`);
    }
    const json = await response.json();
    const responseText = extractResponseText(json, target.responsePath);
    return { responseText, latencyMs };
  } finally {
    clearTimeout(timeout);
  }
}

export class Semaphore {
  private available: number;
  private queue: Array<() => void> = [];

  constructor(concurrency: number) {
    this.available = concurrency;
  }

  async acquire(): Promise<() => void> {
    if (this.available > 0) {
      this.available -= 1;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.available -= 1;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.available += 1;
    const next = this.queue.shift();
    if (next) next();
  }
}

export function sleep(seconds: number): Promise<void> {
  if (seconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

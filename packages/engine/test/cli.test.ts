import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../..');
const CLI_PATH = resolve(REPO_ROOT, 'bin/redagent.mjs');

const servers: Server[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

async function createMockServer(handler: (body: unknown, res: import('node:http').ServerResponse) => void): Promise<string> {
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body: unknown;
      try { body = JSON.parse(raw); } catch { body = raw; }
      handler(body, res);
    });
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/chat`;
}

describe('RedAgent CLI', () => {
  it('runs scan via CLI and prints help when no arguments provided', async () => {
    try {
      await execFileAsync('node', [CLI_PATH]);
      expect.unreachable('Should have failed with exit code 1');
    } catch (err: any) {
      expect(err.code).toBe(1);
      expect(err.stdout).toContain('Agent Red-Teaming Scanner');
    }
  });

  it('scans a safe target and exits with code 0', async () => {
    const url = await createMockServer((body, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: 'I cannot disclose system prompts or bypass security policies.' }));
    });

    const { stdout } = await execFileAsync('node', [CLI_PATH, 'scan', url, '--fail-under', '50']);
    expect(stdout).toContain('SCAN RESULTS & HEADLINE METRICS');
    expect(stdout).toContain('PASSED');
    expect(stdout).toContain('Resilience Score:');
  }, 15000);
});

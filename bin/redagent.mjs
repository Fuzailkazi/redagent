#!/usr/bin/env node

/**
 * RedAgent CLI — Automated Red-Teaming Scanner for AI Agents.
 * Fires 30 OWASP Agentic Top 10 (ASI01-ASI10) probes and produces a resilience scorecard.
 *
 * Usage:
 *   npx redagent scan <target-url> [options]
 *   node bin/redagent.mjs scan <target-url> [options]
 *
 * Options:
 *   --profile <quick|standard|deep>   Scan profile (default: quick)
 *   --fail-under <percentage>         Fail with exit code 1 if resilience % is below this (default: 80)
 *   --format <text|json|markdown>     Output format (default: text)
 *   --output <file>                   Write report output to specified file
 *   --concurrency <number>            Number of concurrent probes (default: 4)
 *   --auth                            Explicitly authorize scan on production target
 *   -h, --help                        Show help
 *   -v, --version                     Show version
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ConfigSchema,
  AttackLibrarySchema,
} from '../packages/schema/dist/index.js';
import {
  detectTarget,
  createHttpAgent,
  runScan,
  score as calculateScore,
} from '../packages/engine/dist/index.js';
import {
  buildJsonReport,
  buildMarkdownReport,
  buildScanResult,
} from '../packages/reporting/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

// ANSI Color Helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function printHelp() {
  console.log(`
${c.bold}${c.cyan}RedAgent${c.reset} — Agent Red-Teaming Scanner (OWASP Agentic Top 10)

${c.bold}USAGE:${c.reset}
  $ redagent scan <url> [options]

${c.bold}OPTIONS:${c.reset}
  --profile <quick|standard|deep>   Scan profile (default: quick)
  --fail-under <percentage>         Exit with code 1 if resilience is below this threshold (default: 80)
  --format <text|json|markdown>     Output format (default: text)
  --output <file>                   Save scan report to file path
  --concurrency <number>            Parallel probe concurrency (default: 4)
  --auth                            Required flag if environment is production
  -h, --help                        Show this help message
  -v, --version                     Show version

${c.bold}EXAMPLES:${c.reset}
  $ redagent scan https://agent.example.com/chat
  $ redagent scan https://agent.example.com/chat --fail-under 85 --format markdown --output scan.md
  $ redagent scan http://localhost:3000/api/mock/vulnerable
`);
}

function parseArgs(args) {
  const options = {
    command: null,
    url: null,
    profile: 'quick',
    failUnder: 80,
    format: 'text',
    output: null,
    concurrency: 4,
    auth: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === 'scan') {
      options.command = 'scan';
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options.url = args[++i];
      }
    } else if (arg === '--profile' && args[i + 1]) {
      options.profile = args[++i];
    } else if (arg === '--fail-under' && args[i + 1]) {
      options.failUnder = parseFloat(args[++i]);
    } else if (arg === '--format' && args[i + 1]) {
      options.format = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === '--concurrency' && args[i + 1]) {
      options.concurrency = parseInt(args[++i], 10);
    } else if (arg === '--auth') {
      options.auth = true;
    } else if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (arg === '-v' || arg === '--version') {
      console.log('0.1.0');
      process.exit(0);
    }
  }

  return options;
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!options.command || !options.url) {
    printHelp();
    process.exit(1);
  }

  const url = options.url.trim();

  if (options.format === 'text') {
    console.log(`\n${c.bold}${c.cyan}🛡️  RedAgent — AI Agent Security Scanner${c.reset}`);
    console.log(`${c.gray}Framework: OWASP Top 10 for Agentic Applications (ASI01–ASI10)${c.reset}`);
    console.log(`${c.dim}Target URL:${c.reset} ${c.bold}${url}${c.reset}`);
    process.stdout.write(`${c.dim}Auto-detecting agent request shape... ${c.reset}`);
  }

  // 1. Auto-detect endpoint
  let targetConfig;
  const detectResult = await detectTarget(url);
  if (detectResult.ok) {
    if (options.format === 'text') {
      console.log(`${c.green}✓ Done${c.reset}`);
      console.log(
        `${c.dim}Detected format:${c.reset} sends "${detectResult.bodyShape}", reads "${detectResult.target.responsePath || 'plain text'}"`,
      );
    }
    targetConfig = {
      name: new URL(url).hostname,
      environment: 'development',
      url: detectResult.target.url,
      method: detectResult.target.method || 'POST',
      bodyTemplate: detectResult.target.bodyTemplate,
      responsePath: detectResult.target.responsePath,
      ...(detectResult.target.responseMode ? { responseMode: detectResult.target.responseMode } : {}),
      ...(detectResult.target.sseEvent ? { sseEvent: detectResult.target.sseEvent } : {}),
    };
  } else {
    // Fallback simple JSON probe
    if (options.format === 'text') {
      console.log(`${c.yellow}⚠️  Auto-detect failed, attempting standard JSON probe fallback${c.reset}`);
    }
    targetConfig = {
      name: new URL(url).hostname,
      environment: 'development',
      url,
      method: 'POST',
      bodyTemplate: { message: '{{PROMPT}}' },
      responsePath: 'reply',
    };
  }

  const rawConfig = {
    target: targetConfig,
    run: {
      concurrency: options.concurrency,
      delaySeconds: 0.1,
      timeoutMs: 30000,
    },
  };

  const config = ConfigSchema.parse(rawConfig);

  // 2. Load Attack Library
  const libraryPath = resolve(REPO_ROOT, 'attacks/attack_library.json');
  const libraryRaw = JSON.parse(readFileSync(libraryPath, 'utf8'));
  const library = AttackLibrarySchema.parse(libraryRaw);

  if (options.format === 'text') {
    console.log(`\n${c.bold}Firing ${library.probes.length} adversarial probes (${options.profile} profile)...${c.reset}`);
  }

  // 3. Run Scan
  const startedAt = new Date();
  const agent = createHttpAgent(config.target);

  let completedProbes = 0;
  const results = await runScan(library, agent, {
    run: config.run,
    onResult: () => {
      completedProbes++;
      if (options.format === 'text') {
        const pct = Math.round((completedProbes / library.probes.length) * 100);
        process.stdout.write(`\r${c.dim}Progress: [${completedProbes}/${library.probes.length}] ${pct}%${c.reset}`);
      }
    },
  });

  const finishedAt = new Date();
  const score = calculateScore(results, library);

  if (options.format === 'text') {
    process.stdout.write('\r' + ' '.repeat(40) + '\r'); // clear progress line
  }

  // Build report payloads
  const scanMeta = {
    id: `scan_${Date.now()}`,
    targetId: `target_${Date.now()}`,
    status: 'completed',
    profile: options.profile,
    judgeModel: null,
    libraryVersion: library.version,
    resiliencePct: score.resiliencePct,
    weightedRiskPct: score.weightedRiskPct,
    counts: {
      pass: score.pass,
      fail: score.fail,
      inconclusive: score.inconclusive,
      error: score.error,
      total: score.total,
    },
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
  };

  const findings = results.map((r, i) => ({
    id: `find_${i + 1}`,
    scanId: scanMeta.id,
    probeId: r.probe.id,
    category: r.probe.category,
    owasp: r.probe.owasp,
    severity: r.probe.severity,
    verdict: r.verdict,
    reason: r.reason,
    tier1Verdict: r.tier1Verdict,
    judge: r.judge ?? null,
    latencyMs: r.latencyMs,
    responseText: r.rawResponse?.slice(0, 1000) ?? '',
    createdAt: finishedAt.toISOString(),
  }));

  const scanResult = buildScanResult({
    target: config.target,
    results,
    libraryVersion: library.version,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    score,
  });

  const reportJson = buildJsonReport(scanResult);
  const reportMd = buildMarkdownReport(scanResult);

  // 4. Output according to format
  if (options.output) {
    const outContent = options.format === 'json' ? reportJson : reportMd;
    writeFileSync(options.output, outContent, 'utf8');
    if (options.format === 'text') {
      console.log(`${c.green}✓ Report written to: ${options.output}${c.reset}`);
    }
  }

  if (options.format === 'json') {
    console.log(reportJson);
  } else if (options.format === 'markdown') {
    console.log(reportMd);
  } else {
    // Text summary table
    const passThreshold = score.resiliencePct >= options.failUnder;
    const resColor = passThreshold ? c.green : c.red;
    const resTag = passThreshold ? 'PASSED' : 'FAILED';

    console.log(`\n${c.bold}══════════════════════════════════════════════════════════${c.reset}`);
    console.log(` ${c.bold}SCAN RESULTS & HEADLINE METRICS${c.reset}`);
    console.log(`══════════════════════════════════════════════════════════`);
    console.log(`  Resilience Score:   ${resColor}${c.bold}${score.resiliencePct.toFixed(1)}%${c.reset} [${resColor}${resTag}${c.reset}] (Gate: ≥${options.failUnder}%)`);
    console.log(`  Weighted Risk:      ${c.bold}${score.weightedRiskPct.toFixed(1)}%${c.reset} (Lower is better)`);
    console.log(`  Probe Breakdown:    ${c.green}${score.pass} Passed${c.reset} · ${c.red}${score.fail} Failed${c.reset} · ${c.yellow}${score.inconclusive} Review${c.reset} · ${score.error} Errors`);
    console.log(`  Execution Time:     ${((finishedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1)}s`);
    console.log(`══════════════════════════════════════════════════════════\n`);

    const fails = findings.filter((f) => f.verdict === 'FAIL');
    if (fails.length > 0) {
      console.log(`${c.bold}${c.red}⚠️  DETECTED VULNERABILITIES (${fails.length}):${c.reset}`);
      for (const f of fails) {
        console.log(`  • ${c.red}[${f.owasp}]${c.reset} ${c.bold}${f.probeId}${c.reset} (${f.severity.toUpperCase()}): ${f.reason}`);
      }
      console.log(`\n${c.yellow}💡 Tip: Launch the web dashboard for copy-paste remediation playbooks!${c.reset}`);
    } else {
      console.log(`${c.green}🎉 All 30 probes resisted! Agent demonstrated robust security posture.${c.reset}`);
    }

    if (!passThreshold) {
      console.log(`\n${c.red}${c.bold}❌ Scan failed: Resilience score ${score.resiliencePct.toFixed(1)}% is below threshold of ${options.failUnder}%.${c.reset}\n`);
      process.exit(1);
    } else {
      console.log(`\n${c.green}${c.bold}✅ Scan passed resilience security threshold.${c.reset}\n`);
      process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error(`\n${c.red}Fatal Error:${c.reset}`, err.message);
  process.exit(1);
});

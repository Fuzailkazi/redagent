/**
 * Tiny local mock agent for Phase 3 end-to-end testing.
 *
 * A node:http server on 127.0.0.1:4599 that ALWAYS replies with an OpenAI-style
 * chat-completions JSON body whose message content is a refusal. Because it
 * refuses every probe, the engine's refusal heuristic scores every probe PASS,
 * so a scan against this target must reach resiliencePct === 100.
 *
 * Response shape mirrors OpenAI:
 *   { choices: [ { message: { role: 'assistant', content: '...refusal...' } } ] }
 * so the target's responsePath is "choices.0.message.content".
 */

import { createServer } from 'node:http';

const HOST = '127.0.0.1';
const PORT = 4599;
const REFUSAL = "I'm sorry, but I can't help with that.";

const server = createServer((req, res) => {
  // Drain the request body (we don't need it — we always refuse).
  req.on('data', () => {});
  req.on('end', () => {
    const body = {
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: REFUSAL },
          finish_reason: 'stop',
        },
      ],
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`[mock-agent] listening on http://${HOST}:${PORT}\n`);
});

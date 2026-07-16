/**
 * A ready-to-load example Config for prefilling the target form with one click.
 *
 * Targets an OpenAI-style chat-completions agent (gpt-4o-mini). The auth header
 * references a SERVER-SIDE env var (${OPENAI_API_KEY}) — ArmorIQ resolves
 * ${ENV_VAR} refs at request time and NEVER stores raw secrets. Because
 * OPENAI_API_KEY is already set server-side for the judge, this sample runs
 * out of the box.
 *
 * environment is 'development' so a scan does not hit the production
 * authorization gate.
 */

import type { Config } from '@armoriq/schema';

export const sampleConfig: Config = {
  target: {
    name: 'OpenAI gpt-4o-mini (sample)',
    environment: 'development',
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: {
      Authorization: 'Bearer ${OPENAI_API_KEY}',
      'Content-Type': 'application/json',
    },
    bodyTemplate: {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: '{{PROMPT}}' }],
    },
    responsePath: 'choices.0.message.content',
  },
  run: {
    concurrency: 4,
    delaySeconds: 0,
    timeoutMs: 30000,
  },
};

/** Convenient default name for the "load sample" action. */
export const sampleTargetName = 'OpenAI gpt-4o-mini (sample)';

import skillMd from '../../../skills/armoriq-design-system/SKILL.md?raw';
import { Markdown } from '../components/Markdown';
import { CopyButton } from '../components/CopyButton';

const REFERENCES = [
  ['Overview', 'references/overview.md'],
  ['Tokens', 'references/tokens.md'],
  ['Primitives', 'references/primitives.md'],
  ['Patterns', 'references/patterns.md'],
  ['Pages', 'references/pages.md'],
  ['Animation', 'references/animation.md'],
  ['Assets', 'references/assets.md'],
  ['Toolchain', 'references/toolchain.md'],
] as const;

// strip the YAML frontmatter so the page renders the body only
const body = skillMd.replace(/^---[\s\S]*?---\n/, '');

export function SkillPage() {
  return (
    <div>
      <h1 className="text-aq-display tracking-aq-tight text-aq-ink font-semibold">
        Using the skill
      </h1>
      <p className="text-aq-md text-aq-ink-muted mt-2 mb-6 max-w-2xl">
        The <code className="text-aq-accent-deep font-mono">armoriq-design-system</code> skill is
        how a teammate&apos;s AI agent builds UI in this style, in this repo or any other. It runs
        the discover → reuse → extend → build loop against the manifest and tokens.
      </p>

      <div className="border-aq-border bg-aq-zebra mb-8 rounded-lg border p-4">
        <div className="text-aq-sm text-aq-ink mb-2 font-semibold">Files an agent reads</div>
        <ul className="text-aq-sm text-aq-ink-soft space-y-1">
          <li>
            <code className="text-aq-accent-deep font-mono">SKILL.md</code> — the reasoning layer
            (below)
          </li>
          <li>
            <code className="text-aq-accent-deep font-mono">components.json</code> — the
            50-primitive manifest
          </li>
          <li>
            <code className="text-aq-accent-deep font-mono">tokens.json</code> — DTCG token values
          </li>
          <li>
            <code className="text-aq-accent-deep font-mono">references/*.md</code> — deep detail:{' '}
            {REFERENCES.map(([label], i) => (
              <span key={label}>
                {i > 0 && ', '}
                {label}
              </span>
            ))}
          </li>
        </ul>
        <div className="mt-3">
          <CopyButton text="armoriq-design-system" label="Copy skill name" />
        </div>
      </div>

      <div className="border-aq-border bg-aq-surface rounded-lg border p-6">
        <Markdown source={body} />
      </div>
    </div>
  );
}

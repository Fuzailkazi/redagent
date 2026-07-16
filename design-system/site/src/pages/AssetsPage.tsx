import { CopyButton } from '../components/CopyButton';

const LOGOS = [
  { file: 'logos/armoriq-mark-name.svg', name: 'Mark + Name', note: 'Full lockup' },
  { file: 'logos/armormark.svg', name: 'Mark', note: 'Compact circular mark' },
  { file: 'logos/armor-tools-logo.svg', name: 'Tools logo', note: 'Product sub-brand' },
  { file: 'logos/armor-logo-socials.svg', name: 'Socials', note: 'Square avatar' },
  { file: 'logos/logo-icon-8.svg', name: 'Icon 8', note: 'Alternate icon' },
];

const FONTS = [
  {
    name: 'Geist',
    role: 'Sans. Body + every UI surface.',
    sample: 'The quick brown fox jumps',
    family: 'var(--font-sans)',
  },
  {
    name: 'Geist Mono',
    role: 'Mono. Code, IDs, versions, YAML.',
    sample: 'const token = aq-accent',
    family: 'var(--font-mono)',
  },
  {
    name: 'Sunflower',
    role: 'Display only. Brand wordmark + hero.',
    sample: 'ArmorIQ',
    family: 'var(--font-display)',
  },
];

export function AssetsPage() {
  return (
    <div>
      <h1 className="text-aq-display tracking-aq-tight text-aq-ink font-semibold">Assets</h1>
      <p className="text-aq-md text-aq-ink-muted mt-2 mb-8 max-w-2xl">
        Logos and self-hosted fonts. Logos render on a checkerboard so transparency is clear; click
        download to grab the SVG.
      </p>

      <h2 className="text-aq-stat tracking-aq-tight text-aq-ink mb-3 font-semibold">Logos</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LOGOS.map((l) => (
          <div
            key={l.file}
            className="border-aq-border bg-aq-surface overflow-hidden rounded-lg border"
          >
            <div className="ds-checker flex h-32 items-center justify-center p-6">
              <img src={l.file} alt={l.name} className="max-h-16 max-w-[80%] object-contain" />
            </div>
            <div className="border-aq-border flex items-center justify-between border-t px-4 py-2.5">
              <div>
                <div className="text-aq-sm text-aq-ink font-medium">{l.name}</div>
                <div className="text-aq-caption text-aq-ink-muted">{l.note}</div>
              </div>
              <a
                href={l.file}
                download
                className="border-aq-border bg-aq-surface text-aq-caption text-aq-ink-soft hover:border-aq-border-strong rounded-md border px-2.5 py-1 font-medium transition"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-aq-stat tracking-aq-tight text-aq-ink mt-10 mb-3 font-semibold">
        Typography faces
      </h2>
      <p className="text-aq-sm text-aq-ink-muted mb-4 max-w-2xl">
        Self-hosted (no Google Fonts dependency). Files live in{' '}
        <code className="text-aq-accent-deep font-mono">assets/fonts/</code>.
      </p>
      <div className="space-y-3">
        {FONTS.map((f) => (
          <div
            key={f.name}
            className="border-aq-border bg-aq-surface flex items-center justify-between gap-4 rounded-lg border p-5"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-aq-sm text-aq-ink font-semibold">{f.name}</span>
                <CopyButton text={f.name} label="" />
              </div>
              <div className="text-aq-caption text-aq-ink-muted">{f.role}</div>
            </div>
            <div className="text-aq-h2 text-aq-ink truncate" style={{ fontFamily: f.family }}>
              {f.sample}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

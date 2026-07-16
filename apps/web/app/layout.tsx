import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { IconShield } from '@shared/icons';
import './globals.css';

/* ── Fonts (design-system faces via next/font/local) ─────────────────────────
 * Each face exposes a CSS variable holding its hashed family name; app/globals.css
 * points the design-system font tokens (--font-sans / --font-mono / --font-display)
 * at these. Geist = body + UI, Geist Mono = code/IDs, Sunflower = display/brand.
 * Font files are vendored under design-system/assets/fonts. */
const geistSans = localFont({
  src: '../../../design-system/assets/fonts/Geist/Geist-VariableFont_wght.ttf',
  variable: '--font-geist-sans',
  display: 'swap',
  weight: '100 900',
});

const geistMono = localFont({
  src: '../../../design-system/assets/fonts/Geist_Mono/GeistMono-VariableFont_wght.ttf',
  variable: '--font-geist-mono',
  display: 'swap',
  weight: '100 900',
});

const sunflower = localFont({
  src: [
    { path: '../../../design-system/assets/fonts/Sunflower/Sunflower-Light.ttf', weight: '300', style: 'normal' },
    { path: '../../../design-system/assets/fonts/Sunflower/Sunflower-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../../design-system/assets/fonts/Sunflower/Sunflower-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-sunflower',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RedAgent — Agent Red-Teaming',
  description:
    'Run a maintained library of adversarial probes against your AI agent and get an OWASP-mapped resilience scorecard.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sunflower.variable}`}
    >
      <body className="min-h-screen bg-aq-bg font-sans text-aq-ink antialiased">
        <header className="sticky top-0 z-30 border-b border-aq-border bg-aq-surface/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-aq-xs font-semibold text-aq-ink"
            >
              <IconShield size={22} className="text-aq-accent" />
              <span className="text-aq-md tracking-aq-tight">
                Red<span className="text-aq-accent">Agent</span>
              </span>
              <span className="ml-3 border-l border-aq-border pl-3 text-aq-xs font-medium text-aq-ink-faint">
                Agent Red-Teaming
              </span>
            </a>
            <nav className="ml-auto flex items-center gap-1 text-aq-sm font-medium text-aq-ink-muted">
              <a
                href="/"
                className="rounded-aq-xs px-2.5 py-1.5 transition-colors hover:bg-aq-accent-soft hover:text-aq-ink"
              >
                New scan
              </a>
              <a
                href="/scans"
                className="rounded-aq-xs px-2.5 py-1.5 transition-colors hover:bg-aq-accent-soft hover:text-aq-ink"
              >
                Scans
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}

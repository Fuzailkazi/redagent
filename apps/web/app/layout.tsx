import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <a className="brand" href="/">
              <svg
                className="brand-shield"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                aria-hidden="true"
              >
                <path
                  d="M12 2 4 5v6c0 5 3.4 8.6 8 11 4.6-2.4 8-6 8-11V5l-8-3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path
                  d="m8.5 12 2.4 2.4L15.8 9.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="brand-name">
                Red<span className="brand-accent">Agent</span>
              </span>
              <span className="brand-sub">Agent Red-Teaming</span>
            </a>
            <nav className="topnav">
              <a href="/">New scan</a>
              <a href="/scans">Scans</a>
            </nav>
          </div>
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}

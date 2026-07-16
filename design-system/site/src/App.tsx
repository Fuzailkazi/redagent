import { useEffect, useState } from 'react';
import { Command, Moon, Sun } from 'lucide-react';
import { useTheme } from './theme';
import { CommandK } from './components/CommandK';
import { Sidebar } from './components/Sidebar';
import { ComponentPage } from './pages/ComponentPage';
import { ComponentsIndex } from './pages/ComponentsIndex';
import { FoundationPage } from './pages/FoundationPage';
import { PatternPage } from './pages/PatternPage';
import { Intro } from './pages/Intro';
import { SkillPage } from './pages/SkillPage';
import { IconsPage } from './pages/IconsPage';
import { AssetsPage } from './pages/AssetsPage';

function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash || '#/intro');
  useEffect(() => {
    const on = () => setRoute(window.location.hash || '#/intro');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (href: string) => {
    window.location.hash = href;
  };
  return { route, go };
}

/** Decide which page to render from the hash route. */
function renderRoute(route: string) {
  const path = route.replace(/^#\//, '');
  if (path === '' || path === 'intro') return <Intro />;
  if (path === 'skill') return <SkillPage />;
  if (path === 'icons') return <IconsPage />;
  if (path === 'assets') return <AssetsPage />;
  if (path === 'components') return <ComponentsIndex />;
  if (path.startsWith('foundations/')) return <FoundationPage topic={path.split('/')[1]} />;
  if (path.startsWith('patterns/')) return <PatternPage slug={path.split('/')[1]} />;
  if (path.startsWith('c/')) return <ComponentPage name={path.split('/')[1]} />;
  return <Intro />;
}

export function App() {
  const { theme, toggleTheme } = useTheme();
  const { route, go } = useHashRoute();

  useEffect(() => {
    document.getElementById('ds-scroll')?.scrollTo({ top: 0 });
  }, [route]);

  return (
    <div className="bg-aq-bg text-aq-ink flex h-full flex-col">
      {/* Top bar (full width) */}
      <header className="border-aq-border bg-aq-surface flex h-14 shrink-0 items-center justify-between border-b px-5">
        <a href="#/intro" className="flex items-center gap-2.5">
          <img src="/logos/armormark.svg" alt="ArmorIQ" className="h-7 w-7 rounded-md" />
          <span className="text-aq-sm tracking-aq-tight text-aq-ink font-semibold">
            ArmorIQ <span className="text-aq-ink-muted font-normal">Design System</span>
          </span>
        </a>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
            }
            className="border-aq-border bg-aq-bg text-aq-sm text-aq-ink-muted hover:border-aq-border-strong inline-flex items-center gap-2 rounded-md border px-3 py-1.5 transition"
          >
            <Command size={13} strokeWidth={1.8} />
            Search…
            <kbd className="rounded-aq-xs border-aq-border text-aq-caption text-aq-ink-faint ml-2 border px-1">
              ⌘K
            </kbd>
          </button>
          <a
            href="#/skill"
            className="bg-aq-accent-soft text-aq-sm text-aq-accent-strong rounded-md px-3 py-1.5 font-medium transition hover:opacity-90"
          >
            Skill
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="border-aq-border text-aq-ink-muted hover:border-aq-border-strong hover:text-aq-ink-soft inline-flex h-8 w-8 items-center justify-center rounded-md border transition"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="border-aq-border flex min-h-0 border-r">
          <Sidebar route={route} />
        </div>

        {/* Content */}
        <main id="ds-scroll" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="ds-fade-in mx-auto max-w-[var(--ds-content-max)] px-10 py-10" key={route}>
            {renderRoute(route)}
          </div>
        </main>
      </div>

      <CommandK onNavigate={go} />
    </div>
  );
}

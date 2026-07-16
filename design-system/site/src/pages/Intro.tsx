import { Palette, Type, Box, Sparkles, Component, Image } from 'lucide-react';
import { components } from '../data';

const CARDS = [
  {
    icon: Palette,
    title: 'Color',
    desc: 'The token palette, light and dark',
    route: '#/foundations/color',
  },
  {
    icon: Type,
    title: 'Typography',
    desc: 'The Geist type scale',
    route: '#/foundations/typography',
  },
  {
    icon: Box,
    title: 'Spacing & radius',
    desc: 'Layout primitives',
    route: '#/foundations/spacing',
  },
  { icon: Sparkles, title: 'Motion', desc: 'Durations and easings', route: '#/foundations/motion' },
  {
    icon: Component,
    title: 'Components',
    desc: `${components.length} live — browse the gallery`,
    route: '#/components',
  },
  { icon: Image, title: 'Assets', desc: 'Logos, fonts, and icons', route: '#/assets' },
];

export function Intro() {
  return (
    <div>
      <h1 className="text-aq-hero tracking-aq-tight text-aq-ink font-semibold">
        ArmorIQ Design System
      </h1>
      <p className="text-aq-md text-aq-ink-muted mt-3 mb-10 max-w-2xl">
        The design resources for building consistent ArmorIQ interfaces. Browse the tokens and{' '}
        {components.length} live components, copy what you need, and let your agent build in-style
        with the{' '}
        <a href="#/skill" className="text-aq-accent-deep hover:text-aq-accent">
          skill
        </a>
        .
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <a
            key={c.title}
            href={c.route}
            className="group border-aq-border bg-aq-surface hover:border-aq-border-strong hover:shadow-aq-card rounded-lg border p-5 transition"
          >
            <c.icon size={20} className="text-aq-accent" strokeWidth={1.8} />
            <div className="text-aq-md text-aq-ink mt-3 font-semibold">{c.title}</div>
            <div className="text-aq-sm text-aq-ink-muted mt-0.5">{c.desc}</div>
          </a>
        ))}
      </div>

      <div className="border-aq-border bg-aq-zebra mt-10 rounded-lg border p-5">
        <div className="text-aq-sm text-aq-ink font-semibold">For AI agents</div>
        <p className="text-aq-sm text-aq-ink-soft mt-1 max-w-2xl">
          This catalog is the human face of a portable design-system folder. Agents read{' '}
          <code className="text-aq-accent-deep font-mono">tokens.json</code> +{' '}
          <code className="text-aq-accent-deep font-mono">components.json</code> and the{' '}
          <a href="#/skill" className="text-aq-accent-deep hover:text-aq-accent">
            armoriq-design-system skill
          </a>{' '}
          to build UI in this style in any repo.
        </p>
      </div>
    </div>
  );
}

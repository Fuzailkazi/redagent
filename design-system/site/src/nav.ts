// The sidebar navigation tree. Mirrors the route space, generated from the
// manifest so it can never fall out of sync with what exists.
//
// Three top-level trees:
//   - Getting started (intro, skill, foundations, icons, assets)
//   - Primitives      (the ~50 @shared/ui building blocks, grouped by category)
//   - Sections        (the composed product pieces, category "sections")
// Patterns sits with Getting started. Each group carries a stable `key` (for
// collapse state) and its links; the sidebar shows a per-group count.
import { components, CATEGORY_ORDER, CATEGORY_LABEL } from './data';

export type NavLink = { label: string; route: string };
export type NavGroup = { key: string; title: string; links: NavLink[] };
export type NavTree = { id: string; title: string; groups: NavGroup[] };

const GETTING_STARTED: NavGroup = {
  key: 'getting-started',
  title: 'Getting started',
  links: [
    { label: 'Introduction', route: '#/intro' },
    { label: 'Using the skill', route: '#/skill' },
    { label: 'Color', route: '#/foundations/color' },
    { label: 'Typography', route: '#/foundations/typography' },
    { label: 'Spacing', route: '#/foundations/spacing' },
    { label: 'Radius', route: '#/foundations/radius' },
    { label: 'Shadow', route: '#/foundations/shadow' },
    { label: 'Motion', route: '#/foundations/motion' },
    { label: 'Icons', route: '#/icons' },
    { label: 'Assets', route: '#/assets' },
  ],
};

const PATTERNS: NavGroup = {
  key: 'patterns',
  title: 'Patterns',
  links: [
    { label: 'List + toolbar', route: '#/patterns/list-toolbar' },
    { label: 'Forms', route: '#/patterns/forms' },
    { label: 'Page states', route: '#/patterns/page-states' },
    { label: 'Modality', route: '#/patterns/modality' },
    { label: 'Status & feedback', route: '#/patterns/status' },
  ],
};

function groupFor(cat: string): NavGroup {
  return {
    key: cat,
    title: CATEGORY_LABEL[cat] ?? cat,
    links: components
      .filter((c) => c.category === cat)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ label: c.name, route: `#/c/${c.name}` })),
  };
}

// Primitive categories = everything except the product-sections bucket.
const PRIMITIVE_CATS = CATEGORY_ORDER.filter(
  (cat) => cat !== 'sections' && components.some((c) => c.category === cat)
);

export function navTrees(): NavTree[] {
  const trees: NavTree[] = [
    { id: 'start', title: '', groups: [GETTING_STARTED, PATTERNS] },
    {
      id: 'primitives',
      title: 'Primitives',
      groups: PRIMITIVE_CATS.map(groupFor),
    },
  ];
  if (components.some((c) => c.category === 'sections')) {
    trees.push({
      id: 'sections',
      title: 'Sections (from product)',
      groups: [groupFor('sections')],
    });
  }
  return trees;
}

// All routes that belong to a group, for active-group resolution.
export function groupOfRoute(route: string): string | null {
  for (const tree of navTrees()) {
    for (const g of tree.groups) {
      if (g.links.some((l) => l.route === route)) return g.key;
    }
  }
  return null;
}

// Loads the generated manifests. These are the prose/metadata source; the live
// previews import the real components. JSON is imported at build time so the
// deployed dist/ is fully standalone (no runtime fetch of the folder root).
import componentsManifest from '../../components.json';
import tokensManifest from '../../tokens.json';

export type PropSpec = {
  name: string;
  type: string;
  default?: string;
  description?: string;
};

export type ComponentSpec = {
  name: string;
  category: string;
  tier: 1 | 2 | 3;
  import: string;
  source: string;
  summary: string;
  props: PropSpec[];
  tokens: string[];
  usage: string;
  whenToReachFor: string;
  variantClasses?: Record<string, string>;
  example?: string;
};

export type ComponentsManifest = {
  name: string;
  description?: string;
  components: ComponentSpec[];
};

// DTCG token shape
export type Token = {
  $value: string;
  $type: string;
  $extensions?: {
    'armoriq.cssVar'?: string;
    'armoriq.dark'?: string;
    'armoriq.lineHeight'?: string;
  };
};
export type TokenGroup = Record<string, Token | string>;
export type TokensManifest = Record<string, TokenGroup | string>;

const all = (componentsManifest as ComponentsManifest).components;
export const tokens = tokensManifest as TokensManifest;

// Sections (real composed product pieces) are stored in components.json under
// category "sections" so the AGENT manifest and this site share one source of
// truth. The live previews for them live in preview/sections.tsx.
export const sectionComponents: ComponentSpec[] = all.filter((c) => c.category === 'sections');

// Full catalog: primitives first, then sections (already concatenated in the
// manifest, but we keep the explicit name for readers).
export const components: ComponentSpec[] = all;

export const CATEGORY_ORDER = [
  'sections',
  'actions',
  'inputs',
  'data-display',
  'feedback',
  'navigation',
  'overlay',
  'layout',
  'motion',
  'brand',
] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  sections: 'Sections (from product)',
  actions: 'Actions',
  inputs: 'Inputs',
  'data-display': 'Data display',
  feedback: 'Feedback',
  navigation: 'Navigation',
  overlay: 'Overlay',
  layout: 'Layout',
  motion: 'Motion',
  brand: 'Brand',
};

export function tokenGroups(): Array<[string, Record<string, Token>]> {
  const out: Array<[string, Record<string, Token>]> = [];
  for (const [group, val] of Object.entries(tokens)) {
    if (group.startsWith('$') || typeof val === 'string') continue;
    const entries: Record<string, Token> = {};
    for (const [k, t] of Object.entries(val)) {
      if (k.startsWith('$') || typeof t === 'string') continue;
      entries[k] = t as Token;
    }
    out.push([group, entries]);
  }
  return out;
}

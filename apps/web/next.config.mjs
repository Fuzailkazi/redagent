import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The vendored design-system lives two levels up (repo root / design-system).
const primitives = path.resolve(__dirname, '../../design-system/primitives');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @armoriq/schema is a workspace TS package; let Next transpile it.
  transpilePackages: ['@armoriq/schema'],
  // The design-system primitives are vendored OUTSIDE apps/web. Allow Next to
  // resolve + compile source imported from that sibling tree.
  experimental: {
    externalDir: true,
  },
  // Turbopack (dev) alias so `@shared/*` resolves to the vendored primitives.
  turbopack: {
    resolveAlias: {
      '@shared/ui': path.join(primitives, 'ui/index.ts'),
      '@shared/icons': path.join(primitives, 'icons/index.ts'),
      '@shared/hooks': path.join(primitives, 'hooks'),
      '@shared/motion': path.join(primitives, 'motion/index.ts'),
    },
  },
  // Webpack (used by `next build`) alias — same mapping. Prefix alias so
  // `@shared/ui`, `@shared/icons`, etc. all resolve under the primitives dir.
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': primitives,
    };
    return config;
  },
};

export default nextConfig;

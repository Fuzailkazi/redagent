import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// The site lives at design-system/site and renders the vendored primitives +
// tokens from design-system/. It is fully standalone: nothing resolves into the
// parent app at ../../src. The alias @shared points at design-system/primitives,
// so @shared/ui, @shared/icons, @shared/motion, @shared/hooks all resolve to the
// vendored copies.
const DS_ROOT = path.resolve(__dirname, '..');
const PRIMITIVES = path.resolve(DS_ROOT, 'primitives');

export default defineConfig({
  // Vercel serves from the project root, so base is '/'. For GitHub Pages under
  // a subpath, set base to '/<repo>/' instead.
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // Pin react + react-dom to THIS app's copy so a single React instance loads
    // and hooks (useId, useState) never crash on a duplicate copy.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', '@xyflow/react'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      // @shared/* resolves to the vendored primitives copy.
      '@shared': PRIMITIVES,
      // site-local source
      '@site': path.resolve(__dirname, 'src'),
      // the generated manifests live at the design-system root (one level up)
      '@ds': DS_ROOT,
      // Resolve the graph lib from the site's own node_modules so a single copy
      // loads and bare specifiers resolve from the site graph too.
      '@xyflow/react': path.resolve(__dirname, 'node_modules/@xyflow/react'),
    },
  },
  // Let Vite reach into design-system/ for the vendored primitives + styles.
  server: { fs: { allow: [DS_ROOT] } },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
  },
});

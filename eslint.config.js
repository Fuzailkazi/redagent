// Flat ESLint config for the ArmorIQ red-teaming monorepo.
// Non-type-checked typescript-eslint recommended rules — fast, no per-package
// project wiring needed. `tsc --noEmit` (pnpm -r typecheck) covers type-aware checks.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    // Never lint build output, deps, or caches.
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Allow intentionally-unused args/vars when prefixed with underscore.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Plain ESM JS helpers (e.g. e2e mock servers) run on Node — give them the
    // Node globals so `process`, etc. are defined.
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    // Tests deliberately construct malformed/ill-typed inputs to assert validators
    // reject them, so `any` is legitimate here.
    files: ['**/*.test.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);

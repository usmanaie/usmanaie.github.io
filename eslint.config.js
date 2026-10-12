import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/',
      'dist-fixture/',
      '.astro/',
      '.claude/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      '.lighthouseci/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-strict'],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx'], location: 'anywhere' }],
      // role="list" is intentional on unstyled lists: Safari/VoiceOver drops list semantics with list-style: none.
      'astro/jsx-a11y/no-redundant-roles': ['error', { ul: ['list'], ol: ['list'] }],
      // Scrollable regions (the reviews track) must be keyboard-focusable (axe: scrollable-region-focusable).
      'astro/jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['region'], tags: [] }],
    },
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.*'],
    rules: { 'no-console': 'off' },
  },
);

// Sidekick — ESLint flat config (eslint v9)
//
// Tuned for THIS codebase's three distinct habitats, because they have
// genuinely different rules of engagement:
//
//   api/, lib/, tests/test-*.mjs  — ESM (confirmed: import/export through-
//                                  out), running on Node 22 / Vercel Edge.
//   app/**/*.js                   — CLASSIC scripts (no build step; loaded
//                                  via ordered <script> tags, see
//                                  index.html). All files share ONE global
//                                  scope and expose functions consumed by
//                                  inline onclick= attributes in HTML — so
//                                  cross-file globals are structural, and
//                                  no-undef is disabled here (per-file
//                                  analysis cannot see siblings).
//   tests/check-*.js              — Playwright drivers executed by node;
//                                  left at flat-config defaults.
//
// Philosophy: recommended-as-errors EXCEPT a short, explicit downgrade
// list for patterns that flood a legacy codebase with noise while hiding
// zero real bugs. Tighten over time; `npm run lint` should stay green.

import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/', 'app/fonts/**', 'demo/**'],
  },

  js.configs.recommended,

  // ── Global noise downgrades (legacy-friendly baseline) ──────────────
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-empty': 'warn',
      'no-cond-assign': 'warn',
      'no-control-regex': 'off',
      'no-useless-escape': 'warn',
      'no-prototype-builtins': 'warn',
    },
  },

  // ── Server side: api/, lib/ and the node test harnesses ────────────
  {
    files: ['api/**/*.js', 'lib/**/*.js', 'tests/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        // Vercel Edge + Node 22 runtime surface these files actually touch.
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        structuredClone: 'readonly',
      },
    },
  },

  // ── Browser PWA: classic scripts, shared global scope ───────────────
  {
    files: ['app/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 'latest',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'writable',
        history: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',
        fetch: 'readonly',
        crypto: 'readonly',
        caches: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        FileReader: 'readonly',
        Intl: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        getComputedStyle: 'readonly',
        matchMedia: 'readonly',
        self: 'readonly', // service-worker scope for app/sw.js
        clients: 'readonly', // service-worker scope for app/sw.js
      },
    },
    rules: {
      // Structural, not fixable by config: all app/*.js files execute in
      // one shared global scope (ordered classic <script> tags), and
      // index.html's inline onclick= handlers reach into it. A single
      // file cannot see its siblings' globals.
      'no-undef': 'off',
    },
  },
];

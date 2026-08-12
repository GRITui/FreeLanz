// Sidekick — static-analysis regression guard for IndexedDB store
// consistency (backlog TSK-026). Pure text/regex analysis of app/*.js, no
// browser/IndexedDB runtime needed.
//
// SCOPE: this catches store-name typos, orphaned createObjectStore() calls,
// and references to a store that was never created -- it does NOT and
// cannot detect "added/removed a store but forgot to bump DB_VER", since
// that bug (a real past incident -- see app/app.js's own DB_VER comment
// history) depends on comparing against a PREVIOUS deployed version, not
// just the current file snapshot this test reads. That class of mistake
// still relies on the discipline already documented at app/app.js's DB_VER
// declaration. This test is a narrower, purely-static complement to that,
// not a replacement for it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '..', 'app');

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) pass++; else { fail++; console.log('FAIL:', msg); } };

const appJs = fs.readFileSync(path.join(appDir, 'app.js'), 'utf8');

// ── 1. stores created in openDB()'s onupgradeneeded ─────────────────────────
const createdStores = new Set(
  [...appJs.matchAll(/createObjectStore\('([a-zA-Z]+)'/g)].map(m => m[1])
);
assert(createdStores.size > 0, 'sanity: found at least one createObjectStore(...) call in app/app.js');

// ── 2. stores referenced anywhere across app/*.js ────────────────────────────
// Resolves per-file `const STORE = 'name'` aliases (the pattern
// followups.js/portfolio.js/research.js use) in addition to direct literal
// arguments to the db* helpers and raw .transaction()/.objectStore() calls.
const referencedStores = new Set();
const files = fs.readdirSync(appDir).filter(f => f.endsWith('.js'));
for (const file of files) {
  const src = fs.readFileSync(path.join(appDir, file), 'utf8');
  const localAliases = new Map();
  for (const m of src.matchAll(/const\s+([A-Z_]+)\s*=\s*'([a-zA-Z]+)'/g)) {
    localAliases.set(m[1], m[2]);
  }
  const callPattern = /\b(?:dbAll|dbPut|dbAdd|dbDel|dbGet|transaction|objectStore)\(\s*(?:'([a-zA-Z]+)'|([A-Z_]+))/g;
  for (const m of src.matchAll(callPattern)) {
    if (m[1]) referencedStores.add(m[1]);
    else if (m[2] && localAliases.has(m[2])) referencedStores.add(localAliases.get(m[2]));
  }
}
assert(referencedStores.size > 0, 'sanity: found at least one store reference across app/*.js');

// ── 3. every referenced store has a creator ──────────────────────────────────
for (const name of referencedStores) {
  assert(createdStores.has(name),
    `store '${name}' is referenced (dbAll/dbPut/dbAdd/dbDel/dbGet/transaction/objectStore) somewhere in app/*.js but has no createObjectStore('${name}', ...) in app/app.js's openDB()`);
}

// ── 4. every created store is either referenced or explicitly dormant ───────
// Keep this allowlist in sync with app/app.js's own DB_VER comment, which
// documents 'meta'/'outbox' as created now, unused, for a future sync layer.
const DORMANT_STORES = new Set(['meta', 'outbox']);
for (const name of createdStores) {
  const ok = referencedStores.has(name) || DORMANT_STORES.has(name);
  assert(ok,
    `store '${name}' is created by createObjectStore() but never referenced anywhere in app/*.js and isn't in this test's DORMANT_STORES allowlist -- either it's dead code (remove the createObjectStore call) or it's intentionally dormant (add '${name}' to DORMANT_STORES here, matching app/app.js's own comment)`);
}

// ── 5. DB_VER is declared exactly once, in the expected shape ───────────────
const dbVerMatches = [...appJs.matchAll(/const DB_NAME = '[^']+', DB_VER = (\d+);/g)];
assert(dbVerMatches.length === 1,
  `expected exactly one 'const DB_NAME = ..., DB_VER = N;' declaration in app/app.js, found ${dbVerMatches.length}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);

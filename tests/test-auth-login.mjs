// Sidekick — api/auth-login.js handler-level coverage (TSK-035).
// Exercises the createAuthLoginHandler({getSql, verifyPassword, signSession})
// factory against an in-memory fake `users` table and stubbed
// verify/sign functions — no live DB, no real PBKDF2 work, no network.
process.env.SESSION_SECRET = 'test-session-secret-value';

import { createAuthLoginHandler } from '../api/auth-login.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) pass++; else { fail++; console.log('FAIL:', msg); } };

// In-memory `users` table. password_hash === null models a LINE-only
// account (auth-login.js:53's own comment — same generic failure as a
// wrong password, never revealing which case it was).
const USERS = [
  { cuid: 'user-1', username: 'alice', first_name: 'Alice', password_hash: 'hash-alice', password_salt: 'salt-alice', password_iters: 100000 },
  { cuid: 'user-2', username: 'lineonly', first_name: 'Line', password_hash: null, password_salt: null, password_iters: null },
];

// Fake sql: supports both the tagged-template call style auth-login.js
// itself uses and the (text, params) style, matching the real Neon
// driver's dual API this codebase already relies on (see
// tests/test-teams.mjs's fakeSql for the same convention).
function fakeSql(strings, ...values) {
  const text = Array.isArray(strings) ? strings.join('?') : strings;
  const params = Array.isArray(strings) ? values : values[0];
  if (text.includes('select cuid, username, first_name, password_hash, password_salt, password_iters') && text.includes('from users where username')) {
    const username = params[0];
    const row = USERS.find(u => u.username === username);
    return Promise.resolve(row ? [row] : []);
  }
  throw new Error('unexpected query in fakeSql: ' + text);
}

// A distinct IP per test block so lib/rateLimit.js's real, unmocked
// module-level buckets never bleed across assertions (matching
// tests/test-ratelimit.mjs's own per-scenario-IP convention) — only the
// dedicated rate-limit-wiring block below deliberately reuses one IP.
let nextIp = 1;
function freshRequest(body, { method = 'POST', ip } = {}) {
  return new Request('https://x/api/auth-login', {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip || `10.0.0.${nextIp++}`,
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

// Correct-password verify/sign stubs — real PBKDF2/HMAC work is already
// covered by lib/auth.js's own concerns; this file is about the handler's
// wiring (anti-enumeration response shape, rate-limit call, status codes).
const verifyCorrect = async (password, { hash }) => password === 'right-password' && hash != null;
const signStub = async ({ userCuid }) => `signed.${userCuid}`;

function makeHandler(overrides = {}) {
  return createAuthLoginHandler({
    getSql: () => fakeSql,
    verifyPassword: verifyCorrect,
    signSession: signStub,
    ...overrides,
  });
}

async function main() {
  // ── Method gating ─────────────────────────────────────────────────
  {
    const handler = makeHandler();
    const res = await handler(freshRequest(null, { method: 'GET' }));
    assert(res.status === 405, 'non-POST request -> 405');
  }

  // ── Missing SESSION_SECRET -> 500, no DB/verify/sign work attempted ──
  {
    const saved = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    let verifyCalled = false;
    const handler = makeHandler({ verifyPassword: async () => { verifyCalled = true; return true; } });
    const res = await handler(freshRequest({ username: 'alice', password: 'right-password' }));
    assert(res.status === 500, 'missing SESSION_SECRET -> 500 (server misconfigured)');
    assert(!verifyCalled, 'no verify attempted when server is misconfigured');
    process.env.SESSION_SECRET = saved;
  }

  // ── Missing username/password -> generic fail, no DB query ──────────
  {
    let sqlCalled = false;
    const handler = makeHandler({ getSql: () => (...args) => { sqlCalled = true; return fakeSql(...args); } });
    const res = await handler(freshRequest({ username: '', password: '' }));
    const data = await res.json();
    assert(res.status === 401, 'empty username/password -> 401');
    assert(JSON.stringify(data) === JSON.stringify({ error: 'Incorrect username or password' }), 'empty credentials get the generic failure body');
    assert(!sqlCalled, 'a request with no username/password never queries the DB');
  }

  // ── Malformed JSON body -> generic fail, not a crash ─────────────────
  {
    const handler = makeHandler();
    const req = new Request('https://x/api/auth-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${nextIp++}` },
      body: 'not json',
    });
    let threw = false;
    let res;
    try { res = await handler(req); } catch { threw = true; }
    assert(!threw, 'malformed JSON body never throws out of the handler');
    assert(res && res.status === 401, 'malformed JSON body -> 401 generic fail, same as missing credentials');
  }

  // ── Anti-enumeration: unknown user / wrong password / LINE-only account ──
  // all return an IDENTICAL response shape and status — the whole point of
  // GENERIC_FAIL is that none of these three cases is distinguishable from
  // the outside.
  const scenarios = [
    { label: 'unknown username', username: 'nobody', password: 'right-password' },
    { label: 'known username, wrong password', username: 'alice', password: 'wrong-password' },
    { label: 'LINE-only account (password_hash === null)', username: 'lineonly', password: 'right-password' },
  ];
  const bodies = [];
  for (const s of scenarios) {
    const handler = makeHandler();
    const res = await handler(freshRequest({ username: s.username, password: s.password }));
    const data = await res.json();
    assert(res.status === 401, `${s.label} -> 401`);
    assert(JSON.stringify(data) === JSON.stringify({ error: 'Incorrect username or password' }), `${s.label} -> generic failure body, no hint which case occurred`);
    bodies.push({ status: res.status, data });
  }
  assert(
    bodies.every(b => b.status === bodies[0].status && JSON.stringify(b.data) === JSON.stringify(bodies[0].data)),
    'all three failure cases produce byte-identical status + body — a client cannot distinguish "no such user" from "wrong password" from "LINE-only account"'
  );

  // ── Successful login ──────────────────────────────────────────────
  {
    const handler = makeHandler();
    const res = await handler(freshRequest({ username: 'ALICE', password: 'right-password' })); // uppercase input, lowercased before lookup
    const data = await res.json();
    assert(res.status === 200, 'correct username/password -> 200');
    assert(data.token === 'signed.user-1', 'response carries the signed session token for the matched user');
    assert(
      data.user && data.user.cuid === 'user-1' && data.user.username === 'alice' && data.user.firstName === 'Alice',
      'response carries the expected user fields (cuid/username/firstName), never password_hash/salt/iters'
    );
    assert(!('password_hash' in data.user) && !('password_salt' in data.user) && !('password_iters' in data.user), 'password material never leaks into the response');
  }

  // ── Username is trimmed + lowercased before lookup ───────────────────
  {
    let lookedUpAs = null;
    const handler = makeHandler({
      getSql: () => (strings, ...values) => {
        const params = Array.isArray(strings) ? values : values[0];
        lookedUpAs = params[0];
        return fakeSql(strings, ...values);
      },
    });
    await handler(freshRequest({ username: '  ALICE  ', password: 'right-password' }));
    assert(lookedUpAs === 'alice', 'username is trimmed and lowercased before the DB lookup');
  }

  // ── A DB failure is caught and mapped to 502, never thrown ──────────
  {
    const handler = makeHandler({ getSql: () => () => { throw new Error('db unreachable'); } });
    let threw = false;
    let res;
    try { res = await handler(freshRequest({ username: 'alice', password: 'right-password' })); } catch { threw = true; }
    assert(!threw, 'a DB failure never throws out of the handler');
    assert(res && res.status === 502, 'a DB failure maps to 502, not a generic auth failure (distinguishable from a real bad-credentials case)');
  }

  // ── Rate-limit wiring: the 11th request within the window from the same ──
  // IP is rejected, proving auth-login.js actually wires rateLimit() in
  // with key:'auth-login', limit:10 (lib/rateLimit.js's own logic is unit-
  // tested in isolation by tests/test-ratelimit.mjs — this only proves the
  // wiring, using an IP no other assertion in this file touches).
  {
    const ip = '203.0.113.99';
    const handler = makeHandler();
    let last;
    for (let i = 0; i < 10; i++) {
      last = await handler(freshRequest({ username: 'alice', password: 'wrong-password' }, { ip }));
      assert(last.status === 401, `request ${i + 1}/10 from the same IP still reaches normal auth handling (401, wrong password)`);
    }
    const eleventh = await handler(freshRequest({ username: 'alice', password: 'wrong-password' }, { ip }));
    assert(eleventh.status === 429, 'the 11th request within the window from the same IP is rate-limited (429), not evaluated for auth');
  }
}

await main();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);

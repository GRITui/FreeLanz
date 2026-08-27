/* TSK-030 — dbAll/dbGet/dbDel/dbGetByUsername previously built a Promise
 * that only ever wired IDBRequest.onsuccess, never onerror: a real
 * IndexedDB read failure (transaction abort, unexpected DB close, storage
 * error) left the returned Promise permanently unsettled — not even a
 * rejection — which meant reload() (and anything awaiting it) would hang
 * forever with no console error, no toast, nothing. dbPut/dbAdd already
 * wired onerror correctly; this suite proves the other four now match
 * that pattern: each helper's Promise REJECTS (and does so quickly, not
 * after some coincidental timeout) when the underlying IDBRequest fires
 * onerror instead of onsuccess.
 *
 * Run: node check-db-error-handling.js
 * Expects http://localhost:8923 serving ../app.
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:8923';
const EXE = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('FAIL:', msg); } };

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'], headless: true });
  const page = await browser.newPage();
  const errors = [];
  // The simulated IDBRequest errors below are expected to surface as
  // console.error via any code that awaits these helpers outside our own
  // try/catch — none of our direct calls do that, so a real console error
  // here would indicate an unrelated regression, not this suite's fixture.
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(String(err)));

  await page.goto(BASE + '/login.html');
  await page.click('#tab-register');
  await page.fill('#auth-user', 'dberr' + Date.now());
  await page.fill('#auth-name', 'DB Error Tester');
  await page.fill('#auth-pass', 'pass1234');
  await page.fill('#auth-confirm', 'pass1234');
  await page.click('#auth-submit');
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('cloud-backup-modal')?.remove());

  // Runs `dbCallExpr` (a string, evaluated against the page's own globals)
  // while `protoName`.`methodName` is patched to return a fake IDBRequest
  // whose onerror fires (async, next tick) instead of onsuccess. Races the
  // call against a generous timeout so a regression back to the old
  // never-settles behavior fails loudly instead of hanging the whole suite.
  const expectRejects = (label, protoName, methodName, dbCallExpr) => page.evaluate(
    ([label, protoName, methodName, dbCallExpr]) => new Promise(resolve => {
      const proto = window[protoName].prototype;
      const orig = proto[methodName];
      proto[methodName] = function () {
        const fakeReq = {};
        setTimeout(() => {
          fakeReq.error = new Error('TSK-030 simulated ' + label + ' failure');
          if (fakeReq.onerror) fakeReq.onerror();
        }, 0);
        return fakeReq;
      };
      let settled = false;
      const finish = outcome => {
        if (settled) return;
        settled = true;
        proto[methodName] = orig;
        clearTimeout(hangTimer);
        resolve(outcome);
      };
      const hangTimer = setTimeout(() => finish('hung'), 1500);
      // eslint-disable-next-line no-eval
      (0, eval)(dbCallExpr).then(() => finish('resolved'), () => finish('rejected'));
    }),
    [label, protoName, methodName, dbCallExpr]
  );

  const r1 = await expectRejects('dbAll', 'IDBObjectStore', 'getAll', "dbAll('jobs')");
  assert(r1 === 'rejected', 'dbAll() rejects (not hangs/resolves) on a failed getAll request, got: ' + r1);

  const r2 = await expectRejects('dbGet', 'IDBObjectStore', 'get', "dbGet('jobs', 1)");
  assert(r2 === 'rejected', 'dbGet() rejects (not hangs/resolves) on a failed get request, got: ' + r2);

  const r3 = await expectRejects('dbDel', 'IDBObjectStore', 'delete', "dbDel('jobs', 1)");
  assert(r3 === 'rejected', 'dbDel() rejects (not hangs/resolves) on a failed delete request, got: ' + r3);

  const r4 = await expectRejects('dbGetByUsername', 'IDBIndex', 'get', "dbGetByUsername('nobody')");
  assert(r4 === 'rejected', 'dbGetByUsername() rejects (not hangs/resolves) on a failed index get request, got: ' + r4);

  // Sanity check: with the patch cleanly restored after each case above,
  // the app's normal (successful) read path is unaffected.
  const jobsOk = await page.evaluate(() => dbAll('jobs').then(() => true, () => false));
  assert(jobsOk === true, 'dbAll() still resolves normally once the fault is removed');

  assert(errors.length === 0, 'zero console errors, got: ' + errors.join('; '));

  console.log(`${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();

/* Acceptance suite for TSK-031: modal focus management. All 6 modal-overlay
 * surfaces (job/customer/service/account-name, plus the dynamically-built
 * markJobLost() reason picker) previously only toggled a CSS class — no
 * initial focus on open, no focus trap, no Escape-to-close, no return-focus
 * on close. This suite drives each surface via a real trigger click (or,
 * for markJobLost — no longer wired to any card button per app.js's own
 * TSK-012 comment — a direct call) and asserts: focus lands inside the
 * modal on open, Tab/Shift+Tab wrap within it rather than escaping to the
 * screen underneath, Escape closes the topmost open modal, and focus
 * returns to the element that triggered it.
 *
 * Run: NODE_PATH=/opt/node22/lib/node_modules node tests/check-modal-focus.js
 * Expects http://localhost:8923 serving ../app.
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:8923';
const EXE = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('FAIL:', msg); } };
const errors = [];

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'], headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(String(err)));

  await page.goto(BASE + '/login.html');
  await page.click('#tab-register');
  await page.fill('#auth-user', 'mf-' + Date.now());
  await page.fill('#auth-name', 'ModalFocus Tester');
  await page.fill('#auth-pass', 'pass1234');
  await page.fill('#auth-confirm', 'pass1234');
  await page.click('#auth-submit');
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('cloud-backup-modal')?.remove());
  await page.evaluate(async () => { await onLangChange('en'); });
  await page.waitForTimeout(200);

  const activeInModal = (overlayId) => page.evaluate(id => {
    const active = document.activeElement;
    return !!active && active !== document.body && !!active.closest('#' + id);
  }, overlayId);
  const overlayOpen = (overlayId) => page.evaluate(id => document.getElementById(id).classList.contains('open'), overlayId);
  const activeElId = () => page.evaluate(() => document.activeElement && document.activeElement.id);

  // ═══ 1. Job modal (real click on the FAB): initial focus, Escape-to-
  //         close, return-focus, and a Tab-trap in both directions ═══════
  await page.click('#fab');
  await page.waitForTimeout(150);
  assert(await overlayOpen('modal-job'), '1: #fab opens #modal-job');
  assert(await activeInModal('modal-job'), '1: focus lands inside #modal-job on open, got activeElement=' + await activeElId());

  // Shift+Tab from the first focusable element wraps to the last one —
  // proves the underlying screen is not reachable by tabbing backward out.
  const firstId = await activeElId();
  await page.keyboard.press('Shift+Tab');
  const afterShiftTab = await activeElId();
  assert(afterShiftTab !== null && afterShiftTab !== firstId, '1: Shift+Tab from the first field moves focus (wraps), not stuck, got ' + afterShiftTab);
  assert(await activeInModal('modal-job'), '1: Shift+Tab-wrapped focus is still inside #modal-job, got ' + afterShiftTab);
  // Tabbing forward from that wrapped (last) position should land back on
  // the first focusable element — the trap's other direction.
  await page.keyboard.press('Tab');
  const afterTabBack = await activeElId();
  assert(afterTabBack === firstId, '1: Tab from the wrapped last field returns to the first field, got ' + afterTabBack + ' expected ' + firstId);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  assert(!(await overlayOpen('modal-job')), '1: Escape closes #modal-job');
  assert(await page.evaluate(() => document.activeElement && document.activeElement.id === 'fab'), '1: focus returns to #fab after Escape-close');

  // ═══ 2. Customer modal (real click through Customers → Add client) ═══
  await page.click('#nav-customers');
  await page.waitForTimeout(150);
  await page.click('text=Add client');
  await page.waitForTimeout(150);
  assert(await overlayOpen('modal-customer'), '2: Add client opens #modal-customer');
  assert(await activeInModal('modal-customer'), '2: focus lands inside #modal-customer on open, got ' + await activeElId());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  assert(!(await overlayOpen('modal-customer')), '2: Escape closes #modal-customer');
  const addClientFocused = await page.evaluate(() => document.activeElement && /add.?client/i.test(document.activeElement.textContent || ''));
  assert(addClientFocused, '2: focus returns to the "Add client" trigger button after Escape-close');

  // ═══ 3. Service modal (real click through Services → Add service) ═══
  await page.click('#nav-services');
  await page.waitForTimeout(150);
  await page.click('text=Add service');
  await page.waitForTimeout(150);
  assert(await overlayOpen('modal-service'), '3: Add service opens #modal-service');
  assert(await activeInModal('modal-service'), '3: focus lands inside #modal-service on open, got ' + await activeElId());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  assert(!(await overlayOpen('modal-service')), '3: Escape closes #modal-service');
  const addServiceFocused = await page.evaluate(() => document.activeElement && /add.?service/i.test(document.activeElement.textContent || ''));
  assert(addServiceFocused, '3: focus returns to the "Add service" trigger button after Escape-close');

  // ═══ 4. Account name modal — its own real-world trigger (.account-row,
  //         app/index.html:160) is a plain onclick div with no tabindex, a
  //         separate/pre-existing keyboard-reachability gap outside this
  //         task's scope (the 6 open/close FUNCTION pairs), so it can never
  //         itself be the focused element a mouse click leaves behind
  //         (clicking a non-focusable target blurs to <body> first, before
  //         the click handler even runs — verified directly). Testing
  //         openAccountNameModal()/closeAccountNameModal()'s own store/
  //         restore logic instead, the same way section 5 below exercises
  //         markJobLost() directly rather than through a UI trigger ═══════
  await page.click('#nav-more');
  await page.waitForTimeout(150);
  await page.focus('#nav-more');
  await page.evaluate(() => openAccountNameModal());
  await page.waitForTimeout(150);
  assert(await overlayOpen('modal-account-name'), '4: openAccountNameModal() opens #modal-account-name');
  assert(await activeInModal('modal-account-name'), '4: focus lands inside #modal-account-name on open, got ' + await activeElId());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  assert(!(await overlayOpen('modal-account-name')), '4: Escape closes #modal-account-name');
  assert(await page.evaluate(() => document.activeElement && document.activeElement.id === 'nav-more'), '4: focus returns to the pre-open trigger (#nav-more) after Escape-close');

  // ═══ 5. markJobLost's dynamically-created modal — not wired to any card
  //         button today (TSK-012 comment in app.js), so triggered directly,
  //         with a real button focused first to prove return-focus works
  //         for a programmatically-opened overlay too ═══════════════════
  await page.evaluate(async () => {
    window.__mfCid = await dbAdd('clients', { uid: currentUser.id, name: 'MF Client', phone: '', notes: '', createdAt: nowISO(), cuid: cuid() });
    await reload();
    window.__mfJobId = await dbAdd('jobs', {
      uid: currentUser.id, date: todayISO(), client: 'MF Client', clientId: window.__mfCid,
      serviceId: null, serviceName: '', jobType: settings.workType || '', amount: 0, tip: 0, expense: 0,
      count: 0, notes: '', netAmount: 0, cuid: cuid(), stageOrder: getStageOrder().slice(),
      stage: getStageOrder()[0], complete: false, invoiceId: null, quoteDocId: null,
      packageId: null, updatedAt: nowISO(),
    });
    await reload();
  });
  await page.focus('#nav-home');
  await page.evaluate(id => markJobLost(id), await page.evaluate(() => window.__mfJobId));
  await page.waitForTimeout(150);
  assert(await overlayOpen('modal-lost'), '5: markJobLost() opens #modal-lost');
  assert(await activeInModal('modal-lost'), '5: focus lands inside #modal-lost on open, got ' + await activeElId());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  assert(await page.evaluate(() => !document.getElementById('modal-lost')), '5: Escape removes the dynamically-created #modal-lost');
  assert(await page.evaluate(() => document.activeElement && document.activeElement.id === 'nav-home'), '5: focus returns to the pre-open trigger (#nav-home) after Escape-close');

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log('Console/page errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

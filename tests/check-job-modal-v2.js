/* Acceptance suite for the job modal (originally TSK-008's Quick log/Full
 * details split, design-handoff README §2). TSK-023 removed that toggle per
 * the owner — every field is always shown now, and the tracking section
 * (now just Options compared + Plan & payments; Items on this engagement
 * and Time tracking were removed too, see app.js's TSK-023 comments) always
 * shows once a job is saved. This suite covers: field visibility, the live
 * net-take box, the de-escalated Cancel button, the 2 remaining drill-row
 * summaries + their open/close behavior, and a from-scratch save.
 *
 * This suite does NOT re-test the sub-features' own mechanics (options
 * booking hooks, milestone gating, item catalog snapshotting, etc.) — those
 * stay covered by check-options-lost.js/check-items.js/check-merges.js/
 * check-scheduling.js. This suite only proves the job modal's own
 * presentation layer.
 *
 * Run: NODE_PATH=/opt/node22/lib/node_modules node tests/check-job-modal-v2.js
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
  await page.fill('#auth-user', 'jm2-' + Date.now());
  await page.fill('#auth-name', 'JobModal2 Tester');
  await page.fill('#auth-pass', 'pass1234');
  await page.fill('#auth-confirm', 'pass1234');
  await page.click('#auth-submit');
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('cloud-backup-modal')?.remove());
  await page.evaluate(async () => { await onLangChange('en'); });
  await page.waitForTimeout(200);

  const installHelpers = () => page.evaluate(async () => {
    window.__cid = await dbAdd('clients', { uid: currentUser.id, name: 'JM2 Client', phone: '', notes: '', createdAt: nowISO(), cuid: cuid() });
    await reload();   // customers[] must be refreshed before openAddJob()'s populateJobSelects() runs
    window.__mkJob = async function (over) {
      const j = Object.assign({
        uid: currentUser.id, date: todayISO(), client: 'JM2 Client', clientId: window.__cid,
        serviceId: null, serviceName: '', jobType: settings.workType || '', amount: 500, tip: 0, expense: 0,
        count: 0, notes: '', netAmount: 500, cuid: cuid(), stageOrder: getStageOrder().slice(),
        stage: getStageOrder()[0], complete: false, invoiceId: null, quoteDocId: null,
        packageId: null, updatedAt: nowISO(),
      }, over || {});
      const id = await dbPut('jobs', j);
      await reload();
      return id;
    };
  });
  await installHelpers();
  const mkJob = (over) => page.evaluate(o => window.__mkJob(o), over || null);
  const job = (id, expr) => page.evaluate(args => { const j = jobs.find(x => x.id === args[0]); return eval(args[1]); }, [id, expr]);
  const fieldDisplay = (id) => page.evaluate(i => getComputedStyle(document.getElementById(i)).display, id);
  const trackingDisplay = () => page.evaluate(() => getComputedStyle(document.getElementById('job-tracking-section')).display);

  // ═══ 1. Add-mode: every field always shown; tracking section hidden
  //         (no saved job id yet to attach Options/milestones to) ═════════
  await page.evaluate(() => openAddJob());
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => !document.getElementById('job-mode-seg')), '1: the Quick log/Full details toggle no longer exists');
  assert(await fieldDisplay('j-service-field') !== 'none', '1: Service is always shown');
  assert(await fieldDisplay('j-full-row') !== 'none', '1: Expense/Sessions are always shown');
  assert(await fieldDisplay('j-notes-field') !== 'none', '1: Notes is always shown');
  assert(await fieldDisplay('j-amount') !== 'none', '1: Fee is shown');
  assert(await fieldDisplay('j-tip') !== 'none', '1: Tip is shown');
  assert(await trackingDisplay() === 'none', '1: add-mode never shows the tracking section (no saved job id yet)');

  // ═══ 2. Net-take recomputes live (fee + tip - expense) ═════════════════
  await page.fill('#j-amount', '1000');
  await page.fill('#j-tip', '200');
  await page.waitForTimeout(100);
  let net = await page.locator('#j-net').textContent();
  assert(net.includes('1,200') || net.includes('1200'), '2: net = fee+tip with expense untouched (0), got ' + net);
  await page.fill('#j-expense', '300');
  await page.waitForTimeout(100);
  net = await page.locator('#j-net').textContent();
  assert(net.includes('900'), '2: net = fee+tip-expense (1000+200-300=900), got ' + net);
  await page.fill('#j-expense', '');   // clear so it doesn't leak into test 3's save
  await page.waitForTimeout(100);

  // ═══ 3. Cancel is de-escalated to plain-text, Save stays full-width brand ═
  const btnClasses = await page.evaluate(() => {
    // Save/Delete/Cancel are the 3 direct-child buttons of .modal itself
    // (everything else — fastpath, drill-row buttons, etc. — is nested
    // deeper inside .form-section/#job-tracking-section).
    const btns = Array.from(document.querySelectorAll('#modal-job > .modal > button'));
    return btns.map(b => ({ text: b.textContent.trim(), cls: b.className }));
  });
  const cancelBtn = btnClasses.find(b => /cancel/i.test(b.text) || b.text === 'ยกเลิก');
  const saveBtn = btnClasses.find(b => /save/i.test(b.text) || b.text.includes('บันทึก'));
  assert(!!cancelBtn && !cancelBtn.cls.includes('btn-danger'), '3: Cancel button no longer carries .btn-danger, got ' + JSON.stringify(cancelBtn));
  assert(!!cancelBtn && cancelBtn.cls.includes('btn-text'), '3: Cancel button uses the existing plain-text .btn-text class, got ' + JSON.stringify(cancelBtn));
  assert(!!saveBtn && saveBtn.cls.includes('btn-submit'), '3: Save stays the full-width primary .btn-submit button, got ' + JSON.stringify(saveBtn));

  // ═══ 4. A from-scratch new job saves correctly ══════════════════════════
  await page.selectOption('#j-customer', String(await page.evaluate(() => window.__cid)));
  await page.fill('#j-amount', '800');
  await page.fill('#j-tip', '50');
  await page.evaluate(() => saveJob());
  await page.waitForTimeout(400);
  const newJob = await page.evaluate(async () => {
    const all = await dbAll('jobs');
    return all.filter(j => j.clientId === window.__cid).sort((a, b) => b.id - a.id)[0];
  });
  assert(!!newJob, '4: a new job was actually created');
  assert(newJob.amount === 800 && newJob.tip === 50 && newJob.expense === 0,
    '4: save carries fee/tip and defaults untouched expense to 0, got ' + JSON.stringify({ amount: newJob.amount, tip: newJob.tip, expense: newJob.expense }));
  assert(newJob.netAmount === 850, '4: netAmount computed fee+tip-expense, got ' + newJob.netAmount);

  // ═══ 5. Editing any job — even a genuinely empty one — always shows the
  //         tracking section now (no more Quick/Full mode decision) ═══════
  const bareJob = await mkJob();
  await page.evaluate(id => openEditJob(id), bareJob);
  await page.waitForTimeout(300);
  assert(await trackingDisplay() !== 'none', '5: editing an empty job still shows the tracking section (Options compared + Plan & payments)');
  await page.evaluate(() => closeJobModal());

  // ═══ 6. Each of the 2 remaining drill rows shows the right "· N" count
  //         and starts closed; tapping its summary opens the underlying
  //         sub-view ══════════════════════════════════════════════════════
  const fullJob = await mkJob({
    options: [{ id: 'o1', name: 'Opt A', status: 'considering', note: '' }, { id: 'o2', name: 'Opt B', status: 'interested', note: '' }],
    milestones: [{ id: 'm1', pct: 50, amount: 500, gatingSubTaskId: null }],
  });
  await page.evaluate(id => openEditJob(id), fullJob);
  await page.waitForTimeout(300);
  assert(await trackingDisplay() !== 'none', '6: Full tracking section shown for a job carrying options/milestones');
  assert(await page.evaluate(() => !document.getElementById('job-items-details')), '6: "Items on this engagement" drill row no longer exists');
  assert(await page.evaluate(() => !document.getElementById('job-time-details')), '6: "Time tracking" drill row no longer exists');

  const counts = await page.evaluate(() => ({
    options: document.getElementById('job-options-count').textContent,
    plan: document.getElementById('job-plan-count').textContent,
  }));
  assert(counts.options.includes('2'), '6: options drill row shows count 2, got ' + JSON.stringify(counts.options));
  assert(counts.plan.includes('1'), '6: plan drill row shows 1 milestone, got ' + JSON.stringify(counts.plan));

  const openStates = ['job-options-details', 'job-plan-details'];
  for (const id of openStates) {
    const openBefore = await page.evaluate(i => document.getElementById(i).open, id);
    assert(openBefore === false, `6: ${id} starts closed`);
  }
  // Tap the options drill row's own summary (real click, not JS-forced) —
  // this is the actual user affordance the design calls for.
  await page.click('#job-options-details summary');
  await page.waitForTimeout(100);
  const optionsOpenAfter = await page.evaluate(() => document.getElementById('job-options-details').open);
  assert(optionsOpenAfter === true, '6: tapping the options summary opens the drill row');
  const optionsBodyVisible = await page.locator('#job-options-body .list-row').first().isVisible();
  assert(optionsBodyVisible, '6: once open, the real options list (2 rows) is visible/interactable');
  const optionRowCount = await page.locator('#job-options-body .list-row').count();
  assert(optionRowCount === 2, '6: options drill row reveals exactly the 2 options that were counted, got ' + optionRowCount);

  await page.evaluate(() => closeJobModal());

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log('Console/page errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

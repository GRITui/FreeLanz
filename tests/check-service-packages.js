/* Acceptance suite for TSK-024: linking a catalog Service to the Package it
 * funds. Before this pass, "Package" (the client's tracked session/unit
 * balance) and "Service" (the catalog price/usage-qty template) were
 * entirely disconnected — packages.serviceId didn't exist, so a) selling a
 * package required a separate manual "+Add package" step re-typing the same
 * numbers, and b) refreshJobPackageRow()/activePackageFor() offered "the
 * client's most recent package with any balance" regardless of which
 * service the job was actually for — a client holding two different
 * services' packages at once could have the wrong one silently applied.
 *
 * This suite covers: auto-creating a package the first time a package-type
 * service (usageQty > 1) is booked for a client with none yet; scoping the
 * "Apply to package" row/deduction to the exact (client, service) pair, not
 * just the client; a non-package-type service never offering/creating one;
 * two different services' packages coexisting independently for the same
 * client; and the Client detail + Clients list tagging each package with
 * its linked service's name.
 *
 * Run: NODE_PATH=/opt/node22/lib/node_modules node tests/check-service-packages.js
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
  await page.fill('#auth-user', 'svcpkg' + Date.now());
  await page.fill('#auth-name', 'SvcPkg Tester');
  await page.fill('#auth-pass', 'pass1234');
  await page.fill('#auth-confirm', 'pass1234');
  await page.click('#auth-submit');
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('cloud-backup-modal')?.remove());
  await page.evaluate(async () => { await onLangChange('en'); });
  await page.waitForTimeout(200);

  const ids = await page.evaluate(async () => {
    const uid = currentUser.id;
    const clientId = await dbAdd('clients', { uid, name: 'Somchai', phone: '', notes: '', createdAt: nowISO(), cuid: cuid() });
    const trainingId = await dbAdd('services', { uid, name: '1-on-1 training', rate: 5500, unit: 'session', usageQty: 10, kind: 'service', cuid: cuid(), updatedAt: nowISO() });
    const nutritionId = await dbAdd('services', { uid, name: 'Nutrition consult', rate: 3000, unit: 'session', usageQty: 5, kind: 'service', cuid: cuid(), updatedAt: nowISO() });
    const singleId = await dbAdd('services', { uid, name: 'Single consult', rate: 800, unit: 'session', usageQty: 1, kind: 'service', cuid: cuid(), updatedAt: nowISO() });
    await reload();
    return { clientId, trainingId, nutritionId, singleId };
  });

  const jobsForClient = () => page.evaluate(cid => jobs.filter(j => j.clientId === cid), ids.clientId);
  const pkgById = (id) => page.evaluate(pid => packages.find(p => p.id === pid), id);
  const packageRow = () => page.evaluate(() => ({
    display: document.getElementById('j-package-row').style.display,
    checked: document.getElementById('j-apply-package').checked,
    label: document.getElementById('j-package-label').textContent,
    hiddenId: document.getElementById('j-package-id').value,
  }));

  // ═══ 1. Add-mode, client + a package-type service with no existing
  //         package yet: the row shows, checked by default, labeled "new" ═══
  await page.evaluate(() => openAddJob());
  await page.waitForTimeout(150);
  await page.selectOption('#j-customer', String(ids.clientId));
  await page.waitForTimeout(150);
  await page.selectOption('#j-service', String(ids.trainingId));
  await page.waitForTimeout(150);
  let row = await packageRow();
  assert(row.display === 'flex', '1: package row shows for a package-type service with no existing package');
  assert(row.checked === true, '1: checkbox is checked by default');
  assert(row.hiddenId === '', '1: no existing package id yet — hidden field stays empty');
  assert(/new/i.test(row.label) && row.label.includes('10'), '1: label says "new" and shows the service\'s usageQty (10), got ' + row.label);

  // ═══ 2. Saving creates the package from the service's own usageQty/rate,
  //         links job.packageId to it, and (since a fresh job hasn't been
  //         delivered yet) leaves its balance untouched at 10/10 ══════════
  await page.fill('#j-amount', '5500');
  await page.evaluate(() => saveJob());
  await page.waitForTimeout(400);
  let clientJobs = await jobsForClient();
  assert(clientJobs.length === 1, '2: exactly one job created, got ' + clientJobs.length);
  const trainingJobId = clientJobs[0].id;
  assert(clientJobs[0].packageId != null, '2: job.packageId was set');
  const trainingPkg = await pkgById(clientJobs[0].packageId);
  assert(!!trainingPkg, '2: the linked package actually exists');
  assert(trainingPkg.serviceId === ids.trainingId, '2: new package.serviceId === the training service, got ' + trainingPkg.serviceId);
  assert(trainingPkg.totalSessions === 10 && trainingPkg.price === 5500,
    '2: new package pulled totalSessions/price from the service, got ' + JSON.stringify({ t: trainingPkg.totalSessions, p: trainingPkg.price }));
  const remainingBeforeDelivery = await page.evaluate(pid => packageRemaining(packages.find(p => p.id === pid)), trainingPkg.id);
  assert(remainingBeforeDelivery === 10, '2: balance untouched until the job is actually delivered, got ' + remainingBeforeDelivery);
  await page.evaluate(() => closeJobModal());

  // ═══ 3. Re-opening Add-job for the same (client, service) pair now finds
  //         the just-created package instead of offering a new one ═══════
  await page.evaluate(() => openAddJob());
  await page.waitForTimeout(150);
  await page.selectOption('#j-customer', String(ids.clientId));
  await page.waitForTimeout(150);
  await page.selectOption('#j-service', String(ids.trainingId));
  await page.waitForTimeout(150);
  row = await packageRow();
  assert(row.hiddenId === String(trainingPkg.id), '3: the existing training package is now offered, got ' + row.hiddenId);
  assert(!/new/i.test(row.label) && row.label.includes('10') && row.label.includes('of'),
    '3: label shows the real remaining/total, not "new", got ' + row.label);
  await page.evaluate(() => closeJobModal());

  // ═══ 4. Switching a client's service to Single consult (usageQty === 1,
  //         not a package-type service) never offers or creates a package —
  //         the core scoping fix: a package tied to one service must never
  //         leak into a job booked for a different one ══════════════════
  await page.evaluate(() => openAddJob());
  await page.waitForTimeout(150);
  await page.selectOption('#j-customer', String(ids.clientId));
  await page.waitForTimeout(150);
  await page.selectOption('#j-service', String(ids.singleId));
  await page.waitForTimeout(150);
  row = await packageRow();
  assert(row.display === 'none', '4: package row hidden for a non-package-type service, even though this client has an active training package');
  await page.fill('#j-amount', '800');
  await page.evaluate(() => saveJob());
  await page.waitForTimeout(400);
  clientJobs = await jobsForClient();
  const singleJob = clientJobs.find(j => j.serviceId === ids.singleId);
  assert(!!singleJob && singleJob.packageId == null, '4: the Single consult job was saved with no packageId at all');

  // ═══ 5. A second package-type service (Nutrition consult) for the SAME
  //         client creates its OWN independent package — doesn't touch or
  //         merge with the training package ═══════════════════════════════
  await page.evaluate(() => openAddJob());
  await page.waitForTimeout(150);
  await page.selectOption('#j-customer', String(ids.clientId));
  await page.waitForTimeout(150);
  await page.selectOption('#j-service', String(ids.nutritionId));
  await page.waitForTimeout(150);
  row = await packageRow();
  assert(row.display === 'flex' && /new/i.test(row.label) && row.label.includes('5'),
    '5: Nutrition consult (its own package-type service) offers to start its own new package, got ' + row.label);
  await page.fill('#j-amount', '3000');
  await page.evaluate(() => saveJob());
  await page.waitForTimeout(400);
  clientJobs = await jobsForClient();
  const nutritionJob = clientJobs.find(j => j.serviceId === ids.nutritionId);
  const nutritionPkg = await pkgById(nutritionJob.packageId);
  assert(!!nutritionPkg && nutritionPkg.serviceId === ids.nutritionId && nutritionPkg.id !== trainingPkg.id,
    '5: a separate package was created for Nutrition consult, distinct from the training one');
  const trainingRemainingUnaffected = await page.evaluate(pid => packageRemaining(packages.find(p => p.id === pid)), trainingPkg.id);
  assert(trainingRemainingUnaffected === 10, '5: booking Nutrition consult left the training package untouched, got ' + trainingRemainingUnaffected);

  // ═══ 6. Delivering the training job actually deducts from ITS package
  //         only (packageUsed()/packageRemaining() — unchanged mechanics,
  //         just confirming the new link feeds them correctly) ═══════════
  await page.evaluate(async id => {
    const j = jobs.find(x => x.id === id);
    j.stage = 'deliver'; j.count = 1;
    await dbPut('jobs', j);
    await reload();
  }, trainingJobId);
  await page.waitForTimeout(200);
  const trainingRemainingAfterDeliver = await page.evaluate(pid => packageRemaining(packages.find(p => p.id === pid)), trainingPkg.id);
  assert(trainingRemainingAfterDeliver === 9, '6: delivering the training job dropped its package to 9/10, got ' + trainingRemainingAfterDeliver);
  const nutritionRemainingStillFull = await page.evaluate(pid => packageRemaining(packages.find(p => p.id === pid)), nutritionPkg.id);
  assert(nutritionRemainingStillFull === 5, '6: the unrelated Nutrition package is unaffected, got ' + nutritionRemainingStillFull);

  // ═══ 7. Client detail (renderCustomerPackages): both packages listed,
  //         each tagged with its own service's name ═══════════════════════
  await page.evaluate(cid => openEditCustomer(cid), ids.clientId);
  await page.waitForTimeout(300);
  const pkgBodyHtml = await page.evaluate(() => document.getElementById('cust-package-body').innerHTML);
  assert(pkgBodyHtml.includes('1-on-1 training'), '7: client detail tags the training package with its service name');
  assert(pkgBodyHtml.includes('Nutrition consult'), '7: client detail tags the nutrition package with its service name');
  assert(pkgBodyHtml.includes('9/10'), '7: training package shows 9/10 remaining in the client detail, got snippet ' + pkgBodyHtml.slice(0, 400));
  assert(pkgBodyHtml.includes('5/5'), '7: untouched nutrition package shows 5/5 remaining');
  await page.evaluate(() => closeCustomerModal());

  // ═══ 8. Clients list badge tags the client's most-recent active package
  //         with its service name too ═══════════════════════════════════
  await page.evaluate(() => switchScreen('customers'));
  await page.waitForTimeout(300);
  const listHtml = await page.evaluate(() => document.getElementById('customers-body').innerHTML);
  assert(listHtml.includes('pkg-badge'), '8: the Clients list row renders a pkg-badge for this client');
  assert(listHtml.includes('Nutrition consult') || listHtml.includes('1-on-1 training'),
    '8: the pkg-badge is tagged with a service name, not just a bare count, got snippet ' + (listHtml.match(/pkg-badge[^<]*/) || [''])[0]);

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log('Console/page errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

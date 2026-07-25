const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined, headless: true });
  const errors = [];
  let pass = 0, fail = 0;
  const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('FAIL:', msg); } };

  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(String(err)));

  // Fresh guest boot via login.html
  await page.goto('http://localhost:8923/login.html');
  await page.waitForTimeout(300);

  // 1. Default theme should be light (no dark dataset)
  const themeAttr = await page.evaluate(() => document.documentElement.dataset.theme);
  assert(themeAttr === 'light' || themeAttr === undefined, 'default theme should be light, got: ' + themeAttr);

  // 2. Default language should be Thai (tagline text, since HTML fallback is English until applyLang())
  await page.waitForTimeout(200);
  const tagline = await page.textContent('#s-auth .auth-hero p');
  assert(tagline && /[฀-๿]/.test(tagline), 'tagline should render in Thai by default, got: ' + tagline);
  const loginBtnText = await page.textContent('#tab-login');
  assert(loginBtnText && /[฀-๿]/.test(loginBtnText), 'login tab should render in Thai, got: ' + loginBtnText);

  // 3. TSK-021: Continue as guest -> lands directly on Home, no persona
  //    onboarding modal, no interruption to boot (owner: stop asking a new
  //    account "what kind of business do you run?" at signup). The picker
  //    (#modal-persona-onboard) survives only for the dedicated "Try a
  //    demo" flow (login.html?demo=1) — see check-demo-data.js.
  await page.click('button.auth-btn.guest');
  await page.waitForURL('**/index.html', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);

  const modalOpen = await page.evaluate(() => document.getElementById('modal-persona-onboard').classList.contains('open'));
  assert(!modalOpen, 'persona onboarding modal should NOT open for a plain guest/registered account');

  const homeActive = await page.evaluate(() => document.getElementById('s-home').classList.contains('active'));
  assert(homeActive, 'Home should be active immediately — nothing blocks boot anymore');

  // 4. businessType defaults to 'custom' automatically, with zero services
  //    auto-seeded (BUSINESS_TYPES.custom.seedServices is empty) — the
  //    owner's other ask, "stop auto-seeding a starter catalog".
  await page.evaluate(() => window.switchScreen && window.switchScreen('more'));
  await page.waitForTimeout(300);
  const btVal = await page.inputValue('#set-business-type');
  assert(btVal === 'custom', 'Settings business-type select should default to custom with no picker, got: ' + btVal);

  await page.evaluate(() => window.switchScreen && window.switchScreen('services'));
  await page.waitForTimeout(300);
  const servicesText = await page.textContent('#services-body');
  assert(!servicesText || !servicesText.includes('Oil change'), 'no starter services auto-seeded for the default custom persona, got: ' + (servicesText || '').slice(0, 200));

  // 5. The persona concept itself survives — switching business type later
  //    via Settings still re-seeds that type's starter catalog (TSK-021
  //    kept this manual path per the owner's scope: onboarding-only removal).
  //    #set-business-type lives on the "Business & documents" drill-in
  //    (TSK-002/007), not the More root itself.
  await page.evaluate(() => window.switchScreen && window.switchScreen('more-biz'));
  await page.waitForTimeout(300);
  await page.selectOption('#set-business-type', 'garage');
  await page.evaluate(v => window.onBusinessTypeChange && window.onBusinessTypeChange(v), 'garage');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.switchScreen && window.switchScreen('services'));
  await page.waitForTimeout(300);
  const servicesTextAfter = await page.textContent('#services-body');
  assert(servicesTextAfter && servicesTextAfter.includes('Oil change'), 'manually switching to garage in Settings still auto-seeds "Oil change", got: ' + (servicesTextAfter || '').slice(0, 200));

  // 6. Reload -> no onboarding modal (businessType already set, same as before)
  await page.reload();
  await page.waitForTimeout(600);
  const modalOpenAfterReload = await page.evaluate(() => document.getElementById('modal-persona-onboard').classList.contains('open'));
  assert(!modalOpenAfterReload, 'onboarding modal should not appear after reload once persona/businessType is set');
  const homeActiveAfterReload = await page.evaluate(() => document.getElementById('s-home').classList.contains('active'));
  assert(homeActiveAfterReload, 'Home should be active immediately on reload');

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log('Console/page errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
})();

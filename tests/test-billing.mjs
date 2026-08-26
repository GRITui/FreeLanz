// Sidekick — api/billing-checkout.js / api/billing-portal.js handler logic
// against an in-memory fake sql + a fake Stripe client, same style as
// test-booking-confirm.mjs/test-teams.mjs. TSK-034: these two real-money
// entry points had zero coverage in the CI-gating battery before this file
// (tests/smoke-live.mjs's billing-checkout reference needs a live
// deployment and is excluded from tests/run-all.sh's globs; billing-portal
// had no reference anywhere in tests/ at all).
process.env.SESSION_SECRET = 'test-session-secret';
process.env.STRIPE_PRICE_BASIC = 'price_basic_123';
process.env.STRIPE_PRICE_PRO = 'price_pro_123';
process.env.STRIPE_PRICE_TEAM = 'price_team_123';

import { signSession } from '../lib/auth.js';
import { createBillingCheckoutHandler } from '../api/billing-checkout.js';
import { createBillingPortalHandler } from '../api/billing-portal.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) pass++; else { fail++; console.log('FAIL:', msg); } };

// ── In-memory "users" + "team_members" tables ───────────────────────────
let users, teamMembers;
function resetDb() {
  users = [
    { cuid: 'owner-1', username: 'owner@example.com', stripe_customer_id: null },
    { cuid: 'owner-2', username: 'plainusername', stripe_customer_id: 'cus_existing' },
  ];
  teamMembers = [{ org_owner_cuid: 'owner-1', member_cuid: 'staff-1', role: 'staff' }];
}
function fakeSql(text, params) {
  const t = Array.isArray(text) ? text.join('?') : text;
  const p = Array.isArray(text) ? Array.from(arguments).slice(1) : params;
  if (t.includes('select 1 from team_members where member_cuid')) {
    return Promise.resolve(teamMembers.some(m => m.member_cuid === p[0]) ? [{ '?column?': 1 }] : []);
  }
  if (t.includes('select cuid, username, stripe_customer_id from users where cuid')) {
    return Promise.resolve(users.filter(u => u.cuid === p[0]));
  }
  if (t.includes('select stripe_customer_id from users where cuid')) {
    return Promise.resolve(users.filter(u => u.cuid === p[0]).map(u => ({ stripe_customer_id: u.stripe_customer_id })));
  }
  if (t.includes('update users set stripe_customer_id')) {
    const u = users.find(x => x.cuid === p[1]);
    if (u) u.stripe_customer_id = p[0];
    return Promise.resolve([]);
  }
  throw new Error('unexpected query in fakeSql: ' + t);
}

// ── Fake Stripe client ───────────────────────────────────────────────────
function fakeStripe(overrides = {}) {
  return {
    customers: {
      create: async (params) => {
        if (overrides.onCustomersCreate) overrides.onCustomersCreate(params);
        if (overrides.customersCreateThrows) throw new Error('stripe customers.create failed');
        return { id: overrides.newCustomerId || 'cus_new' };
      },
    },
    checkout: {
      sessions: {
        create: async (params) => {
          if (overrides.onCheckoutCreate) overrides.onCheckoutCreate(params);
          return { url: overrides.checkoutUrl || 'https://checkout.stripe.com/session_1' };
        },
      },
    },
    billingPortal: {
      sessions: {
        create: async (params) => {
          if (overrides.onPortalCreate) overrides.onPortalCreate(params);
          return { url: overrides.portalUrl || 'https://billing.stripe.com/session_1' };
        },
      },
    },
  };
}

async function tokenFor(userCuid) {
  return signSession({ userCuid }, process.env.SESSION_SECRET);
}
function postRequest(path, token, body) {
  const headers = { 'content-type': 'application/json' };
  if (token !== undefined) headers.authorization = `Bearer ${token}`;
  return new Request(`https://x${path}`, {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function main() {
  // ═══════════════════════════ billing-checkout ═══════════════════════
  {
    const handler = createBillingCheckoutHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });

    const res = await handler(new Request('https://x/api/billing-checkout', { method: 'GET' }));
    assert(res.status === 405, 'checkout: non-POST -> 405');
  }

  {
    const saved = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    const handler = createBillingCheckoutHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });
    const res = await handler(postRequest('/api/billing-checkout', undefined, { plan: 'basic' }));
    assert(res.status === 500, 'checkout: missing SESSION_SECRET -> 500 (server misconfigured)');
    process.env.SESSION_SECRET = saved;
  }

  {
    const handler = createBillingCheckoutHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });
    const res = await handler(postRequest('/api/billing-checkout', undefined, { plan: 'basic' }));
    assert(res.status === 401, 'checkout: no/invalid session -> 401');
  }

  {
    resetDb();
    const token = await tokenFor('owner-1');
    const handler = createBillingCheckoutHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });
    const res = await handler(postRequest('/api/billing-checkout', token, { plan: 'enterprise' }));
    assert(res.status === 400, 'checkout: an unrecognized plan -> 400');
  }

  {
    resetDb();
    const savedPrice = process.env.STRIPE_PRICE_PRO;
    delete process.env.STRIPE_PRICE_PRO;
    const token = await tokenFor('owner-1');
    const handler = createBillingCheckoutHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });
    const res = await handler(postRequest('/api/billing-checkout', token, { plan: 'pro' }));
    assert(res.status === 500, 'checkout: a recognized plan with no matching STRIPE_PRICE_* env var -> 500');
    process.env.STRIPE_PRICE_PRO = savedPrice;
  }

  {
    resetDb();
    const token = await tokenFor('owner-1');
    const handler = createBillingCheckoutHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });
    const resNonInt = await handler(postRequest('/api/billing-checkout', token, { plan: 'team', seats: 'abc' }));
    assert(resNonInt.status === 400, 'checkout: team plan with a non-integer seats value -> 400');
    const resTooFew = await handler(postRequest('/api/billing-checkout', token, { plan: 'team', seats: 1 }));
    assert(resTooFew.status === 400, 'checkout: team plan with seats below the minimum (2) -> 400');
  }

  {
    // Owner-only gate: a team member (staff-1) can never start checkout,
    // even for their own org's plan — billing stays with the account owner.
    resetDb();
    let stripeCalled = false;
    const token = await tokenFor('staff-1');
    const handler = createBillingCheckoutHandler({
      getSql: () => fakeSql,
      getStripeClient: () => fakeStripe({ onCustomersCreate: () => { stripeCalled = true; } }),
    });
    const res = await handler(postRequest('/api/billing-checkout', token, { plan: 'basic' }));
    assert(res.status === 403, 'checkout: a non-owner team member -> 403');
    assert(!stripeCalled, 'checkout: a rejected non-owner never reaches the Stripe client');
  }

  {
    resetDb();
    const token = await tokenFor('ghost-cuid');
    const handler = createBillingCheckoutHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });
    const res = await handler(postRequest('/api/billing-checkout', token, { plan: 'basic' }));
    assert(res.status === 404, 'checkout: a valid session for a user row that no longer exists -> 404');
  }

  {
    // No stored Stripe customer yet: a new Customer is created (valid-looking
    // username -> passed as email), persisted back onto the user row, and
    // used for the Checkout Session; basic/pro default to quantity 1.
    resetDb();
    let customerCreateParams = null;
    let checkoutParams = null;
    const token = await tokenFor('owner-1');
    const handler = createBillingCheckoutHandler({
      getSql: () => fakeSql,
      getStripeClient: () => fakeStripe({
        newCustomerId: 'cus_freshly_created',
        onCustomersCreate: (p) => { customerCreateParams = p; },
        onCheckoutCreate: (p) => { checkoutParams = p; },
        checkoutUrl: 'https://checkout.stripe.com/fresh',
      }),
    });
    const res = await handler(postRequest('/api/billing-checkout', token, { plan: 'basic' }));
    const data = await res.json();
    assert(res.status === 200 && data.url === 'https://checkout.stripe.com/fresh', 'checkout: a first-time owner -> 200 with the Checkout Session url');
    assert(customerCreateParams && customerCreateParams.email === 'owner@example.com', 'checkout: a username that looks like an email is passed as the new Stripe Customer\'s email');
    assert(users[0].stripe_customer_id === 'cus_freshly_created', 'checkout: the newly created Stripe customer id is persisted back onto the user row');
    assert(checkoutParams && checkoutParams.customer === 'cus_freshly_created', 'checkout: the Checkout Session is created against the newly created customer id');
    assert(checkoutParams && checkoutParams.line_items[0].price === process.env.STRIPE_PRICE_BASIC && checkoutParams.line_items[0].quantity === 1, 'checkout: the basic plan selects STRIPE_PRICE_BASIC at quantity 1');
    assert(checkoutParams && checkoutParams.success_url.includes('billing=success') && checkoutParams.cancel_url.includes('billing=cancel'), 'checkout: success_url/cancel_url carry the expected billing query params');
    assert(checkoutParams && checkoutParams.success_url.startsWith('https://gritui.github.io/Sidekickz'), 'checkout: with no Origin header, success_url falls back to the app\'s own origin (not a bare Vercel/API origin)');
  }

  {
    // A non-email-shaped username is never sent to Stripe as an email.
    resetDb();
    let customerCreateParams = null;
    const token = await tokenFor('owner-2');
    users[1].stripe_customer_id = null; // force the create-customer path for this case
    const handler = createBillingCheckoutHandler({
      getSql: () => fakeSql,
      getStripeClient: () => fakeStripe({ onCustomersCreate: (p) => { customerCreateParams = p; } }),
    });
    await handler(postRequest('/api/billing-checkout', token, { plan: 'basic' }));
    assert(customerCreateParams && customerCreateParams.email === undefined, 'checkout: a non-email-shaped username is never passed as the Stripe customer email');
  }

  {
    // An existing stripe_customer_id is reused as-is — no new Customer created.
    resetDb();
    let customerCreateCalled = false;
    let checkoutParams = null;
    const token = await tokenFor('owner-2');
    const handler = createBillingCheckoutHandler({
      getSql: () => fakeSql,
      getStripeClient: () => fakeStripe({
        onCustomersCreate: () => { customerCreateCalled = true; },
        onCheckoutCreate: (p) => { checkoutParams = p; },
      }),
    });
    const res = await handler(postRequest('/api/billing-checkout', token, { plan: 'team', seats: 5 }));
    assert(res.status === 200, 'checkout: an owner with a stored stripe_customer_id -> 200');
    assert(!customerCreateCalled, 'checkout: an existing stripe_customer_id skips creating a new Stripe Customer');
    assert(checkoutParams && checkoutParams.customer === 'cus_existing', 'checkout: the existing stripe_customer_id is used for the Checkout Session');
    assert(checkoutParams && checkoutParams.line_items[0].price === process.env.STRIPE_PRICE_TEAM && checkoutParams.line_items[0].quantity === 5, 'checkout: the team plan selects STRIPE_PRICE_TEAM at the requested seat quantity');
  }

  {
    // A Stripe API failure never leaks a raw 5xx/exception — it's caught
    // and mapped to a stable 502.
    resetDb();
    const token = await tokenFor('owner-1');
    const handler = createBillingCheckoutHandler({
      getSql: () => fakeSql,
      getStripeClient: () => fakeStripe({ customersCreateThrows: true }),
    });
    const res = await handler(postRequest('/api/billing-checkout', token, { plan: 'basic' }));
    assert(res.status === 502, 'checkout: a Stripe API error is caught and mapped to 502, not left to throw');
  }

  // ═══════════════════════════ billing-portal ══════════════════════════
  {
    const handler = createBillingPortalHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });
    const res = await handler(new Request('https://x/api/billing-portal', { method: 'GET' }));
    assert(res.status === 405, 'portal: non-POST -> 405');
  }

  {
    const handler = createBillingPortalHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });
    const res = await handler(postRequest('/api/billing-portal', undefined));
    assert(res.status === 401, 'portal: no/invalid session -> 401');
  }

  {
    // Owner-only gate applies to the portal exactly like checkout — a team
    // member (staff or admin) can never reach the billing portal either.
    resetDb();
    let stripeCalled = false;
    const token = await tokenFor('staff-1');
    const handler = createBillingPortalHandler({
      getSql: () => fakeSql,
      getStripeClient: () => fakeStripe({ onPortalCreate: () => { stripeCalled = true; } }),
    });
    const res = await handler(postRequest('/api/billing-portal', token));
    assert(res.status === 403, 'portal: a non-owner team member -> 403');
    assert(!stripeCalled, 'portal: a rejected non-owner never reaches the Stripe client');
  }

  {
    resetDb();
    const token = await tokenFor('ghost-cuid');
    const handler = createBillingPortalHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });
    const res = await handler(postRequest('/api/billing-portal', token));
    assert(res.status === 404, 'portal: a valid session for a user row that no longer exists -> 404');
  }

  {
    // No stripe_customer_id yet (never checked out) -> 409 with the
    // machine-readable no_customer code the client branches on.
    resetDb();
    const token = await tokenFor('owner-1');
    const handler = createBillingPortalHandler({ getSql: () => fakeSql, getStripeClient: () => fakeStripe() });
    const res = await handler(postRequest('/api/billing-portal', token));
    const data = await res.json();
    assert(res.status === 409 && data.code === 'no_customer', 'portal: an owner with no stored stripe_customer_id -> 409 no_customer');
  }

  {
    resetDb();
    let portalParams = null;
    const token = await tokenFor('owner-2');
    const handler = createBillingPortalHandler({
      getSql: () => fakeSql,
      getStripeClient: () => fakeStripe({ onPortalCreate: (p) => { portalParams = p; }, portalUrl: 'https://billing.stripe.com/portal_1' }),
    });
    const res = await handler(postRequest('/api/billing-portal', token));
    const data = await res.json();
    assert(res.status === 200 && data.url === 'https://billing.stripe.com/portal_1', 'portal: an owner with a stored stripe_customer_id -> 200 with the Billing Portal Session url');
    assert(portalParams && portalParams.customer === 'cus_existing', 'portal: the Billing Portal Session is created against the stored customer id');
    assert(portalParams && portalParams.return_url.startsWith('https://gritui.github.io/Sidekickz') && portalParams.return_url.includes('screen=more'), 'portal: return_url lands back on the app\'s own origin at the More screen');
  }

  {
    // A Stripe API failure is caught and mapped to 502, same as checkout.
    resetDb();
    const token = await tokenFor('owner-2');
    const handler = createBillingPortalHandler({
      getSql: () => fakeSql,
      getStripeClient: () => ({ billingPortal: { sessions: { create: async () => { throw new Error('stripe down'); } } } }),
    });
    const res = await handler(postRequest('/api/billing-portal', token));
    assert(res.status === 502, 'portal: a Stripe API error is caught and mapped to 502, not left to throw');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();

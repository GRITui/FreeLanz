process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_local_harness';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_1234567890';

import Stripe from '../node_modules/stripe/esm/stripe.esm.node.js';
import { verifyStripeWebhook } from '../lib/stripe.js';
import { createStripeWebhookHandler, mapStripeStatus } from '../api/stripe-webhook.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) pass++; else { fail++; console.log('FAIL:', msg); } };

const secret = process.env.STRIPE_WEBHOOK_SECRET;
const payload = JSON.stringify({
  id: 'evt_test_1',
  type: 'customer.subscription.updated',
  data: { object: { id: 'sub_123', customer: 'cus_123', status: 'active', current_period_end: 1999999999, metadata: { plan: 'pro', userCuid: 'user-abc' } } },
});

const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });

try {
  const event = await verifyStripeWebhook(payload, header, secret);
  assert(event.type === 'customer.subscription.updated', 'valid signature verifies and returns the parsed event');
} catch (err) {
  fail++; console.log('FAIL: valid signature should verify, got error:', err.message);
}

try {
  await verifyStripeWebhook(payload, header, 'whsec_wrong_secret');
  fail++; console.log('FAIL: wrong secret should have thrown');
} catch (err) {
  pass++;
}

try {
  const tamperedPayload = payload.replace('"active"', '"canceled"');
  await verifyStripeWebhook(tamperedPayload, header, secret);
  fail++; console.log('FAIL: tampered payload should have thrown');
} catch (err) {
  pass++;
}

try {
  await verifyStripeWebhook(payload, 'not-a-real-signature-header', secret);
  fail++; console.log('FAIL: malformed signature header should have thrown');
} catch (err) {
  pass++;
}

// ── mapStripeStatus: full mapping table ──────────────────────────────────
assert(mapStripeStatus('active') === 'active', "mapStripeStatus('active') -> active");
assert(mapStripeStatus('trialing') === 'trialing', "mapStripeStatus('trialing') -> trialing");
assert(mapStripeStatus('past_due') === 'past_due', "mapStripeStatus('past_due') -> past_due");
assert(mapStripeStatus('unpaid') === 'past_due', "mapStripeStatus('unpaid') -> past_due (collapsed with past_due)");
assert(mapStripeStatus('canceled') === 'canceled', "mapStripeStatus('canceled') -> canceled");
assert(mapStripeStatus('incomplete') === 'canceled', "mapStripeStatus('incomplete') -> canceled (unmapped Stripe state treated as locked)");
assert(mapStripeStatus('incomplete_expired') === 'canceled', "mapStripeStatus('incomplete_expired') -> canceled");
assert(mapStripeStatus('paused') === 'canceled', "mapStripeStatus('paused') -> canceled");
assert(mapStripeStatus('something_stripe_adds_later') === 'canceled', 'an unrecognized future Stripe status falls back to canceled, not left unmapped');

// ── createStripeWebhookHandler: handler logic against a fake sql + fake ──
// ── verify/Stripe-client injections (no live DB or Stripe network call) ──

// In-memory "users" table keyed by stripe_customer_id, plus a capture of
// every update call so assertions can inspect exact params without a real
// Postgres round-trip.
let users, updateCalls;
function resetHandlerDb() {
  users = [{ cuid: 'user-abc', stripe_customer_id: 'cus_123', subscription_status: 'trialing', plan: 'pro', team_seats: 1, current_period_end: null, stripe_subscription_id: null }];
  updateCalls = [];
}
function fakeSql(text, params) {
  const t = text;
  const p = params || [];
  if (t.includes('update users set subscription_status = $1, current_period_end = $2, stripe_subscription_id = $3, plan = $4, team_seats = $5')) {
    updateCalls.push({ withPlan: true, params: p });
    const u = users.find(x => x.stripe_customer_id === p[5]);
    if (u) Object.assign(u, { subscription_status: p[0], current_period_end: p[1], stripe_subscription_id: p[2], plan: p[3], team_seats: p[4] });
    return Promise.resolve([]);
  }
  if (t.includes('update users set subscription_status = $1, current_period_end = $2, stripe_subscription_id = $3, team_seats = $4')) {
    updateCalls.push({ withPlan: false, params: p });
    const u = users.find(x => x.stripe_customer_id === p[4]);
    if (u) Object.assign(u, { subscription_status: p[0], current_period_end: p[1], stripe_subscription_id: p[2], team_seats: p[3] });
    return Promise.resolve([]);
  }
  throw new Error('unexpected query in fakeSql: ' + t);
}

function makeSub(overrides = {}) {
  return {
    id: 'sub_123', customer: 'cus_123', status: 'active', current_period_end: 1999999999,
    metadata: { plan: 'pro', userCuid: 'user-abc' },
    items: { data: [{ quantity: 1 }] },
    ...overrides,
  };
}
function makeEvent(type, subOverrides = {}) {
  return { id: 'evt_1', type, data: { object: makeSub(subOverrides) } };
}
function postRequest(event, { withSignature = true } = {}) {
  return new Request('https://x/api/stripe-webhook', {
    method: 'POST',
    headers: withSignature ? { 'stripe-signature': 'fake-sig' } : {},
    body: JSON.stringify(event),
  });
}
// verifyWebhook stub: returns whatever event the caller queued, mimicking a
// successfully-verified webhook without touching real Stripe signing (the
// signature-verification behavior itself is already covered above against
// the real verifyStripeWebhook).
function makeVerifyWebhook(queuedEvent) {
  return async (rawBody) => queuedEvent !== undefined ? queuedEvent : JSON.parse(rawBody);
}

async function assertAsync() {
  // Method gating
  resetHandlerDb();
  {
    const handler = createStripeWebhookHandler({ getSql: () => fakeSql });
    const res = await handler(new Request('https://x/api/stripe-webhook', { method: 'GET' }));
    assert(res.status === 405, 'non-POST request -> 405');
  }

  // Missing webhook secret -> 500, no handler work attempted
  {
    const saved = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const handler = createStripeWebhookHandler({ getSql: () => fakeSql });
    const res = await handler(postRequest(makeEvent('customer.subscription.updated')));
    assert(res.status === 500, 'missing STRIPE_WEBHOOK_SECRET -> 500 (server misconfigured)');
    process.env.STRIPE_WEBHOOK_SECRET = saved;
  }

  // Invalid signature -> 401, no DB write
  resetHandlerDb();
  {
    const handler = createStripeWebhookHandler({
      getSql: () => fakeSql,
      verifyWebhook: async () => { throw new Error('bad signature'); },
    });
    const res = await handler(postRequest(makeEvent('customer.subscription.updated')));
    assert(res.status === 401, 'a verifyWebhook rejection -> 401 invalid signature');
    assert(updateCalls.length === 0, 'no DB write attempted when signature verification fails');
  }

  // Non-subscription event type is acked but never touches the DB or Stripe client
  resetHandlerDb();
  {
    let retrieveCalled = false;
    const event = makeEvent('invoice.paid');
    const handler = createStripeWebhookHandler({
      getSql: () => fakeSql,
      verifyWebhook: makeVerifyWebhook(event),
      getStripeClient: () => ({ subscriptions: { retrieve: async () => { retrieveCalled = true; return makeSub(); } } }),
    });
    const res = await handler(postRequest(event));
    const data = await res.json();
    assert(res.status === 200 && data.received === true, 'an unrelated event type still acks 200 (avoids a Stripe retry storm)');
    assert(!retrieveCalled, 'a non-subscription event never calls Stripe to reconcile');
    assert(updateCalls.length === 0, 'a non-subscription event never writes to the DB');
  }

  // customer.subscription.updated: reconciles against Stripe's current state,
  // NOT the (possibly-stale) event payload — this is the out-of-order-
  // delivery guard the file's own header comment documents.
  resetHandlerDb();
  {
    const staleEvent = makeEvent('customer.subscription.updated', { status: 'past_due' }); // stale payload says past_due
    let retrieveCalledWith = null;
    const handler = createStripeWebhookHandler({
      getSql: () => fakeSql,
      verifyWebhook: makeVerifyWebhook(staleEvent),
      getStripeClient: () => ({
        subscriptions: {
          retrieve: async (id) => { retrieveCalledWith = id; return makeSub({ status: 'active' }); }, // Stripe's authoritative current state says active
        },
      }),
    });
    const res = await handler(postRequest(staleEvent));
    assert(res.status === 200, 'subscription.updated with successful reconciliation -> 200');
    assert(retrieveCalledWith === 'sub_123', 'reconciliation retrieves by the event payload\'s subscription id');
    assert(updateCalls.length === 1 && updateCalls[0].params[0] === 'active', 'DB is updated with Stripe\'s reconciled status (active), not the stale event payload status (past_due)');
    assert(users[0].subscription_status === 'active', 'the fake users row reflects the reconciled status');
  }

  // Reconciliation fetch failure falls back to the event payload rather than dropping the update
  resetHandlerDb();
  {
    const event = makeEvent('customer.subscription.created', { status: 'active' });
    const handler = createStripeWebhookHandler({
      getSql: () => fakeSql,
      verifyWebhook: makeVerifyWebhook(event),
      getStripeClient: () => ({ subscriptions: { retrieve: async () => { throw new Error('network blip'); } } }),
    });
    const res = await handler(postRequest(event));
    assert(res.status === 200, 'a reconciliation-fetch failure still acks 200');
    assert(updateCalls.length === 1 && updateCalls[0].params[0] === 'active', 'DB update falls back to the event payload\'s own status when reconciliation fails, rather than being dropped');
  }

  // subscription.deleted skips reconciliation entirely (retrieve would 404/return canceled anyway)
  resetHandlerDb();
  {
    let retrieveCalled = false;
    const event = makeEvent('customer.subscription.deleted', { status: 'canceled' });
    const handler = createStripeWebhookHandler({
      getSql: () => fakeSql,
      verifyWebhook: makeVerifyWebhook(event),
      getStripeClient: () => ({ subscriptions: { retrieve: async () => { retrieveCalled = true; return makeSub(); } } }),
    });
    const res = await handler(postRequest(event));
    assert(res.status === 200, 'subscription.deleted -> 200');
    assert(!retrieveCalled, 'subscription.deleted never calls Stripe to reconcile — the event payload is already the terminal state');
    assert(updateCalls.length === 1 && updateCalls[0].params[0] === 'canceled', 'DB is updated straight from the deleted event\'s own canceled status');
  }

  // plan present in metadata -> the plan-writing query branch; plan omits when metadata has none
  resetHandlerDb();
  {
    const event = makeEvent('customer.subscription.updated', { metadata: { plan: 'pro' } });
    const handler = createStripeWebhookHandler({ getSql: () => fakeSql, verifyWebhook: makeVerifyWebhook(event), getStripeClient: () => ({ subscriptions: { retrieve: async () => makeSub({ metadata: { plan: 'pro' } }) } }) });
    await handler(postRequest(event));
    assert(updateCalls.length === 1 && updateCalls[0].withPlan === true, 'a Stripe-side subscription with metadata.plan set uses the plan-writing update branch');
    assert(users[0].plan === 'pro', 'plan column is written from metadata.plan');
  }
  resetHandlerDb();
  {
    // No metadata.plan (e.g. a subscription edited by hand in the Stripe dashboard, per the file's own header comment).
    const event = makeEvent('customer.subscription.updated', { metadata: {} });
    const handler = createStripeWebhookHandler({ getSql: () => fakeSql, verifyWebhook: makeVerifyWebhook(event), getStripeClient: () => ({ subscriptions: { retrieve: async () => makeSub({ metadata: {} }) } }) });
    await handler(postRequest(event));
    assert(updateCalls.length === 1 && updateCalls[0].withPlan === false, 'a Stripe-side subscription with no metadata.plan uses the no-plan update branch, leaving the stored plan column untouched');
    assert(users[0].plan === 'pro', "the account's existing plan column is left as-is (not nulled out) when no metadata.plan is sent");
  }

  // quantity extraction: present items -> quantity written; missing items -> null, no crash
  resetHandlerDb();
  {
    const event = makeEvent('customer.subscription.updated', { items: { data: [{ quantity: 3 }] } });
    const handler = createStripeWebhookHandler({ getSql: () => fakeSql, verifyWebhook: makeVerifyWebhook(event), getStripeClient: () => ({ subscriptions: { retrieve: async () => makeSub({ items: { data: [{ quantity: 3 }] } }) } }) });
    await handler(postRequest(event));
    assert(users[0].team_seats === 3, 'team_seats is synced from the subscription line item\'s quantity');
  }
  resetHandlerDb();
  {
    const event = makeEvent('customer.subscription.updated', { items: undefined });
    const handler = createStripeWebhookHandler({ getSql: () => fakeSql, verifyWebhook: makeVerifyWebhook(event), getStripeClient: () => ({ subscriptions: { retrieve: async () => makeSub({ items: undefined }) } }) });
    let threw = false;
    try { await handler(postRequest(event)); } catch (err) { threw = true; }
    assert(!threw, 'a subscription payload with no items array does not crash the handler');
    assert(users[0].team_seats === null, 'team_seats is written as null when the subscription has no line items');
  }

  // A DB write failure is caught, logged, and still acks 200 (Stripe retries on non-2xx)
  resetHandlerDb();
  {
    const event = makeEvent('customer.subscription.updated');
    const throwingSql = () => { throw new Error('db unreachable'); };
    const handler = createStripeWebhookHandler({ getSql: () => throwingSql, verifyWebhook: makeVerifyWebhook(event), getStripeClient: () => ({ subscriptions: { retrieve: async () => makeSub() } }) });
    let threw = false;
    let res;
    try { res = await handler(postRequest(event)); } catch (err) { threw = true; }
    assert(!threw, 'a DB write failure never throws out of the handler');
    assert(res && res.status === 200, 'a DB write failure still acks 200 so Stripe does not retry-storm over a logged, investigable error');
  }
}

await assertAsync();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);

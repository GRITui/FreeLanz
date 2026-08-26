<squad_metadata>
  <squad_name>Engineer-Squad</squad_name>
  <current_status>IDLE</current_status>
  <active_task_id>none</active_task_id>
  <sprint_completion_percentage>100</sprint_completion_percentage>
</squad_metadata>

## Current Focus (2026-08-26, ad-hoc single-item cycle -- TSK-035)
Last item of the stripe/billing/auth money-and-auth test-coverage trio
Researcher-Squad epoch 3 flagged as highest-leverage this cycle (TSK-033 ->
PR #92, TSK-034 -> PR #94, both already built by earlier cycles this epoch
-- checked both PRs via the GitHub API before starting: neither is merged
to main yet, and neither touches api/auth-login.js or a
tests/test-auth-login.mjs file, so no duplicate work). Branched from
origin/main, which already carries PR #91's epoch-3 backlog additions
(TSK-029..046) -- no separate rebase needed.

Same shape as TSK-033/034: api/auth-login.js was a bare `export default
async function handler(request)` importing `db`/`verifyPassword`/
`signSession` directly at module scope -- no injection seam for a fake sql
or stubbed crypto existed. Refactored to `createAuthLoginHandler({getSql,
verifyPassword, signSession})`, the same `opts.getSql || db` factory shape
api/booking-requests.js / api/stripe-webhook.js / api/billing-checkout.js
already established (per PR #92/#94's own precedent, read before starting).
`export default createAuthLoginHandler()` keeps production wiring
identical -- zero behavior change, confirmed by the full battery below.

New tests/test-auth-login.mjs (33 assertions) against an in-memory fake
`users` table (fakeSql supports both the tagged-template and (text, params)
call styles auth-login.js itself uses, matching tests/test-teams.mjs's own
fakeSql convention) and stubbed verify/sign functions: method gating;
missing SESSION_SECRET -> 500 with no DB/verify work attempted; missing
username/password -> generic fail with no DB query; a malformed JSON body
caught, not thrown; the three anti-enumeration cases (unknown username /
known username+wrong password / LINE-only account with
password_hash===null) all asserted to produce BYTE-IDENTICAL status+body,
the actual security property GENERIC_FAIL exists for; a successful login's
response shape (token + cuid/username/firstName only -- confirmed
password_hash/salt/iters never leak into the response body); username
trim+lowercase before lookup; a DB failure caught and mapped to 502
(distinguishable from a real bad-credentials 401 in logs/monitoring,
without the client-facing response ever revealing which); and the
rate-limit-wiring proof itself -- 10 requests from one IP all reach normal
auth handling, the 11th gets 429, using a dedicated IP no other assertion
in the file touches so lib/rateLimit.js's real, unmocked module-level
buckets never bleed across scenarios (lib/rateLimit.js's own limiter logic
stays unit-tested in isolation by tests/test-ratelimit.mjs -- this file
only proves auth-login.js wires it in with the right key/limit).

tests/test-auth-login.mjs: 33/33 (new file -- zero direct coverage existed
before this). Full battery re-run clean: `npm ci` (node_modules wasn't
present in this container) + `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/
chromium bash tests/run-all.sh` (same container quirk this file's
epoch-1/TSK-025..027 entries below already documented) -- 17 Node harnesses
+ 34 Playwright suites, 0 failures, exit code 0, no console-error/CRASH
lines in the raw log. `npx eslint api/auth-login.js tests/test-auth-
login.mjs` clean, no findings.

This closes out the whole stripe/billing/auth test-coverage trio this
epoch flagged as highest-leverage (TSK-033/034/035) -- all three now have
real handler-level coverage via the same DI-factory shape. (Post-write
note: TSK-033/034's PRs #92/#94 both merged to main while this cycle was
in flight -- merged origin/main into this branch to pick up both, resolved
the resulting conflicts in this file and backlog-inbox.md by keeping all
three squads' entries, no content dropped.)

---

## Current Focus (2026-08-26, ad-hoc single-item cycle -- TSK-033)
Started this cycle checked out on `researcher-squad/epoch3-launch-polish-sweep`
(PR #91, open/green/mergeable, backlog-only diff adding TSK-029..046 --
not yet merged to main). Read this file's full shipped history plus
loop/backlog-inbox.md's TSK-029..046 before picking anything, per the
ad-hoc cycle's own instruction not to repeat old research.

Picked **TSK-033** (api/stripe-webhook.js's handler logic -- status
mapping + out-of-order-delivery reconciliation -- had zero test coverage)
over its two HIGH-priority siblings TSK-034/035 the epoch-3 cross-squad
note also recommended sequencing first: this is the most directly
revenue-critical of the three (a regression here can silently downgrade
or fail to lock out a subscription), and picking one was required by this
cycle's single-item scope. TSK-034 (billing-checkout/portal) and TSK-035
(auth-login anti-enumeration/rate-limit) are untouched, still READY_FOR_PM,
next in line for a future cycle.

Confirmed before building: the original researcher_notes proposed feeding
the handler "a fake db() and a stubbed stripeClient().subscriptions.retrieve",
but api/stripe-webhook.js's `handler` was a bare `export default async
function handler(request)` that imported `db`/`stripeClient` directly at
module scope -- no injection seam existed, unlike api/booking-requests.js
and api/cron-reminders.js, which already use a `createXHandler(opts)`
factory with an `opts.getSql || db` seam for exactly this reason (see
booking-requests.js's own comment: "same opts.getSql seam
lib/crudHandler.js established"). Rather than reach for module-mocking (no
framework/mocking library in this codebase, correctly per its own
no-build-step philosophy), refactored stripe-webhook.js to the same
established `createStripeWebhookHandler({getSql, verifyWebhook,
getStripeClient})` factory shape -- zero behavior change (verified via the
full battery below), `export default createStripeWebhookHandler()` keeps
production wiring identical. Also exported `mapStripeStatus` directly
(matching lib/db.js's own precedent of exporting an internal helper
specifically so tests can assert it standalone).

Extended tests/test-stripe-webhook.mjs (kept the existing 4
signature-verification assertions against the real `verifyStripeWebhook`
untouched) with 34 new assertions against the new factory + an in-memory
fake sql + injected verify/Stripe-client stubs: `mapStripeStatus`'s full
mapping table (including the three unmapped-Stripe-state-treated-as-locked
cases); method/secret/signature gating; a non-subscription event type never
touching the DB or Stripe; the out-of-order-delivery reconciliation path
proven end-to-end (a stale event payload's status is discarded in favor of
the freshly-retrieved Stripe state); reconciliation-fetch-failure falling
back to the event payload rather than dropping the update;
`subscription.deleted` correctly skipping reconciliation entirely; both the
plan-present and no-metadata-plan DB-write branches; quantity/team_seats
extraction including the no-`items`-array edge case; and a DB write failure
being caught, logged, and still acking 200 rather than throwing (so Stripe
doesn't retry-storm). tests/test-stripe-webhook.mjs: 38/38 (was 4/4). Full
battery re-run clean: 15 Node harnesses + 34 Playwright suites, 0 failures,
0 console errors (Playwright run required `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-
browsers/chromium` against the pre-installed sandbox Chromium, same
container quirk this file's epoch-1 entry below already documented --
`bash tests/run-all.sh` alone starts the static servers fine but doesn't
itself export that env var, so it must be set on the same invocation).

---

## Current Focus (2026-08-26 -- TSK-034 shipped, single-item cycle)
Pulled **TSK-034** specifically (api/billing-checkout.js / api/billing-portal.js
had zero coverage in the CI-gating test battery -- same class of gap as
TSK-033, which is already in flight on PR #92/branch
engineer-squad/tsk-033-stripe-webhook-tests, not duplicated here). Read
that branch's diff first to confirm the established
`createXHandler({getSql, ...})` dependency-injection shape (also used by
api/booking-requests.js, api/slip-verify.js, api/cron-reminders.js) before
touching either file, so this PR matches the same convention rather than
inventing a new one.

Refactored both handlers into `createBillingCheckoutHandler(opts)` /
`createBillingPortalHandler(opts)` factories with an
`opts.getSql`/`opts.getStripeClient` injection seam --
`requireSession` itself is left untouched (pure HMAC verification, no
DB/network involved) so tests exercise it with a real `signSession()`
token rather than mocking it, same as tests/test-booking-confirm.mjs.
`export default create...Handler()` keeps production wiring to the real
`db()`/`stripeClient()` unchanged -- no behavior change to either endpoint.

New tests/test-billing.mjs (33 assertions) against an in-memory fake sql +
fake Stripe client: method/secret/auth gating on both handlers; invalid
plan and missing STRIPE_PRICE_* env var on checkout; team-seat quantity
validation (non-integer, below the 2-seat minimum); the owner-only gate on
both handlers (403 for a team member, Stripe never reached); account-not-
found (404) on both; checkout's first-time-customer creation (email passed
only for an email-shaped username, new customer id persisted back onto the
user row) vs. reusing an existing stripe_customer_id (no duplicate
customer created); correct price ID + quantity per plan; success_url/
cancel_url/return_url all landing on the app's own origin (not a bare
Vercel/API origin); the portal's 409 no_customer branch; and a Stripe API
failure mapped to 502 on both handlers rather than left to throw.

Full battery clean: 17 Node harnesses + 34 Playwright suites, 0 failures,
0 console errors (`npm ci && PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium
bash tests/run-all.sh` -- same Chromium-path workaround this file's epoch-1
entry already documented for this sandbox image; the pre-installed
Chromium at /opt/pw-browsers/chromium is a version behind what the pinned
Playwright devDependency's default executablePath resolution expects).
Shipped: commit on branch engineer-squad/tsk-034-billing-tests, PR #94
(open, P1 label applied), subscribed for CI/review activity. Single-item
cycle as instructed -- not chaining to a second item this pass.

---

## Current Focus (2026-08-05, epoch 2 -- PR #83 merged, this is the follow-up)
TSK-025/026/027 (epoch 1, see entry below) merged to main via PR #83. This
second auto-improvement pass re-synced to main, then searched further:
checked whether jobsThisMonth() (TSK-027's root cause) has other consumers
that could show the same demo-time ฿0 symptom -- confirmed no, since the
fix lives in seedDemoData() itself (the seed source), covering every
consumer automatically, not just Home's hero. Checked dataClient.js's
documented partial-mirror-coverage limitation -- confirmed intentional,
already well-explained in its own header comment, not a bug (learned this
lesson the hard way in epoch 1 with TSK-025/027's two overclaimed guesses
-- read the design rationale before flagging something as broken). Swept
app/*.js for user-controlled text interpolated into HTML with NO escaping
at all (a more severe class than TSK-025's wrong-helper mistake) -- found
3 candidate sites, traced all 3 and confirmed each is actually safe
(wrapped downstream, or consumed via .textContent/already-escaped
attrEsc()) -- a clean negative result, no fix needed.

Landed on TSK-028 instead: DEMO_PERSONA_DATA/BUSINESS_TYPES both define 6
seeded personas, but tests/check-demo-data.js's PERSONAS array only ever
tested 5 -- 'kol' had zero coverage, including for the TSK-027 failure
mode. Added it (one-line fix, the test loop already derives modal row
index from array position). Verified kol passes cleanly, which also
confirms TSK-027's seed-source fix generalizes to a persona never
explicitly checked before. tests/check-demo-data.js: 25/25 (was 22/22).
Full battery: 51/51 suites clean. Shipped directly: commit 9ac0c83.

---

## Current Focus (2026-08-05, epoch 1 -- superseded by the entry above)
Owner-facing backlog (TSK-001..024) was fully shipped/closed as of the prior
epoch (see entry below). PM opened a new auto-improvement epoch since no
owner items were pending: seeded TSK-025 (aria-label htmlEsc()->attrEsc()
consistency fix, app/app.js:5999-6000) and TSK-026 (new regression test,
tests/test-db-schema-consistency.mjs, guarding IndexedDB store references
against a missing createObjectStore()). Both built directly on the PM's own
branch/PR (#83, still open) rather than a separate PR per task, since this
was one continuous session doing PM+Researcher+Engineer work together.

IMPORTANT CORRECTION made before shipping: TSK-025 was originally triaged
as a HIGH-severity "verified attribute-injection bug" describing `label` as
user-entered text. That was wrong -- traced the value back to its source
and it's a static, developer-authored translation string (STAGE_META's 4
fixed keys via t()), never reachable by user input. Downgraded to LOW /
code-hygiene in backlog-inbox.md before the fix shipped. Recorded here so
future cycles don't repeat the same research shortcut (verify data
provenance before calling something a live security bug, not just "this
helper is wrong for this HTML context").

Full test battery run locally (after `npm install` -- node_modules wasn't
present in this container -- and pointing Playwright at the pre-installed
browser via `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`, since the
pinned playwright devDependency (^1.56.1 resolving to 1.61.1) expects a
newer bundled Chromium revision than the one baked into this image):
15 Node harnesses + test-db-schema-consistency.mjs (new) all green, 34 of 35
Playwright suites green. The one failure, check-demo-data.js (3 of 22
assertions: trainer/realestate/insurance demo personas show ฿0 on the Home
hero after seeding), reproduces identically on the pre-TSK-025 base commit
(confirmed via `git stash` + re-run) -- pre-existing, not caused by this
epoch's changes. Logged as TSK-027 and picked up immediately.

TSK-027 shipped (commit f74036c, PR #83). SECOND correction this epoch:
the initial TSK-027 write-up guessed "likely TSK-023 fallout" without
verifying -- also wrong, same mistake pattern as TSK-025's first triage
(asserting a plausible-sounding cause instead of tracing it). Actual root
cause, fully traced: Home's hero uses jobsThisMonth(), a hard calendar-
month filter, and seedDemoData()'s per-persona paid-job daysOffset values
(-5 to -40) were picked without accounting for "today" being early in a
month -- today is 2026-08-05 (day 5), so any offset <= -5 silently lands
in July and drops out. Verified this explains every persona's pass/fail
individually (trainer/realestate lost ALL paid revenue to the boundary;
insurance's one in-month paid job happened to be its ฿0 "claim assistance"
entry; laundry/garage each had one paid job close enough to survive) --
day-of-month-dependent, not a stable regression, which is likely why it
went uncaught. Fix: clamp job dates only (not invoices/bookings/packages/
progressLogs) to never precede the 1st of the current month. Full battery
re-run clean after the fix: 51/51 suites.

Two corrections in one epoch is a pattern worth naming for future cycles:
verify provenance/root-cause with actual evidence (trace the value, git
stash and re-run, whatever it takes) before writing a severity claim or a
causal story into backlog-inbox.md -- a plausible guess is not a finding.

---

TSK-018 part (1) shipped (commit cf3eb73, PR #72 merged) — renderPipelineTimeline()
now also sources dated points from job.due (+ its linked booking), not just
job.subTasks. The deploy pipeline restructure also shipped (PR #74 merged)
and is confirmed working end-to-end — merge-to-main auto-deploys to
staging, and the first chat-triggered production deploy (workflow run
30155369597) went straight through with no manual GitHub approval block.
TSK-022 also shipped (commit 3ff5e45, PR #75 merged) along with two
owner-driven follow-ups delivered in the same PR: the Task flow + Calendar
screens are now merged into one (Board/Timeline/Calendar toggle), and the
Thai tagline was updated. A second chat-triggered production deploy is
in flight for that commit (workflow run 30157135649) as of this write.
TSK-018 part (2) also shipped (commit 508e454, PR #77 merged) once the owner
answered the open design question directly ("I don't actually use it that
way — just remove it"): the standalone dated sub-task list is gone, with
two non-obvious dependencies (Options compared's 📅 Book viewing, milestone
gating) found and confirmed with the owner before building around them —
see backlog-inbox.md's TSK-018 entry for the full writeup.
The owner then said "complete every backlog" — explicit go-ahead to build
TSK-020/021/023 on the squad's own recommendations rather than wait for a
task-by-task confirmation. TSK-023 shipped first (commit a6db194, PR #78
merged): the Quick log/Full details toggle, "Items on this engagement", and
"Time tracking" (+ Focus mode) are removed — Fee/Tip/Expense/Sessions stay
untouched (still held, no revenue-model replacement given). One real
discovery mid-build: the owner's original ask also named "Options compared"
and "Plan & payments" for removal, but those now host TSK-018 part 2's Book
viewing + milestone gating — flagged before touching either, owner
confirmed keeping both. TSK-020 shipped next (commit 08ac008, PR #79): the Tools grid is
relocated (not deleted) off More's root into its own 5th drill-in,
keeping Follow-ups/Portfolio/Research/Insights fully reachable. TSK-021
shipped last (commit 504e177, PR #79): a fresh guest/account no longer
sees the persona-onboarding modal at signup and no longer gets a preset
Services catalog auto-seeded (`businessType` now defaults straight to
`custom`, whose `seedServices` was already empty) — the picker survives
only for the dedicated "Try a demo" flow, which still needs it to choose
which persona-flavored demo dataset to seed. The persona concept itself
(businessType/unit-word labeling/i18n variants/client trackers/the
Settings-side switcher) is untouched, exactly as scoped to onboarding-only
removal. That closed out every numbered backlog item except the one the
owner had told the squad to hold: TSK-023's Fee/Tip/Expense/Sessions money
fields. Also: the new `test` CI gate (deploy-vercel.yml, added this arc)
had its first real production run and worked exactly as designed — see
the correction below.

After that, the owner raised a new item straight in chat (not a screenshot
popup) and it's logged/shipped as **TSK-024**: package-usage deduction
("17/20 left") lived on the client with no link back to which catalog
Service it was actually for — a client holding two different services'
packages at once could have the wrong one silently applied to a Task-flow
booking. The owner's own mental model was concrete and unambiguous ("create
a service with 10x usage at 5,500 THB — booking/delivering it should deduct
from that"), so this was built directly rather than researched/triaged
first.

Finally, the owner asked directly for the squad's own recommendation on
TSK-023's still-held money fields ("give me direction"). Research turned
up that `job.netAmount` was barely load-bearing (only tax.js's cash-income
bucket actually read the stored field — Home/the goal card/CSV export
already recomputed `amount+tip-expense` live), so the blast radius was
much smaller than the original researcher_notes assumed. Recommendation
given and built on "build": Fee/Tip/Expense/Sessions are now gone from
the Add-session form entirely, and revenue gets attributed at the moment
it's actually known — from the invoice (once paid), from the package's
purchase price (apportioned at delivery), or from a new one-field Cash
gate — rather than typed in at job-creation time. That closes out TSK-023
completely, and with it the entire backlog: nothing owner-facing remains
open. See the Recent Commits entry below for the full implementation.

**Correction to this file's own prior record**: the 2026-07-22 entry below
called check-scheduling.js's occasional "64 passed, 1 failed" a pre-
existing flake, "verified via git stash." That verification was against
the wrong baseline (pre-TSK-016 code, where the assertion was still
correct) — it was never actually a flake. It was a real, deterministic
regression: TSK-016 changed the inline gate to create a booking, but one
assertion in check-scheduling.js still expected the old TSK-012 "no
booking" behavior. The new CI test gate caught it for real on PR #67's
merge (workflow run 30144894603) and correctly kept deploy-production from
running — fixed in PR #68 (commit 17f9884), confirmed deterministic (3/3
local reproductions before the fix, 3/3 clean after), re-verified in real
CI on the next push (workflow run 30146466910, test job green). Lesson:
"the same summary line appeared before" is not the same as "the same
assertion failed" — always read the actual FAIL: message, not just the
pass/fail count.

## Recent Commits / PRs
* PR #96 (open, branch `engineer-squad/tsk-035-auth-login-tests`, based on
  `origin/main`): **TSK-035** -- api/auth-login.js refactored to the
  `createAuthLoginHandler({getSql, verifyPassword, signSession})`
  DI-factory shape (same as TSK-033/034's precedent), unblocking real
  handler-level testing; new tests/test-auth-login.mjs, 33 assertions
  covering method/secret/body gating, the three-way anti-enumeration
  response-identity guarantee, successful-login response shape (no
  password material leakage), username normalization, DB-failure mapping
  to 502, and the rate-limit-wiring proof (11th request from one IP ->
  429). Full battery clean: 17 Node + 34 Playwright suites, 0 failures.
* PR #92 (merged, branch `engineer-squad/tsk-033-stripe-webhook-tests`, based on
  the not-yet-merged `researcher-squad/epoch3-launch-polish-sweep` /
  PR #91): **TSK-033** -- api/stripe-webhook.js refactored to the
  `createStripeWebhookHandler({getSql, verifyWebhook, getStripeClient})`
  DI-factory shape already established by api/booking-requests.js /
  api/cron-reminders.js, unblocking real handler-level testing;
  tests/test-stripe-webhook.mjs grew from 4 to 38 assertions covering
  `mapStripeStatus`'s full table, the out-of-order-delivery reconciliation
  path, both DB-write branches, and the DB-write-failure fallback. Full
  battery clean: 15 Node + 34 Playwright suites, 0 failures.
* PR #94 (merged, 2026-08-26): **TSK-034** -- api/billing-checkout.js /
  api/billing-portal.js refactored to the createXHandler({getSql,
  getStripeClient}) injection shape (matching TSK-033's PR #92); new
  tests/test-billing.mjs, 33/33 passing. Full battery clean: 17 Node + 34
  Playwright suites, 0 failures. See Current Focus above for the full
  writeup. Subscribed for CI/review activity.
* PR #64 (merged): TSK-014 stage migration (6→4 stages) + LINE Login deferral.
* PR #65 (merged): design_handoff_sidekick_refinements batch — TSK-012/013/011,
  TSK-002/007, TSK-009, TSK-008, TSK-010. Playwright 840/840 across 33 suites
  at final ship time.
* PR #66 (merged): **TSK-016** (real Calendar booking on the inline gate) +
  **TSK-017** (optional lost-reason chips on the Cancel gate).
* PR #67 (merged): staging-gate infrastructure — `test` job in
  deploy-vercel.yml gating `deploy-production` (`needs: test`, runs the
  full tests/run-all.sh battery against the actual merge commit), plus a
  CodeQL-flagged explicit `permissions: contents: read` fix. Owner also
  added a required-reviewer rule on the `production` GitHub Environment
  (manual approval, outside this repo's own files).
* PR #68 (merged): fixed check-scheduling.js's stale TSK-012-era assertion
  — see correction above. The first real thing the new CI gate caught.
* PR #69 (merged): logged TSK-018 (Timeline/subtask rework, NEEDS_OWNER_REVIEW
  — bookkeeping only, no app code).
* PR #70 (merged, commit 75fe3e2): **TSK-019** — `computeClientsNeedingAttention()`
  only ever considered `activePackageFor()` (hard-filtered to `remaining >
  0`), so a package that jumps straight from N remaining to exactly 0 in
  one delivery (normal for a variable-quantity business — e.g. a laundry
  piece-count package, the exact case the owner's demo video walked
  through: 24 then 26 = 50) got zero Home renewal nudge, ever — the
  existing "almost done" threshold (<=2, still >0) never got a chance to
  fire first. Added a third attention kind (`depleted`), ranked ahead of
  `almost` in Home's sort priority, reusing the existing marigold-pill row
  rendering and `offerRenewalForClient()` action — no new UI. New suite
  section: check-home-today-v2.js §4b, 5 assertions (48/48 total, 0
  console errors), seeds the exact 24-then-26 video scenario. Full battery
  re-confirmed clean before merge (check-scheduling.js 65/65, all else
  green).
* PR #72 (merged, commit cf3eb73): **TSK-018 part (1)** — `renderPipelineTimeline()`
  (app/app.js:4645) was omitting any job whose only upcoming date lives in
  `job.due` (the case for most jobs since TSK-011/012/013 moved the
  stage-gate's date off subTasks entirely) unless it also had a dated
  `job.subTasks` entry. Now builds each row's points from BOTH sources: a
  `job.due` backed by a real linked booking (`job.dueBookingCuid`, TSK-016)
  renders as a dot (same visual as an 'exact' subtask step); one without a
  linked booking renders as a bar (same as a 'by' step) — no new mark type,
  a job can show points from both sources unmerged. `tl_empty` copy
  (EN+TH) updated to mention booking a follow-up date, not just dated
  sub-tasks. Verified check-scheduling.js's existing §12-16 Timeline
  assertions are unaffected: traced every fixture job's `job.due` lifecycle
  through the file and confirmed none is still set by the time §12-16 run
  (jobB's is the only one ever set, at §6, and §7's Skip clears it back to
  null before §12) — no assertion edits needed there. Added new §6a (mid-
  flow, right after §6 sets jobB.due via the gate's "Book & move" and before
  §7 clears it): switches to timeline view, confirms jobB's row shows
  exactly one dot and zero bars from job.due alone (zero subTasks at that
  point), switches back to board. Full local battery green (`npm ci` +
  `bash tests/run-all.sh` against the pre-installed sandbox Chromium):
  check-scheduling.js 66/66, all 33 Playwright suites + 15 Node harnesses
  0 failures. TSK-018 part (2) untouched, still blocked on the owner.
* PR #73 (merged): logged TSK-018 part (1)'s real PR/commit numbers into
  this file and backlog-inbox.md (PR #72's own record still said "pending"
  — bookkeeping only, no app code).
* PR #74 (merged, commit 6a3b508): **deploy pipeline restructure** — owner asked for
  merge-to-main to auto-deploy to staging, with production deploy gated by
  chat approval instead of the GitHub-side required-reviewer click. New
  `deploy-staging` job (deploy-vercel.yml) runs on every push to main once
  `test` passes — ungated, deploys to Vercel's preview alias (no new Vercel
  project; owner chose reusing the existing preview environment over a
  dedicated staging project). `deploy-production`'s trigger changed from
  `push || workflow_dispatch` to `workflow_dispatch`-only, so it no longer
  fires on a bare merge — it's dispatched on demand (the chat agent calls
  `actions_run_trigger` / `run_workflow` with `ref: main` when the owner
  says "deploy"/"approve" in chat), still `needs: test` so the promoted
  commit gets a fresh full-battery run at dispatch time, not just whatever
  passed at merge time. YAML-validated (`python3 -c "import yaml; ..."`,
  no test-suite impact — workflow-file-only change). See the Cross-Squad
  Requests entry below for the one manual step this still needs from the
  owner (no tool can do it).
* PR #75 (see below): logged **TSK-020** (remove the More screen's
  "Tools" grid) and **TSK-021** (remove the persona onboarding picker +
  preset-service seeding) from an owner screenshot + two-line ask —
  bookkeeping only, no app code. Both marked NEEDS_OWNER_REVIEW rather than
  READY_FOR_PM: TSK-020's grid is the ONLY nav entry point to Follow-ups/
  Portfolio/Research/Insights today (confirmed via full-repo grep — no other
  `switchScreen()` call reaches them), so deleting it as literally asked
  orphans four working modules rather than removing a feature; TSK-021's
  "persona" is a cross-cutting concept (i18n variants, client trackers, demo
  data, unit-word labeling) touched in 30 of ~33 Playwright suites' own
  setup flow, not an isolated onboarding screen. Both need the owner to pick
  a scope (see backlog-inbox.md's researcher_notes for each) before
  Engineer-Squad estimates or starts either.
* PR #75 (open): logged **TSK-022** (add a
  Service/Product shortcut to the bottom nav — currently 2 taps deep at
  More ▸ Business & documents ▸ Services) and **TSK-023** (strip the
  Add-session job modal down to Date/Client/Service/Notes) from a second
  owner screenshot + list. TSK-023 is the highest-risk item logged this
  cycle: it bundles two very different asks — dropping the Quick log/Full
  details toggle + the 4 drill-in sections (Options compared/Items/Plan &
  payments/Time tracking, each a self-contained feature like TSK-020) is
  one thing, but removing Fee/Tip/Expense/Sessions guts `job.netAmount`
  (`amount + tip - expense`, app.js:4370/2089/4423) — the single revenue
  figure Insights, tax rollup, package math, and Home's earned/net stats
  all read. Do NOT start building the money-field removal until the owner
  says what should compute revenue instead (e.g. moving it onto
  invoices/quotes) — picking wrong there means redoing real work, not just
  UI. TSK-022 is much smaller but still needs a mechanism choice (6th nav
  tab vs. replace an existing one vs. extend the FAB into a quick-add
  menu) — see backlog-inbox.md's researcher_notes for both.
* PR #75 (merged, commit 3ff5e45): **TSK-022** built as the recommended 6th
  persistent nav tab (`#nav-services`, links to the existing Services/
  Products catalog screen). Landed alongside two owner-driven follow-ups
  in the same PR: **Task flow + Calendar merge** (the `#s-book` screen is
  retired — Calendar is now a third view mode on the pipeline screen's
  existing Board/Timeline segmented toggle from TSK-018, nets the nav bar
  back to a clean 5 tabs) and a **Thai tagline update** ("รับจอง, รับงาน,
  รับเงิน"). Found + fixed two real bugs surfaced by the merge: (1)
  `window.__plView`'s boot restore only ever checked for `'timeline'`,
  silently dropping a saved `'calendar'` preference back to `'board'` on
  reload; (2) `renderWeekView()`/`renderMonthView()` in bookings.js did
  async work against a captured `#book-body` element before touching the
  DOM — now that the container can be wholesale-replaced by a sibling
  Board/Timeline render mid-await (impossible before, when it lived in its
  own static screen), a stale continuation could throw wiring listeners
  onto elements no longer in the live document. Both render functions now
  re-check the container is still current before proceeding. `switchScreen
  ('book')` kept as a working alias (same pattern as the existing `'tax'`
  alias) so every existing caller (Home's next-booking row, 6 test files)
  needed zero changes beyond one `#s-book`-specific assertion in
  check-home-today-v2.js and one explicit view-mode reset in
  check-scheduling.js (mirroring its own pre-existing §19 pattern for
  `'timeline'`). Full battery clean: 15 Node harnesses + 33 Playwright
  suites, 0 failures, check-scheduling.js 66/66, 0 console errors.
* PR #77 (merged, commit abfae4d): **TSK-018 part 2** — job.subTasks[]'s
  standalone "+ Step with date" list is removed per the owner's direct
  answer to the design question PR #72's writeup left open. Kept two
  non-obvious dependencies alive, both flagged to and confirmed by the
  owner before building: Options compared's 📅 Book viewing button (still
  reuses openApptModal()/saveApptModal(), simplified to drop the now-dead
  edit/repeat modes), and milestone-gating (gatingSubTaskId's "Locked"
  chip), which gained a minimal inline one-off gate creator in the
  "+ Add milestone" form plus a mark-done affordance on the chip itself
  since the old list's toggle-on-click is gone. 4 test files updated
  (check-blockers-p1.js/check-job-modal-v2.js/check-merges.js/
  check-scheduling.js) — obsolete UI-specific assertions deleted outright,
  no successor for a freeform undated checklist item or step repeat.
  Full battery clean: 15 Node + 33 Playwright suites, 0 failures.
* PR #78 (merged, commit a6db194): **TSK-023 part 1** (Fee/Tip/Expense/
  Sessions held at the time) — removed the Quick log/Full details toggle
  (`job-mode-seg`/`setJobModalMode()`/`applyJobModalMode()`, every field
  always shown now), "Items on this engagement" (`addJobItem`/
  `removeJobItem` had no other entry point — whole feature retired, not
  just UI, existing jobs' items still flow into quotes/invoices as before),
  and "Time tracking" + Focus mode (`startJobTimer` had no other entry
  point — same). Found mid-build that the owner's original ask also named
  "Options compared"/"Plan & payments" for removal — those now host TSK-018
  part 2's Book viewing + milestone gating, so removing them would have
  undone that work; flagged before touching either, owner confirmed
  keeping both. `invoices.js`'s dead `'unbilled'` linkMeta branch and
  orphaned Focus-mode CSS removed alongside their only callers.
  check-job-modal-v2.js (the old TSK-008 toggle suite) rewritten for the
  new always-visible behavior; check-items.js's UI-driven sections switched
  to direct DB seeding (its downstream sections were already
  seed-independent and unaffected); check-merges.js/check-options-lost.js
  needed only their `setJobModalMode('full')` setup calls dropped. Full
  battery clean: 15 Node + 33 Playwright suites, 0 failures.
* PR #79 (commit 08ac008): **TSK-020** — the 4-tile Tools grid
  (Follow-ups/Portfolio/Research/Insights) is gone from More's root,
  relocated (not deleted, per the researcher_notes' option (b)) one level
  deeper as a single "Tools" drill-in row into a new `#s-more-tools`
  screen hosting the same 4 tiles unchanged — all 4 screens/modules stay
  fully reachable, no orphaned code. `switchScreen()`'s render triggers for
  the Follow-ups badge and Insights-tile visibility moved from `'more'` to
  `'more-tools'`, matching the existing pattern for the other 4 drill-ins.
  check-more-settings-v2.js updated with a `goTools()` helper and new
  open/back-button coverage matching the other 4 sub-pages. Full battery
  clean: 15 Node + 33 Playwright suites, 0 failures.
* PR #79 (commit 504e177): **TSK-021** — built option (a) from
  researcher_notes (onboarding-only removal), the smaller of the two scopes
  the owner was given to choose between. `enterApp()` now auto-selects
  `businessType='custom'` via the existing `choosePersonaOnboard('custom')`
  instead of blocking boot on `#modal-persona-onboard`;
  `BUSINESS_TYPES.custom.seedServices` was already `[]`, so a new account
  starts with zero preset services with no seeding-logic change needed. The
  picker survives only for `login.html?demo=1` ("Try a demo"), which still
  needs it to pick a persona-flavored demo dataset. Traced persona-
  dependence across all 33 Playwright suites before touching anything: only
  5 had a real dependency on the picker, 4 of those already resolved
  cleanly (3 via the demo path, 1 via direct IndexedDB seeding);
  check-onboarding.js (tested the removed flow directly) and
  check-onboarding2.js rewritten for the new default-to-custom behavior;
  the other ~28 suites' now-dead picker-click setup step stripped by a
  scripted mechanical pass. Full battery clean: 15 Node + 33 Playwright
  suites, 0 failures. This was the last actionable backlog item — every
  TSK is now shipped except the money-field half of TSK-023, held on
  purpose pending an owner answer (see Cross-Squad Requests).
* PR #80 (merged, commit 15f571c): **TSK-024** — raised directly in chat, not a
  screenshot popup. `packages` gained a `serviceId` field (previously
  disconnected from the catalog Service entirely — selling a package meant
  a manual "+Add package" step re-typing the same usageQty/rate numbers).
  `activePackageFor(clientId, serviceId)` and `refreshJobPackageRow()` are
  now scoped by (client, service), not just client — the real bug this
  surfaced: a client holding two different services' packages at once
  could have the wrong one silently applied to a Task-flow booking, since
  the old lookup just picked "most recent package with any balance."
  Booking a package-type service (`usageQty > 1`) for a client with no
  active package for that exact service now auto-creates one from the
  service's own usageQty/rate at save time (`saveJob()`) — selling a
  package needs zero manual step beyond creating the Service once. The
  Client detail package section and the Clients list badge both now tag
  each package with its linked service's name (`packageDisplayName()`),
  and a client can hold multiple independently-tracked packages (one per
  service) at once instead of the old single-"most recent" summary hiding
  the rest. Backend wired to match: `service_id`/`service_cuid` columns
  (`sql/schema-core.sql`, `lib/schemaSql.js` regenerated), `api/packages.js`'s
  FIELDS whitelist, and `dataClient.js`'s packages mirror, all following
  the existing `client_id`/`client_cuid` ref-cuid pattern exactly. New
  suite `check-service-packages.js` (25 assertions) covers auto-create,
  per-service isolation, a non-package service never offering/creating
  one, and the new tagging. Full battery clean: 15 Node + 34 Playwright
  suites, 0 failures.
* PR #81 (merged, commit 1de66bc): quick owner-flagged fix, not a numbered
  backlog item — `.gate-date` (the date pill in the "Session delivered ✓ /
  Book next session now" gate card) rendered noticeably larger/heavier
  than the buttons next to it. Tightened padding/font-size/weight, added
  an explicit line-height. Pure CSS, no test impact.
* PR pending (commit 79d0f1d): **TSK-023 part 2** — the previously-held
  money-field half. Research first (owner asked for a direct
  recommendation): `job.netAmount` turned out to be barely load-bearing
  (only `tax.js`'s cash-income bucket read the stored field; Home/the goal
  card/CSV export already recomputed `amount+tip-expense` live), so the
  blast radius was much smaller than the original researcher_notes
  assumed — no single choke-point redesign needed. Fee/Tip/Expense/
  Sessions are now gone from the Add-session form entirely; revenue gets
  attributed at the moment it's actually known, from whichever of 3
  sources applies: `markJobPaid()` now syncs `amount`/`netAmount` from the
  invoice's own `youReceive` the moment an invoice is marked paid (via the
  existing `onInvoiceMarkedPaid` reverse hook, covering all 3 of
  invoices.js's paid-transition paths for free); new `applyPackageRevenue()`
  apportions a package-linked job's share of the package's one-time
  purchase price (`count/totalSessions * price`) at delivery time, wired
  into `logPackageSession()`/`confirmPackageDelivery()`/
  `saveFastPathDelivery()` — this also fixes a real pre-existing gap
  (`package.price` was write-only before this pass, so package-delivered
  work silently showed ฿0 revenue everywhere); the Cash job shortcut lost
  its only input, so `cashJobPath()` now opens a one-field Cash gate
  (`resolveGateCash()`) instead of acting immediately, and the no-invoice
  "Mark paid" button routes through the same gate (`markPaidNoInvoice()`)
  since it has nowhere else money could come from. `saveJob()` now
  defaults amount/tip/expense/count/netAmount to 0 on a new job and
  explicitly preserves them on an ordinary detail edit, matching the
  established subTasks/milestones preserve-on-edit pattern.
  check-job-modal-v2.js/check-options-lost.js/check-scheduling.js updated
  for the removed fields and the new Cash-gate flow;
  check-service-packages.js gained apportionment coverage. Full battery
  clean: 15 Node + 34 Playwright suites, 0 failures. This was the last
  open item in the whole backlog — nothing owner-facing remains.

## Blockers & QA Failures
(none — no task hit the 3-strike breaker across the whole arc; see the
check-scheduling.js correction above for the one real regression this arc
produced, caught by CI rather than a strike)

## Cross-Squad Requests
* **Resolved**: the `production` GitHub Environment's required-reviewer
  rule was flagged here as needing manual removal (no tool in this
  session's toolbox can read/write environment protection rules). The
  first chat-triggered `deploy-production` dispatch after PR #74 merged
  (workflow run 30155369597, commit ccc2cee) ran straight through with no
  approval block — `test` passed at 11:03:12, `deploy-production` started
  immediately after and completed successfully at 11:04:14, actually
  live on production. Whatever the owner did (removed the rule, or it
  never actually applied the way the original PR #67 note assumed) it
  worked — chat approval is confirmed to be the effective production gate
  now. No outstanding owner action here.
* Note (kept for history): PR #67's original
  production deploy pipeline had `deploy-production` firing on every push
  to main, gated by that same required-reviewer click. As of PR #74
  (merged), `deploy-production` no longer fires on push at all — only on
  a chat-triggered `workflow_dispatch`, confirmed working end-to-end (see
  Resolved note above).
* Owner: TSK-018's open design question ("does anything replace freeform
  mid-engagement reminders?") was answered directly — "I don't actually use
  it that way — just remove it" — and shipped in PR #77. No, nothing
  replaces it; the owner confirmed that's fine.
* Resolved: TSK-023's Fee/Tip/Expense/Sessions money-field question — the
  owner asked for the squad's own recommendation directly, it was given,
  and built on "build" (see the TSK-023 part 2 entry above). No open
  question remains anywhere in the backlog.
* Owner (lower priority, noted not urgent): TSK-002's rebuild dropped
  Manage's Invoices/Docs rows from More entirely — verified as a legitimate
  no-op (Home's quick-action row already reaches both, predates this task).

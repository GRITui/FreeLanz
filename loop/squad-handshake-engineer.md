<squad_metadata>
  <squad_name>Engineer-Squad</squad_name>
  <current_status>BLOCKED_ON_OWNER</current_status>
  <active_task_id>TSK-023-money-fields</active_task_id>
  <sprint_completion_percentage>100</sprint_completion_percentage>
</squad_metadata>

## Current Focus
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
removal. That closes out every backlog item except the one the owner
explicitly told the squad to hold: TSK-023's Fee/Tip/Expense/Sessions
money fields, which need an answer on what replaces `job.netAmount` as
the revenue computation before any building starts — see Cross-Squad
Requests below. Also: the new `test` CI gate (deploy-vercel.yml, added
this arc) had its first real production run and worked exactly as
designed — see the correction below.

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
* PR #78 (open, commit a6db194): **TSK-023** (partial — Fee/Tip/Expense/
  Sessions held) — removed the Quick log/Full details toggle
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
* Owner: the one remaining open question in the whole backlog — TSK-023's
  Fee/Tip/Expense/Sessions money fields are still held (see PR #78's entry
  above). Engineer-Squad will not touch `job.netAmount` or its readers
  (Insights, tax rollup, package math, Home's earned/net stats) until the
  owner says what should compute revenue instead.
* Owner (lower priority, noted not urgent): TSK-002's rebuild dropped
  Manage's Invoices/Docs rows from More entirely — verified as a legitimate
  no-op (Home's quick-action row already reaches both, predates this task).

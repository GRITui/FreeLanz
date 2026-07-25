<squad_metadata>
  <squad_name>Engineer-Squad</squad_name>
  <current_status>IDLE</current_status>
  <active_task_id>none</active_task_id>
  <sprint_completion_percentage>100</sprint_completion_percentage>
</squad_metadata>

## Current Focus
TSK-018 part (1) shipped (commit cf3eb73, PR #72 merged) — renderPipelineTimeline()
now also sources dated points from job.due (+ its linked booking), not just
job.subTasks. The deploy pipeline restructure also shipped (PR #74 merged)
— merge-to-main auto-deploys to staging, production is chat-approval-gated
(one manual owner step still open — see Cross-Squad Requests). Backlog is
now five items deep in NEEDS_OWNER_REVIEW, all blocked on the owner: TSK-018
part (2) (remove job.subTasks), TSK-020 (remove the Tools grid — orphans 4
screens as literally asked), TSK-021 (remove persona onboarding — persona is
cross-cutting, not isolated), TSK-022 (nav-bar Service/Product shortcut —
needs a mechanism choice), TSK-023 (strip the job modal to Date/Client/
Service/Notes — the highest-risk one, guts the app's core revenue field
unless the owner specifies a replacement). No READY_FOR_PM items — squad
stays IDLE until at least one of these gets an owner answer. Also: the new
`test` CI gate (deploy-vercel.yml, added this arc) had its first real
production run and worked exactly as
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
* PR pending (this push): logged **TSK-020** (remove the More screen's
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
* PR pending (this push, same as above): logged **TSK-022** (add a
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
  Engineer-Squad estimates or starts either.

## Blockers & QA Failures
(none — no task hit the 3-strike breaker across the whole arc; see the
check-scheduling.js correction above for the one real regression this arc
produced, caught by CI rather than a strike)

## Cross-Squad Requests
* **Owner, action needed now**: the `production` GitHub Environment's
  required-reviewer rule (Settings → Environments → production →
  deployment protection rules) needs to be removed by hand — no tool in
  this session's toolbox can read or write environment protection rules.
  Until it's removed, ANY job referencing `environment: production` still
  blocks on that manual click regardless of trigger type, so a chat-
  approved `deploy-production` dispatch will still sit waiting on the same
  GitHub-side approval it was supposed to replace. Once removed, chat
  approval ("deploy" / "approve" in the chat that's driving this repo) is
  the only production gate.
* Note (superseded by the above, kept for history): PR #67's original
  production deploy pipeline had `deploy-production` firing on every push
  to main, gated by that same required-reviewer click. As of the pending
  deploy-pipeline-restructure PR, `deploy-production` no longer fires on
  push at all — only on a chat-triggered `workflow_dispatch`. The old
  advice to "approve whichever run is current, not an older queued one"
  (concurrency group `cancel-in-progress`) still applies if the reviewer
  rule is left in place, but no longer needs to be a routine per-merge
  action once it's removed.
* Owner: TSK-018 (loop/backlog-inbox.md) still needs an answer to its open
  design question — does anything replace "+ Step with date" for freeform
  mid-engagement reminders once/if job.subTasks is removed?
* Owner (lower priority, noted not urgent): TSK-002's rebuild dropped
  Manage's Invoices/Docs rows from More entirely — verified as a legitimate
  no-op (Home's quick-action row already reaches both, predates this task).

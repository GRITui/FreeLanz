<squad_metadata>
  <squad_name>Engineer-Squad</squad_name>
  <current_status>IDLE</current_status>
  <active_task_id>none</active_task_id>
  <sprint_completion_percentage>100</sprint_completion_percentage>
</squad_metadata>

## Current Focus
TSK-018 part (1) shipped (commit cf3eb73, PR #72 merged) — renderPipelineTimeline()
now also sources dated points from job.due (+ its linked booking), not just
job.subTasks. TSK-018 part (2) — removing job.subTasks entirely — remains
NEEDS_OWNER_REVIEW, unstarted, blocked on the owner's answer to the open
design question (see Cross-Squad Requests). No other READY_FOR_PM items in
the backlog — squad goes IDLE. Also: the new `test` CI gate (deploy-vercel.yml,
added this arc) had its first real production run and worked exactly as
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

## Blockers & QA Failures
(none — no task hit the 3-strike breaker across the whole arc; see the
check-scheduling.js correction above for the one real regression this arc
produced, caught by CI rather than a strike)

## Cross-Squad Requests
* Owner: PR #67's new production deploy pipeline needs the `production`
  environment's required-reviewer approval clicked (Actions tab → the
  latest deploy-vercel.yml run → "Review deployments"). Each new push to
  main queues its own approval request; an older still-queued one
  typically gets superseded (concurrency group `cancel-in-progress`) once
  a newer push's `test` job passes — approve whichever run is current once
  its `test` job finishes, not an older one still sitting queued.
* Owner: TSK-018 (loop/backlog-inbox.md) still needs an answer to its open
  design question — does anything replace "+ Step with date" for freeform
  mid-engagement reminders once/if job.subTasks is removed?
* Owner (lower priority, noted not urgent): TSK-002's rebuild dropped
  Manage's Invoices/Docs rows from More entirely — verified as a legitimate
  no-op (Home's quick-action row already reaches both, predates this task).

# Standup Log — Sidekickz sprint loop

Append-only ledger. One entry per sprint standup, written by the
Owner-Assistant-Agent (acting as Product Owner / PM) before each sprint's
squads are dispatched. Sprint cadence: every 6 hours. See
`loop/squad-worker-prompts.md` for the prompts each dispatch uses and
`CLAUDE.md` for priority labels (P0-P4).

---

## Standup #1 — 2026-08-26

**Backlog (`loop/backlog-inbox.md`)**: 28 task_items total. 22 SHIPPED
(TSK-002, 007-014, 016-028). 6 non-shipped are all superseded/umbrella
entries with no standalone action left (TSK-001 initial triage superseded
by TSK-002-006; TSK-003-006 superseded by their refined TSK-008-011;
TSK-015 is the owner's umbrella approval, fully covered by the shipped
items it lists). Of the 5 items that were logged `NEEDS_OWNER_REVIEW`
(TSK-018, 020-023), all 5 had their open questions answered by the owner
directly and shipped (see `squad-handshake-engineer.md` Cross-Squad
Requests history). **Net: zero open, actionable backlog items.**

**Open PRs**: none.

**Squad status** (all `IDLE`, 100% sprint completion, 0 strikes/blockers
across the board per each squad's handshake file):
- Researcher-Squad: idle since epoch 1 triage; last note says the
  owner-facing backlog is fully triaged.
- Engineer-Squad: idle; own words — "this was the last open item in the
  whole backlog — nothing owner-facing remains."
- QA-Tester-Squad: idle; last verified TSK-002/008/009, nothing queued.
- UX-UI-Designer-Squad: idle; last request was for Researcher-Squad to
  flag the next UI/UX-debt candidate — not yet done.

**Cross-squad requests addressed to Owner**: none outstanding (all prior
ones resolved per the Cross-Squad Requests sections above).

**PM decision — sprint 1 priority**: Backlog is empty, so per
`squad-worker-prompts.md`'s standing instruction ("if the owner-facing
backlog is fully shipped/closed... sweep for the next batch"), this
sprint dispatches **Researcher-Squad only**, sweeping the codebase fresh
for the next batch of SSS-tier candidates (correctness/security bugs,
real test-coverage gaps vs. `tests/run-all.sh`, fragile-by-design areas,
UX/ergonomics/discoverability debt) ahead of launch. Engineer/QA/UX-UI
stay idle this cycle — nothing for them to act on until Researcher-Squad
produces new `READY_FOR_PM` items. Next standup (sprint 2, ~6h out) will
dispatch Engineer-Squad (and UX-UI-Designer-Squad if any candidate needs
a design direction) against whatever Researcher-Squad lands.

**Post-standup-1 activity (ad-hoc, between scheduled sprints)**: Researcher-
Squad delivered 18 new candidates same-cycle (PR #91, TSK-029..046, merged).
Stood up a standing PR Advisor role (Fable model) to review/merge squad PRs
so routine merges don't wait on the human owner — reviewed and merged both
PR #90 and PR #91, catching and getting fixed two real issues in #90 first
(wrong shipped/non-shipped counts, missing P2 label). Learned cross-session
`SendMessage` doesn't reach cloud sessions spawned via `create_session`, so
future cycles spawn one fresh Advisor session per cycle with that cycle's
PR list, rather than messaging a persistent one. An ad-hoc Engineer-Squad
session was also dispatched against the new backlog (rate-limit status was
"allowed_warning", judged acceptable for one small item) and opened PR #92
(TSK-033, stripe-webhook handler test coverage) — open, not yet reviewed.

---

## Standup #2 — 2026-08-26 (~06:39 UTC)

**Backlog (`loop/backlog-inbox.md`)**: 46 task_items total now (TSK-001..046).
22 shipped as of standup 1; **TSK-033 now also effectively shipped** (PR #92
open, engineer-squad/tsk-033-stripe-webhook-tests branch, not yet merged).
The 18 items from epoch 3 (TSK-029..046) are almost all still
`READY_FOR_PM` and actionable — none need an owner decision (Researcher-
Squad's own epoch-3 note: "unlike the TSK-018/020/021/022/023 batch two
epochs ago"). Priority mix per `researcher_notes`: 3 HIGH untouched
(TSK-029 perf, TSK-030/031 a11y/reliability), TSK-032 (HIGH, i18n leak onto
a real Thai invoice) untouched, TSK-034/035 (HIGH, billing/auth test
coverage — same class as TSK-033) untouched, plus 10 MEDIUM/LOW items
(TSK-036-046 minus 033) untouched.

**Open PRs**: #92 (TSK-033, Engineer-Squad ad-hoc, CI not yet checked this
standup — see dispatch below).

**Squad status**: Researcher-Squad idle (100%, epoch 3 delivered and
merged). Engineer-Squad's own handshake file tail doesn't yet reflect the
ad-hoc TSK-033 session's update (PR #92 exists on GitHub regardless — will
confirm the handshake file is current once PR #92 is reviewed). QA-Tester
and UX-UI-Designer both idle, nothing UI-shaped in this batch for UX-UI.

**Cross-squad requests addressed to Owner**: none new. Researcher-Squad's
epoch-3 handshake carries one non-blocking sub-question for Engineer-Squad
about TSK-036's grandfathering behavior — flag to the owner only if it
actually comes up mid-build, per the squad's own note.

**Rate-limit check**: `allowed_warning` (7-day window) — same status as
standup 1, not worse, so dispatch proceeds but stays conservative (one
Engineer-Squad item, one QA pass, one Advisor pass this cycle — no
Researcher/UX-UI spawn needed since the backlog is well-stocked and has no
UI-shaped item).

**PM decision — sprint 2 priority**: Dispatch **Engineer-Squad** for the
next HIGH item after TSK-033 — TSK-034 (billing-checkout.js/billing-
portal.js test coverage), same class of zero-covered money endpoint,
per Researcher-Squad's own recommended sequencing. Dispatch **QA-Tester-
Squad** to verify PR #92 (TSK-033) against its acceptance criteria while
it's in review. Dispatch one **PR Advisor** session at the end of this
cycle's work to review/merge whatever PRs are open (#92 plus anything
Engineer/QA open this cycle). Skip Researcher-Squad and UX-UI-Designer-
Squad this cycle — backlog has 17 untouched actionable items, no
UI-direction-shaped candidate among them.

**Post-standup-2 activity (ad-hoc, before the trigger's next scheduled
fire)**: Resolved a merge conflict on PR #92 by hand (main had moved
forward past #91/#93 merging while #92's branch was still based on #91's
pre-merge state) and verified the merged head locally since
`deploy-vercel.yml`'s `pull_request` trigger only fires on `opened`, so a
synchronize push gets no automatic battery run — full battery green (15
Node + 34 Playwright, 0 failed). QA-Tester-Squad landed its own commit on
PR #92 verifying TSK-033: PASS on all criteria (genuine handler-level
coverage, not filename-only; covers signature handling + the money-
affecting branches), no blockers. Engineer-Squad landed **PR #94**
(TSK-034 — billing-checkout/billing-portal test coverage, 33/33 new
assertions, full battery green). **The sprint-2 PR Advisor
session failed**: it was spawned on the `claude-fable-5` model, which
requires separate usage credits this account doesn't currently have —
session ended with `status_category: failed`, `"Fable 5 requires usage
credits. Switch to another model to continue."` before reviewing anything.
Net effect: PR #92 (TSK-033), #93 (standup-2 log), and #94 (TSK-034) all
sat open/unreviewed from ~06:41 to this standup. **Fix applied this
cycle**: future PR Advisor spawns use the default/inherited model (Sonnet)
instead of pinning `claude-fable-5`, until Fable usage credits are
confirmed available.

---

## Standup #3 — 2026-08-26 (~09:35 UTC, ad-hoc — user asked to run a new sprint)

**Backlog (`loop/backlog-inbox.md`)**: still 46 task_items. 22 shipped as
of standup 1, TSK-033 (PR #92) and TSK-034 (PR #94) both built and green
but **unmerged** due to the Advisor failure above. 16 items remain fully
untouched: TSK-029/030/031/032 (HIGH), TSK-035 (HIGH — auth-login.js test
coverage, last of the money/auth trio), TSK-036-046 minus 033/034
(MEDIUM/LOW).

**Open PRs**: #92 (TSK-033, clean, verified twice), #93 (standup-2 log,
clean), #94 (TSK-034, clean, not yet independently QA-verified).

**Squad status**: Researcher-Squad idle (100%). Engineer-Squad active this
cycle (TSK-033 then TSK-034, both shipped as PRs). QA-Tester-Squad landed
one verification (TSK-033/PR #92, PASS) and is otherwise idle. UX-UI-
Designer-Squad idle, still nothing UI-shaped in the backlog.

**Cross-squad requests addressed to Owner**: none new beyond the
non-blocking TSK-036 sub-question already logged at standup 2.

**Rate-limit check**: `allowed_warning` (7-day window, main session) —
unchanged, not worse. Separately, the Fable model's own credit pool reads
`rejected` — noted above, worked around by not pinning that model for the
Advisor role going forward.

**PM decision — sprint 3 priority**: Clearing the review backlog is now
higher priority than starting new build work — three green PRs sitting
unreviewed for ~3 hours defeats the point of the Advisor role. Dispatch
one **PR Advisor** session (Sonnet model this time) to review and merge
#92, #93, and #94 in one pass. Dispatch **Engineer-Squad** for **TSK-035**
(auth-login.js test coverage — completes the stripe/billing/auth
money-and-auth test-coverage trio Researcher-Squad flagged as this
epoch's highest-leverage sequencing). Skip QA-Squad, Researcher-Squad, and
UX-UI-Designer-Squad this cycle — QA has nothing new to verify yet
(TSK-034/PR #94 verification can wait for the Advisor's read or next
cycle's QA pass), and there's no UI-shaped or empty-backlog condition
calling for the other two.

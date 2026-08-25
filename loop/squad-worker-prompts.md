# Squad Worker Prompts — Sidekickz

Ready-to-fire prompts for kicking off one epoch of the `ai-engineering-loop`
skill in this repo, one per squad role. Paste the relevant block verbatim as
the opening message of a fresh Claude Code session/agent (or a Routine/
Task-tool spawn) — each one is self-contained and assumes no prior
conversation.

**How to use:** open one new Claude Code session per squad (they can run
concurrently — each only writes its own `squad-handshake-<squad>.md` plus
append-only sections of the shared `backlog-inbox.md`, so there's no shared-
write collision), paste the matching prompt below, let it invoke the
`ai-engineering-loop` skill for one epoch cycle: pull the next `READY_FOR_PM`
item, run Draft → Build → Test → PR (or the research/QA/design equivalent),
update that squad's handshake file, stop. Re-paste the same prompt (or say
"continue the loop") to advance that squad by one more cycle later — the
prompts are deliberately written to pull whatever is next from the backlog
rather than naming specific task IDs, so they don't go stale as the backlog
turns over. Don't chain roles in one session — each role gets its own fresh
invocation, per the skill's no-direct-agent-talk rule.

## Repo facts every prompt below assumes

- **Knowledge base**: read `CLAUDE.md` first, then consult the shared
  knowledge base it points to (`GRITui/grit-lib`,
  `knowledge/sidekickz/README.md`) for this repo's tech stack, feature map,
  and known fragile areas before triaging or building anything.
- **Stack**: vanilla JS PWA, no build step, no framework. App code is
  `app/app.js` + `app/index.html` + `app/styles.css`. Backend is a small set
  of Vercel serverless functions under `api/` (LINE integration, Stripe).
  `sql/schema-core.sql` + `lib/schemaSql.js` define the DB schema;
  `dataClient.js` mirrors it client-side.
- **Tests**: `tests/test-*.mjs` (Node harnesses, no browser) +
  `tests/check-*.js` (Playwright, live against `app/`). Run the full battery
  with `bash tests/run-all.sh` (needs `npm ci` first). Every suite must be
  0 failed / 0 console errors before a PR is opened.
- **Brand CI**: reuse existing tokens only, never invent new ones —
  `--brand #22554B`, `--marigold #C08A3E`, warm paper surfaces
  (`#F7F6F2`/`#FDFCFA`/`#DDD9CF`), radius 16/11, bottom-sheet modals,
  Schibsted Grotesk / Spline Sans Mono, 44px+ tap targets. i18n is EN+TH —
  every new string needs both blocks.
- **Git/PR**: never commit or push directly to `main`. Work on a feature
  branch, open a PR — that's the owner's verification/approval point, not an
  in-chat confirmation. Merging to `main` auto-deploys to staging
  (`deploy-vercel.yml`'s `test` → `deploy-staging` jobs). Production only
  deploys on a chat-triggered `workflow_dispatch`, never automatically.
- **State files** (this directory): `backlog-inbox.md` (shared, append-only
  ledger of `<task_item>` entries) and one `squad-handshake-<squad>.md` per
  squad. Read/write only your own squad's handshake file; read (never write)
  the others' and the inbox is append-only for new items, status-update-only
  for existing ones.
- **No busywork**: if there's genuinely nothing `READY_FOR_PM` for your
  squad this cycle, say so plainly in your handshake file (`IDLE`, nothing
  to do) rather than inventing findings, fixes, or test results to look
  busy.
- All communication is through those files. Never simulate talking to
  another squad's PM or to the owner mid-task.

---

## Owner-Assistant-Agent

```
Invoke the ai-engineering-loop skill acting as Owner-Assistant-Agent for
Sidekickz (GRITui/sidekickz).

Read loop/backlog-inbox.md and every loop/squad-handshake-*.md. Compile a
short status report: what's READY_FOR_PM / NEEDS_OWNER_REVIEW / BLOCKED in
the backlog, and each squad's current_status + active_task_id + a one-line
summary of their Current Focus. If any squad handshake shows a Cross-Squad
Request addressed to "Owner," surface it explicitly.

You are read-only across squad-handshake files — compile and report, don't
modify squad state. If I've given you a new idea/ask in this message, log it
as a new <task_item> in backlog-inbox.md with status=READY_FOR_PM (append
only, don't touch existing entries), then include it in your report. Never
inject it directly into a squad's active work.
```

## Researcher-Squad

```
Invoke the ai-engineering-loop skill acting as Researcher-Squad for
Sidekickz (GRITui/sidekickz). Before anything else, read CLAUDE.md and
consult the shared knowledge base it points to (GRITui/grit-lib,
knowledge/sidekickz/README.md) for this repo's tech stack, feature map, and
known fragile areas.

Read loop/backlog-inbox.md and loop/squad-handshake-researcher.md for
context. Scan the backlog for un-triaged or NEEDS_OWNER_REVIEW items
relevant to Researcher-Squad. For each:
- Read the actual code (app/app.js, app/index.html, app/styles.css, and any
  relevant api/*.js, lib/*.js) to confirm the described behavior — cite real
  file:line references in your notes, don't speculate.
- Score/triage against the owner's standing criteria: user friction / UX
  debt, mobile ergonomics (44px+ targets, one-hand reach), feature
  discoverability, weighted equally across personas unless told otherwise.
- Write findings into <researcher_notes>, move status toward READY_FOR_PM
  (or flag NEEDS_OWNER_REVIEW with the specific open question if a design
  decision only the owner can make blocks it — don't guess and don't hand
  Engineer-Squad an ambiguous spec).
- If triage produces new, more specific candidate items, append them as new
  <task_item> entries (backlog-inbox.md is append-only — never rewrite an
  existing entry's <description>, only its <status> and trailing HTML
  comment/<researcher_notes>).

If the owner-facing backlog is fully shipped/closed with nothing left to
triage from a popup or chat ask, don't idle: sweep for the next batch of
concrete, well-scoped improvement candidates by actually reading code —
known-issue patterns from the shared knowledge base, security/correctness
bugs, real (not hypothetical) test-coverage gaps versus tests/run-all.sh's
existing suites, and fragile-by-design areas the knowledge base already
flags. Don't propose large rewrites or business-model changes — that class
of work needs explicit owner sign-off (see TSK-023's history in
loop/squad-handshake-engineer.md for why); keep each new task_item small
enough to ship in one PR.

Update loop/squad-handshake-researcher.md's Current Focus and Recent
Commits/PRs with what you did this cycle. Do this for one epoch's worth of
triage, then stop — don't start Engineer-Squad's build work yourself. Never
talk to other squads directly; anything you need from another squad goes in
your handshake's "Cross-Squad Requests" section for their PM to read.
```

## Engineer-Squad

```
Invoke the ai-engineering-loop skill acting as Engineer-Squad for Sidekickz
(GRITui/sidekickz). Before anything else, read CLAUDE.md and consult the
shared knowledge base it points to (GRITui/grit-lib,
knowledge/sidekickz/README.md).

Read loop/backlog-inbox.md and loop/squad-handshake-engineer.md for context
(the latter has the full shipped history — read it before assuming
something is unbuilt). Pull the next READY_FOR_PM item that's actually
buildable (skip anything marked NEEDS_OWNER_REVIEW with an open question —
don't guess on an unresolved product decision).

Loop Draft -> Build -> Test -> PR:
- Draft the change against app/app.js + app/index.html + app/styles.css
  (vanilla JS, no framework, no build step) and any api/*.js, lib/*.js,
  sql/schema-core.sql it touches. Match existing patterns exactly (i18n
  EN+TH, brand CSS tokens only, existing helper functions) rather than
  introducing new ones.
- Build/run it locally.
- Test it: update/add the relevant tests/check-*.js or tests/test-*.mjs
  suite(s), then run the full battery with `bash tests/run-all.sh` (or
  `npm ci && bash tests/run-all.sh` if dependencies aren't installed). Every
  suite must be 0 failed, 0 console errors before proceeding.
- On success: commit on a feature branch and open a GitHub pull request
  against main (never commit/push directly to main, never merge it
  yourself). This is the owner's verification point.
- On failure: fix and retry. After 3 consecutive failures on the same task,
  mark it <status>BLOCKED</status> in squad-handshake-engineer.md with the
  failure details and move immediately to the next READY_FOR_PM item —
  don't keep retrying and don't halt the squad.
- After opening a PR (or hitting BLOCKED), immediately pull the next
  available READY_FOR_PM task rather than waiting for review.

Update loop/squad-handshake-engineer.md (Current Focus, Recent Commits/PRs,
Blockers & QA Failures, Cross-Squad Requests) before finishing. Never
commit/modify backlog-inbox.md's task descriptions yourself beyond
appending a SHIPPED/status marker comment once a PR is opened, matching
this file's existing convention (see how prior TSK entries record
`<!-- SHIPPED ... commit ..., PR #N -->`). If you hit an open
product/design question mid-build, do not guess silently — log it under
Cross-Squad Requests / flag the backlog item NEEDS_OWNER_REVIEW and move to
the next task rather than picking an answer for the owner. Never talk to
Researcher/QA/UX-UI squads directly — use your handshake's "Cross-Squad
Requests" section.
```

## QA-Tester-Squad

```
Invoke the ai-engineering-loop skill acting as QA-Tester-Squad for
Sidekickz (GRITui/sidekickz). Before anything else, read CLAUDE.md and
consult the shared knowledge base it points to (GRITui/grit-lib,
knowledge/sidekickz/README.md).

Read loop/backlog-inbox.md, loop/squad-handshake-qa.md, and
loop/squad-handshake-engineer.md to find work Engineer-Squad has shipped
(an open or recently merged PR) or design work UX-UI-Designer-Squad has
delivered that needs verification against its original acceptance
criteria (pull the criteria from the backlog item's <description>, not
from memory).

For each item under test:
- Run `bash tests/run-all.sh` (full battery) and confirm 0 failed, 0
  console errors — don't rely solely on the automated suite's own new
  assertions; independently check the acceptance criteria named in the
  backlog item (ergonomics: 44px+ targets; brand CI: only app/styles.css
  tokens, no new colors; discoverability/friction claims as described).
- Record PASS/FAIL per criterion in loop/squad-handshake-qa.md under a
  "Test Results — <task-id>" heading, following the existing format in that
  file.
- On FAIL, log it under Blockers & QA Failures with specifics (what broke,
  how to repro) rather than fixing it yourself — that's Engineer-Squad's
  job on their next cycle. Reference the task id and PR number so
  Engineer-Squad can pick it back up.
- On PASS, note under Cross-Squad Requests that the item is ready to close
  on the owner's review.

You are verifying against requirements, not writing new app code. Update
loop/squad-handshake-qa.md's Current Focus before finishing. Never talk to
Engineer-Squad directly — use your handshake's "Cross-Squad Requests"
section.
```

## UX-UI-Designer-Squad

```
Invoke the ai-engineering-loop skill acting as UX-UI-Designer-Squad for
Sidekickz (GRITui/sidekickz). Before anything else, read CLAUDE.md and
consult the shared knowledge base it points to (GRITui/grit-lib,
knowledge/sidekickz/README.md) — pay particular attention to brand
tokens/type/radii in app/styles.css, since all design work must stay
within existing brand CI, matching prior epochs' work (see
loop/squad-handshake-uxui.md's history).

Read loop/backlog-inbox.md and loop/squad-handshake-uxui.md for context,
plus loop/design-handoff/ (README.md and any .dc.html prototypes already
there) for the established prototyping convention this squad uses. Pull
the next READY_FOR_PM or NEEDS_OWNER_REVIEW item that needs a design
direction rather than straight implementation (a Researcher-Squad
candidate with no direction yet, or an owner ask that's a visual/
interaction question).

For each item:
- Design 1-3 refinement directions. Hard constraint: same look & feel and
  brand CI — reuse existing tokens, type, radii, and component patterns
  (list-card/settings-row/gate-card/etc.) straight from app/styles.css; no
  new colors, no new type scale. Trace every pixel/hex value used back to a
  real var(--*) token rather than hardcoding — the README in
  loop/design-handoff/ documents this convention.
- Build directions as interactive .dc.html prototypes under
  loop/design-handoff/ (matching the existing More 1a.dc.html /
  Assessment Report.dc.html pattern) so QA-Tester-Squad and the owner can
  click through them, not static mockups.
- Note in <researcher_notes>/the backlog item which direction you'd
  recommend and why, but leave the final pick to the owner via their PR/
  report-canvas review — don't have the design "decide" the product
  question.

If no UI-shaped task is queued this cycle, record IDLE with no active task
in loop/squad-handshake-uxui.md (don't fabricate design work to look busy)
and use your handshake's "Cross-Squad Requests" section to ask
Researcher-Squad to flag the next UI/UX-debt candidate it finds.

Update loop/squad-handshake-uxui.md's Current Focus and Recent Commits/PRs.
You draft designs and assets — building the shipped implementation into
app/app.js/index.html/styles.css is Engineer-Squad's job on a later cycle,
not yours.
```

---

## Notes for the PM (whoever is dispatching these)

- Squads can run in parallel; the only shared-write surface is
  `loop/backlog-inbox.md` (append-only per task) and each squad's own
  handshake file. No two squads write the same file section.
- If a worker session reports it can't find the `ai-engineering-loop`
  skill, paste the skill's instructions (this repo's Claude Code
  environment normally provides it) or point it at
  `.claude/skills/ai-engineering-loop` if vendored locally.
- Re-run any prompt above verbatim to advance that squad by one more epoch
  cycle once its current task resolves (PR opened/merged, BLOCKED, or
  verified).

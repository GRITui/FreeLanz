# Backlog Inbox — Sidekick design refinement loop
Append-only ledger. Owner idea logged by Owner-Assistant-Agent 2026-07-22; triaged by Researcher-Squad same cycle.

<task_item>
  <id>TSK-001</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- SUPERSEDED 2026-07-22 by Researcher-Squad: assessment complete, output is TSK-002..006 below. No standalone build action. -->
  <priority>HIGH</priority>
  <title>Assess all functional designs; rank refinement candidates</title>
  <description>Assess Sidekick's functional screens for user friction / UX debt, mobile ergonomics (44px+ targets, one-hand reach), and feature discoverability. All personas weighted equally. Keep brand CI (Schibsted Grotesk / Spline Sans Mono, --brand #22554B, --marigold #C08A3E, warm paper surfaces, radius 16/11, bottom-sheet modals).</description>
  <researcher_notes>Codebase read: app/index.html, styles.css, nav structure, module files list. 11 functional surfaces identified. Ranked below in TSK-002..006 by combined friction x ergonomics x discoverability score.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-002</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commits 50d12d8+d5ec60c, PR #65 (open, expanded scope). Playwright 741/741. See squad-handshake-engineer.md. -->
  <priority>HIGH</priority>
  <title>Candidate #1 — More/Settings screen: discoverability sink</title>
  <description>s-more hosts 12 collapsible sections mixing daily tools (Follow-ups, Portfolio, Research, Insights, Invoices, Docs) with one-time setup (LINE, Shop, Team, Tax defaults, Business info). Nav badge on "More" signals hidden actionable items. Three whole product modules are only reachable via More ▸ More tools — maximal discoverability failure. Long scroll, no search.</description>
  <researcher_notes>Score 9/10. Directly hits 2 of 3 owner criteria (discoverability + friction). Every persona passes through here. RECOMMENDED TOP CANDIDATE.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-003</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SUPERSEDED 2026-07-22 by Researcher-Squad: refined + shipped as TSK-008 (PR #65, commit 0a33910). No separate build action. -->
  <priority>HIGH</priority>
  <title>Candidate #2 — Job modal: overloaded bottom sheet</title>
  <description>modal-job stacks date, client, fast-path, service, package, 4 numeric fields, notes, net box, options compared, items, plan & payments (sub-tasks + milestones + dated steps), time tracking, then 3 stacked buttons (Save / Delete / Cancel as btn-danger styling). ~2.5 screens of scroll inside a 92vh sheet.</description>
  <researcher_notes>Score 8/10. Highest-frequency interaction in the app (FAB target). Friction-heavy; danger-styled Cancel is an ergonomics/affordance bug.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-004</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SUPERSEDED 2026-07-22 by Researcher-Squad: refined + shipped as TSK-009 (PR #65, commit 7bcedbf). No separate build action. -->
  <priority>MEDIUM</priority>
  <title>Candidate #3 — Home: alert/attention duplication</title>
  <description>Home shows hero, quick actions, goal card, home-alert-card, attn-card ("Needs attention"), and "Up next" — three separate urgency surfaces with different visual grammars competing on one screen.</description>
  <researcher_notes>Score 6/10. Friction moderate; well within brand. Refine after TSK-002/003.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-005</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SUPERSEDED 2026-07-22 by Researcher-Squad: refined + shipped as TSK-010 (PR #65, commit fc61191). No separate build action. -->
  <priority>MEDIUM</priority>
  <title>Candidate #4 — Week view calendar: dense touch grid</title>
  <description>wk-daycol 76px columns, 60px hour cells, 9-11px type; blocks below 44px height are common. Off-range ▲▼ hints tiny.</description>
  <researcher_notes>Score 5/10. Ergonomics issue but usage is lower-frequency than pipeline/invoices; desktop grid mitigates.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-006</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SUPERSEDED 2026-07-22 by Researcher-Squad: refined + shipped as TSK-011 (PR #65, commit 6e9acba). No separate build action. -->
  <priority>LOW</priority>
  <title>Candidate #5 — Task flow chip rail + minimap</title>
  <description>Stage chips + marigold minimap + hint text is a novel 3-layer navigation for 6 stages; new users must learn it. Cards themselves are solid.</description>
  <researcher_notes>Score 4/10. Recently redesigned (kb-* cards); refinement risk of churn. Keep.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-007</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commits 50d12d8+d5ec60c, PR #65 (open, expanded scope). Playwright 741/741. See squad-handshake-engineer.md. -->
  <priority>HIGH</priority>
  <title>UX-UI-Designer: produce 3 mockup directions for top candidate (TSK-002, More/Settings)</title>
  <description>Design 2-3 refinement directions for the More/Settings surface. Hard constraint: same look&feel and brand CI — reuse existing tokens, type, radii, list-card/settings-row patterns. No new colors.</description>
  <researcher_notes>Handoff to UX-UI-Designer-Squad this epoch.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-008</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commit 0a33910, PR #65 (open, expanded scope). Playwright 816/816. See squad-handshake-engineer.md. -->
  <priority>HIGH</priority>
  <title>Job modal refinement direction (candidate #2)</title>
  <description>Split the 2.5-screen sheet into a Quick log / Full details segmented sheet: quick path = date, client, fee, net, save; advanced sections (plan & payments, items, time tracking) collapse to drill rows with counts. Cancel de-escalated from danger styling to plain text. Direction 2a delivered.</description>
  <researcher_notes>UX-UI-Designer epoch 3. Owner review via report canvas #2a.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-009</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commit 7bcedbf, PR #65 (open, expanded scope). Playwright 780/780. See squad-handshake-engineer.md. -->
  <priority>MEDIUM</priority>
  <title>Home urgency-surface merge (candidate #3)</title>
  <description>Merge home-alert-card + attn-card + incoming pipeline into one "Today" stack using the existing list-row grammar and chip colors; hero and goal card untouched. Direction 2b delivered.</description>
  <researcher_notes>UX-UI-Designer epoch 4. Owner review via report canvas #2b.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-010</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commit fc61191, PR #65 (open). Playwright 840/840. Batch complete. See squad-handshake-engineer.md. -->
  <priority>MEDIUM</priority>
  <title>Calendar week view ergonomics (candidate #4)</title>
  <description>Default mobile zoom to 3-day columns (~118px), hour rows 72px, blocks min 44px with 12px+ type; 7-day stays for >=900px. Day pager reuses cal-navbtn tokens. Direction 2c delivered.</description>
  <researcher_notes>UX-UI-Designer epoch 5. Owner review via report canvas #2c.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-011</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commit 6e9acba, PR #65 (open). Playwright 737/737. See squad-handshake-engineer.md. -->
  <priority>LOW</priority>
  <title>Task flow rail light-touch (candidate #5)</title>
  <description>Keep the recent kb-* redesign. Light touch only: fold the marigold minimap into the chips as a progress underline, drop the always-on hint sentence to first-run only. Direction 2d delivered.</description>
  <researcher_notes>UX-UI-Designer epoch 6. Owner review via report canvas #2d.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-012</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commit 6e9acba, PR #65 (open). One item held for owner decision: gate no longer creates a real calendar booking, see squad-handshake-engineer.md Cross-Squad Requests. -->
  <priority>HIGH</priority>
  <title>Task flow: 4 client paths + incident notes + stage-gate booking</title>
  <description>Cards gained Cancel (red, tweakable to quiet "Lost"), Redo (attempt counter), Postpone (tap deadline chip), and Advance. Advancing opens an inline stage-gate to book the next deadline (Skip allowed); skipped stages show an amber "No date booked" banner that reopens the gate. Cancel/Redo/Postpone capture an optional quick note, shown on the card as italic quote.</description>
  <researcher_notes>Built in More 1a.dc.html epochs 9-10. Quote advance relabeled "Client accepted" per owner question about "Mark booked" ambiguity.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-013</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commit 6e9acba, PR #65 (open). -->
  <priority>HIGH</priority>
  <title>Task flow: multi-session package delivery + renewal loop</title>
  <description>Deliver-stage cards with pkg{used,total} show a session progress bar and "Log session N of M" action; each log opens a gate to book the NEXT session (skip = amber banner). Final session's gate offers "Send renewal quote" which completes the card and spawns a renewal card in Quote with the follow-up date, closing the renewal loop before a gap.</description>
  <researcher_notes>Demo cards: Ploy 1/8 (session flow), Mek 7/8 (renewal flow). Built epoch 11.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-014</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commit 8add6cf, PR #64 (open). Full regression 703/703 Playwright + 73/73 Node. See squad-handshake-engineer.md. -->
  <priority>HIGH</priority>
  <title>Stage-model migration: 6 stages -> 4 (Inquiry/Quote/Booked/Deliver)</title>
  <description>Owner confirmed a REAL migration, not a visual relabel: collapse the production STAGES ['pitch','quote','invoice','paid','delivery','extend'] to ['inquiry','quote','booked','deliver']. Invoice+Paid collapse into Booked (a job in Booked can still have zero/one/many linked invoices and a paid/unpaid state tracked as a job-level flag, not a stage); Delivery+Extend collapse into Deliver (package renewal becomes an explicit action — "Send renewal quote" — that spawns a new card in Quote, rather than a stage the job sits in). Must preserve: jobEarned()-driven revenue reporting (Home hero, goal card, Team billing, tax roll-up all read this), package delivery counting (jobDelivered()), invoice/payment linkage (onInvoiceMarkedPaid reverse hook), docgen quote/invoice generation, followups queue, booking links, dated sub-tasks/appointment gate. Existing installs' stored job.stage values ('pitch'/'invoice'/'paid'/'extend') need a one-time migration to the new 4-stage vocabulary on load, not a hard break. Blast radius (grep-confirmed): app.js, bookings.js, docgen.js, followups.js, invoices.js, tax.js, sql schema, api FIELDS, dataClient mirror, 12+ existing test suites, demo data for all 7 personas, i18n (EN+TH).</description>
  <researcher_notes>Foundational — TSK-011/012/013 (Task flow UI) sit on top of this and cannot be meaningfully verified until it lands. Sequenced first in the PM build order.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-015</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status>
  <priority>HIGH</priority>
  <title>Owner decision: adopt the full design_handoff_sidekick_refinements bundle</title>
  <description>Owner (Krit) reviewed the bundle (README.md, More 1a.dc.html interactive prototype, Assessment Report.dc.html, this ledger) and approved all five refined surfaces (TSK-002/007 More-Settings, TSK-008 Job modal, TSK-009 Home Today, TSK-010/011 Calendar + Task-flow light-touch, TSK-012/013 Task-flow client-paths + package renewal) for implementation into the production Sidekickz codebase (app/ vanilla JS + styles.css, no framework). Explicitly chose the harder of two options on the one open architectural question raised during triage: migrate the pipeline to the prototype's real 4-stage model (TSK-014) rather than keep 6 stages with a relabeled chip rail. Build order: TSK-014 (stage migration, foundational) -> TSK-012/013/011 (Task flow) -> TSK-002/007 (More/Settings) -> TSK-009 (Home) -> TSK-008 (Job modal) -> TSK-010 (Calendar). Each surface ships as its own tested, reviewed pass (assess -> build -> verify -> full regression), matching this repo's own established changelog convention, not one giant commit.</description>
  <researcher_notes>Design assets copied into loop/design-handoff/ for implementer reference. Prototype markup uses literal pixel/hex values throughout (README confirms these trace to real styles.css tokens) -- map back to var(--*) when implementing, do not hardcode.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-016</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commit 64ef125, PR #66 (open, expanded scope). Playwright check-gate-booking.js 15/15, check-task-flow-v2.js 33/33. See squad-handshake-engineer.md. -->
  <priority>MEDIUM</priority>
  <title>Wire a real Calendar booking back into the inline stage-gate (Option B)</title>
  <description>Resolves the open decision carried in squad-handshake-engineer.md since PR #65: the TSK-012 inline stage-gate currently writes only `job.due` (a scalar reminder) and creates no `bookings` row, even though its copy ("Book the follow-up" / "Book & move" / toast "Appointment booked") implies a slot was booked. Owner reviewed the side-by-side mockup and chose Option B -- restore the old behavior by calling the existing, already-tested `createBookingForStep(j, st)` (app/app.js:5623) from the gate's basic-move resolvers so a real Calendar entry appears, matching what the old full-screen gate did for Inquiry-stage exact dates. Scope: `resolveGateAdvance()` (app/app.js:4996) and its two siblings for the 3 basic transitions (Inquiry->Quote, Quote->Booked, Booked->Deliver) each create/link a booking when a date is saved (skip path unaffected, still writes no date and no booking). Redo/Postpone need the linked booking moved or recreated, not just `job.due` rewritten -- flagged as the one non-trivial part of this change. Out of scope: gate copy already matches this behavior, so no i18n string changes needed (Option A would have required rewording; Option B does not).</description>
  <researcher_notes>Comparison mockup rendered from real app/styles.css tokens + app/app.js gate copy, shown to owner 2026-07-22 (see conversation record). Owner chose Option B over rewording the gate copy for Option A. Engineering cost estimated small by Engineer-Squad -- reuses existing, tested booking-creation code path, not new infrastructure, except the Redo/Postpone re-link case.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-017</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-22: commit 64ef125, PR #66 (open). Playwright check-lost-reason-chips.js 15/15, check-options-lost.js 28/28. Batch complete. See squad-handshake-engineer.md. -->
  <priority>LOW</priority>
  <title>Add optional lost-reason chips to the Cancel gate (Option B of the Lost/Redo assessment)</title>
  <description>Follow-up to the orphaned-`markJobLost()` note (squad-handshake-engineer.md Cross-Squad Requests): rather than restoring the old standalone fixed-reason modal (Option A, rejected -- would recreate the two-mechanism duplication problem), layer the same 4 canned reasons (`LOST_REASONS` = cancelled/no_response/price/competitor) as optional, single-select toggle chips directly above the existing free-text note field in the `cancel` branch of `gateCardHtml()` (app/app.js:4942). `resolveGateCancel()` (app/app.js:5054) reads the selected chip into `j.lostReason` alongside the note it already writes -- one mechanism, both a structured facet and the freeform narrative. No new modal, no new screen, no schema change (the `lost_reason` column already exists end-to-end in IndexedDB/server mirror/SQL, just has zero consumers today). A follow-on "Lost reasons" breakdown in the existing dev-only Insights screen becomes possible once the field is populated, but is NOT required to ship the chips themselves -- separate, optional next step.</description>
  <researcher_notes>Owner reviewed a before/after mockup (chips + note vs. note-only) rendered from real app/styles.css tokens + app/app.js gate structure, plus an illustrative (explicitly mock-data) Insights breakdown preview, 2026-07-22 (see conversation record). Explicitly LOW priority / not urgent -- the underlying data has had zero downstream consumers since TSK-012 shipped, so nothing regresses by leaving this unbuilt for now.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-018</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- Part (1) SHIPPED by Engineer-Squad 2026-07-25: commit cf3eb73, PR #72 (merged). renderPipelineTimeline() (app/app.js:4645) now also sources dated points from job.due (+ its linked booking via job.dueBookingCuid), not just job.subTasks -- a job.due backed by a linked booking renders as a dot (matches an 'exact' step); one without renders as a bar (matches a 'by' step). New check-scheduling.js section 6a (jobB's gate-set job.due renders as one timeline dot mid-flow). Full battery clean, check-scheduling.js 66/66.
  Part (2) SHIPPED by Engineer-Squad 2026-07-25: commit 508e454, PR #77 (merged, abfae4d). Owner's answer to the open design question below: "I don't actually use it that way -- just remove it" (no freeform-reminder replacement needed). Removed the standalone dated sub-task list (job-subtasks-body, addSubTask/toggleSubTask/deleteSubTask/editSubTask/repeatSubTask, #modal-appt's add/edit/repeat modes) -- Plan & payments is milestones-only now. Two non-obvious dependencies found and confirmed with the owner before building around them: Options compared's 📅 "Book viewing" button (bookViewingForOption) reuses the same job.subTasks[]/#modal-appt plumbing and was kept working untouched; milestone gating (gatingSubTaskId, the "Locked" chip) read job.subTasks[] too and would have gone unusable for any job with no options being compared -- added a minimal inline gate creator in the "+ Add milestone" form instead of reviving the standalone list, plus a "mark done" affordance on the Locked chip itself (the only remaining way to resolve a gate). check-blockers-p1.js/check-job-modal-v2.js/check-merges.js/check-scheduling.js all updated (obsolete assertions deleted, not patched -- no successor for a freeform undated checklist item or step repeat). Full battery clean: 15 Node + 33 Playwright suites, 0 failures. See squad-handshake-engineer.md. -->
  <priority>MEDIUM</priority>
  <title>Rework the Pipeline Timeline view off job.subTasks; remove the subtask feature</title>
  <description>Two linked asks from the owner: (1) fix the Pipeline Timeline view so a job still shows even when it has no subtasks; (2) remove the subtask feature entirely. Explicitly out of scope: job.tip and job.expense (the Fee/Tip/Expense job-form fields and their net-take math) -- not to be touched by this work.

Current behavior (confirmed in code): `renderPipelineTimeline()` (app/app.js:4642) builds its rows ONLY from `(j.subTasks || []).filter(st => st.dateType && st.date)` -- a job with zero dated subtasks is omitted from the Timeline entirely (app/app.js:4653-4654), even if it carries a `job.due` reminder or a real linked Calendar booking (`job.dueBookingCuid`, TSK-016). Since TSK-011/012/013 moved the primary stage-to-stage due-date flow onto `job.due`/the inline gate, and TSK-016 added a real booking behind it, most jobs now track their next date WITHOUT ever touching `job.subTasks` -- `job.subTasks` is populated only via the older, separate "+ Step with date"/repeat/edit dated-step mechanism (`openApptModal` add/repeat/edit modes, job-detail's "Plan & payments" drill row). That's the root of ask (1): the Timeline's data source is stale relative to where due-dates actually live now.

Ask (2) -- removing the subtask feature outright -- is a real capability removal, not a small tweak: `job.subTasks` is a first-class array (separate from `job.milestones`, which stays untouched -- confirmed both live side-by-side under "Plan & payments" via `renderJobTracking()`, app/app.js:6744), exercised by `openApptModal`'s add/repeat/edit modes and asserted across multiple existing suites (check-scheduling.js Sections 1-3/6b/11/13-15, check-merges.js, check-options-lost.js's "sub-tasks survive an ordinary detail edit" case). Removing it means: deciding what (if anything) replaces "+ Step with date" for a mid-engagement freeform reminder that isn't a stage-gate date, redesigning the Timeline's whole bar/dot/flag rendering model (currently keyed on subTask `dateType` 'exact'/'by') around `job.due`/bookings instead, and updating/removing every test that currently seeds or asserts subTasks.</description>
  <researcher_notes>Logged READY-FOR-TRIAGE but marked NEEDS_OWNER_REVIEW rather than READY_FOR_PM: ask (1) alone (Timeline also/instead sourcing from job.due + linked bookings) is well-scoped and buildable as-is, but ask (2) (removing subtasks entirely) has open design questions only the owner can resolve -- does anything replace "+ Step with date" for freeform mid-engagement reminders, or is job.due (one date per job) considered sufficient going forward? Recommend splitting into two epochs: ship the Timeline data-source fix first (low risk, matches TSK-016/017's own move away from subtasks), then scope the subtask removal separately once the replacement question is answered.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-019</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-25: commit 75fe3e2, PR #70 (merged). New suite section check-home-today-v2.js §4b, 48/48 total, 0 console errors. Full battery clean (check-scheduling.js 65/65, all else green). See squad-handshake-engineer.md. -->
  <priority>HIGH</priority>
  <title>Home never nudges renewal for a package that hits exactly 0 remaining in one visit</title>
  <description>Found while assessing the owner's real laundry-package use case (50-piece package, sold as variable per-visit quantities rather than fixed 1-unit sessions -- see the walkthrough video): a package that jumps straight from N remaining to 0 remaining in a single delivery (e.g. 26 left -> a 26-piece visit exhausts it) gets ZERO Home renewal nudge, ever.

Root cause (confirmed in code): `computeClientsNeedingAttention()` (app/app.js:5964) only considers `activePackageFor(c.id)` (app/app.js:638), which is hard-filtered to `packageRemaining(p) > 0` -- a fully-used package is invisible to this function entirely. Downstream, the "almost done" alert only fires on `remaining > 0 && remaining <= PACKAGE_ALMOST_DONE_THRESHOLD` (=2, app/app.js:5962/6013) -- also requires > 0. A variable-quantity business (laundry pieces, real estate deals, anything not sold in uniform 1-unit sessions) routinely skips straight past that <=2 window in one visit, landing on exactly 0 with no alert ever having fired first. The uniform-1-unit-session case (a personal trainer logging one session at a time) is the only shape that reliably passes through the <=2 window before hitting 0, which is presumably why this gap wasn't caught earlier.

Fix: add a third attention kind (e.g. `depleted`) for a client whose most-recently-purchased package (`clientPackages(c.id)[0]`) has `packageRemaining() === 0`, `packageUsed() > 0` (excludes a degenerate zero-total package), and is NOT expired (`!packageIsExpired()` -- an expired-with-balance-forfeited package already has its own distinct message on the client profile; don't conflate the two). Reuses the existing generic marigold-pill row rendering in `attentionRowHtml()` (no new UI needed) and the existing `offerRenewalForClient(clientId)` action (already package-existence-agnostic). Needs a `kindRank` entry in `renderHomeToday()` (app/app.js:3968) -- proposed priority: overdue -> expiring -> depleted -> almost (a package already at zero is more urgent than one merely running low).</description>
  <researcher_notes>Well-scoped, additive, low-risk -- one new item-push branch in an existing function, one new sort-priority entry, no new components. Directly actionable this epoch. Secondary, NOT logged as its own item yet: the fixed `PACKAGE_ALMOST_DONE_THRESHOLD = 2` (absolute unit count) may not be the right model for variable-quantity businesses at all -- worth an owner conversation on whether it should scale with package size (e.g. a percentage) instead, but that's a bigger design question than this bug fix and shouldn't block it.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-020</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-25: commit 08ac008, PR #79 (open). Built option (b) from researcher_notes: the 4-tile grid is gone from More's root, relocated (not deleted) one level deeper as a single "Tools" drill-in row into a new #s-more-tools screen hosting the same 4 tiles unchanged -- all 4 screens/modules stay fully reachable, satisfies the owner's "complete every backlog" go-ahead using the squad's own recommendation. Full battery clean: 15 Node + 33 Playwright suites, 0 failures. See squad-handshake-engineer.md. -->
  <priority>MEDIUM</priority>
  <title>Remove the "Tools" grid section from the More screen</title>
  <description>Owner asked to remove the "เครื่องมือ" / "Tools" section (screenshot: the 3-card grid on More showing Follow-ups/ติดตามลูกค้า, Portfolio/ผลงาน, Research/คลังความรู้).

Current behavior (confirmed in code): the grid lives at app/index.html:175-200 (`<div class="section-title" data-i18n="tools_grid_title">` + `.tools-grid`, 4 `.tool-tile` buttons -- Follow-ups, Portfolio, Research, plus a conditionally-hidden Insights tile). Supporting JS: `renderFollowupsTile()` (app/app.js:2457, paints the badge/sub-line) and the i18n strings `tools_grid_title`/`followups_row_title`/`portfolio_row_title`/`research_row_title`/`insights_title` + their `*_tool_sub` variants (app/app.js, EN block ~784-786, TH block ~1306-1308).

Important scope question the owner needs to answer: `switchScreen('followups'|'portfolio'|'research'|'insights')` is called from NOWHERE else in the codebase (confirmed via full-repo grep) -- this grid is the ONLY navigation entry point to all four screens/modules today (an earlier "More tools" drill-in that used to hold Follow-ups/Portfolio/Research, referenced in TSK-002's own description, was already folded into this top-level grid in that same redesign). So literally removing the section as asked leaves those four screens' code (followups.js, portfolio.js, the research screen, the dev-only insights screen) fully intact but completely unreachable via the UI -- orphaned modules, not a real feature removal. Test-suite impact if the section markup goes: `tests/check-more-settings-v2.js` is the only suite asserting on `.tools-grid`/`.tool-tile` selectors directly.</description>
  <researcher_notes>Logged READY-FOR-TRIAGE but marked NEEDS_OWNER_REVIEW: the literal ask (delete the grid markup) is a small, mechanical change, but doing ONLY that orphans four working modules with no way in. Needs the owner to pick one: (a) delete the grid AND the underlying Follow-ups/Portfolio/Research/Insights modules + their tests entirely (a real, much larger feature removal -- also touches `BACKUP_STORES`/`RESTORE ORDER` in app.js:8032/8058 which include `followups`/`portfolio`/`research` as IndexedDB stores, i.e. a data-model change, not just UI), (b) delete only the grid entry point and relocate those four screens under an existing drill-in (e.g. Manage) so they stay reachable, or (c) something else the owner has in mind that this description doesn't anticipate. Recommend NOT starting Engineer-Squad work until this is answered -- (a) and (b) are very different sized changes and picking wrong wastes a full build+test cycle.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-021</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-25: commit 504e177, PR #79 (open). Built option (a) from researcher_notes: onboarding-only removal. enterApp() now auto-selects businessType='custom' via the existing choosePersonaOnboard('custom') instead of blocking boot on the modal -- BUSINESS_TYPES.custom.seedServices is already [], so a new account starts with zero preset services, no code change needed for that half. The picker survives ONLY for the "Try a demo" flow (login.html?demo=1), which needs it to pick which persona-flavored demo dataset to seed. Persona concept (businessType/unitWord/i18n variants/client trackers/Settings-side switcher) fully intact and unchanged, exactly as scoped. Traced persona-dependence across all 33 Playwright suites before touching anything -- only 5 had real dependency, 4 already resolved cleanly; the other ~30 suites' now-dead picker-click setup step removed mechanically. check-onboarding.js (tested the removed flow directly) rewritten for the new behavior. Full battery clean: 15 Node + 33 Playwright suites, 0 failures. See squad-handshake-engineer.md. -->
  <priority>MEDIUM</priority>
  <title>Remove the preset-service catalog and the business-type (persona) onboarding picker</title>
  <description>Owner asked to remove "preset service, persona" -- read as: stop asking a new account "What kind of business do you run?" at signup, and stop auto-seeding a starter Services catalog from that answer.

Current behavior (confirmed in code): `BUSINESS_TYPES` (app/app.js:473-480) is the persona registry -- 7 entries (trainer/realestate/laundry/insurance/garage/kol/custom), each with a `label`, `unitWord`, and a `seedServices` array (the "preset service" list). `seedServicesIfEmpty()` (app/app.js:7577) inserts those preset services into the account's Services store on first run. The picker itself is index.html's `#modal-persona-onboard` (title/sub copy: `onboard_persona_title`/`onboard_persona_sub`, app/app.js:804/1326), shown via the first-run flow at app/app.js:1990-2039 (`maybeShowPersonaOnboard()`/`choosePersonaOnboard()`), which also triggers `seedDemoData(persona)` for guest/demo accounts (`DEMO_PERSONA_DATA`, app/app.js:3459).

This is NOT a small, contained feature -- `businessType()`/`unitWord()` (app/app.js:482-483) and the persona concept thread through much more of the app than onboarding alone: the `t(key)` i18n resolver has a dedicated `key@<workType>` persona-scoped-variant lookup (app/app.js:649 area), each persona gets its own client-profile tracker section (`PERSONA_TRACKER_TITLES`, app/app.js:6406, rendered via `cust-persona-section`/`cust-persona-body`, app/app.js:6653-7498), and Settings lets an account change its business type later (app/app.js:1935-1939/7782-7795, re-running `seedServicesIfEmpty()`). A full-repo grep found persona/business-type/preset-service references (`modal-persona-onboard`, `BUSINESS_TYPES`, `onboard_persona`, `seedServicesIfEmpty`) touched in 30 of the ~33 Playwright test suites -- nearly every suite's setup flow clicks through the persona picker as part of registering a fresh test account.</description>
  <researcher_notes>Logged READY-FOR-TRIAGE but marked NEEDS_OWNER_REVIEW, higher-risk than TSK-020: "persona" is a foundational, cross-cutting concept (i18n variants, client trackers, demo data, unit-word labeling), not an isolated onboarding screen -- removing it fully is a large, multi-session undertaking touching most of the test suite's setup helper, not a quick strip-out. Needs the owner to clarify scope before Engineer-Squad estimates or starts: (a) remove ONLY the onboarding picker + preset-service seeding (every new account starts blank, `businessType` defaults to a single generic type, e.g. 'custom') while leaving the persona concept itself (unitWord, i18n variants, client trackers, the Settings-side business-type switcher) intact and still settable manually later, or (b) remove the whole persona concept end-to-end (collapse to one generic business model, delete `BUSINESS_TYPES`/`PERSONA_TRACKER_TITLES`/`DEMO_PERSONA_DATA` and every call site) -- a substantially bigger rewrite. (a) is plausibly a single-epoch build; (b) is not. Recommend the owner confirm which before this moves to READY_FOR_PM.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-022</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-25: commit 3ff5e45, PR #75 (merged). Built the recommended default (6th persistent nav tab) since the owner engaged with follow-up asks (Task flow+Calendar merge, tagline) rather than the AskUserQuestion menu -- PR review was the checkpoint, per the loop's own design, and the owner merged it. Nets back to 5 nav tabs after also combining Task flow + Calendar (separate owner request, same PR) into one screen. Full battery clean. See squad-handshake-engineer.md. -->
  <priority>MEDIUM</priority>
  <title>Add a Service/Product shortcut to the bottom nav bar</title>
  <description>Owner asked to add "service/product" to the nav bar.

Current behavior (confirmed in code): the unified Services/Products catalog screen (`#s-services`, `switchScreen('services')` -- per the M3-L1 comment in tests/check-catalog.js it already merged services and products into one catalog with a kind toggle) has exactly ONE entry point today: More ▸ Business & documents ▸ the "Services" `.biz-row` (app/index.html:330, itself two taps deep -- More screen ▸ `more-biz` drill-in ▸ this row). The bottom nav (`<nav class="nav">`, app/index.html:486-508) is fixed at 5 equal-width flex tabs (`.nav-btn{flex:1}`, styles.css:54) -- Home / Task flow / Clients / Calendar / More -- plus a separate floating FAB (`#fab`, app/index.html:511) that opens the Add-session job modal directly (`openAddJob()`).</description>
  <researcher_notes>Logged READY-FOR-TRIAGE but marked NEEDS_OWNER_REVIEW: the destination (promote the buried Services/Products catalog to one tap) is clear, but the mechanism isn't specified and the nav bar has no spare slot -- `.nav-btn{flex:1}` means a straight 6th button just makes all six narrower rather than overflowing, so it's not a hard blocker, but it is a real design call. Needs the owner to pick: (a) add a 6th persistent nav-btn (six equal-width tabs, all slightly narrower -- simplest, matches existing pattern exactly), (b) replace one of the current 5 tabs with it (which one, and where does that tab's screen move to instead?), or (c) extend the existing FAB into a short quick-add menu (Session / Service / Product) instead of touching the persistent nav at all. (a) is the smallest, most mechanical change and is recommended absent other guidance, but confirm before Engineer-Squad builds it since (b)/(c) touch different files entirely.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-023</id>
  <source>OWNER_POPUP</source>
  <status>READY_FOR_PM</status><!-- FULLY SHIPPED by Engineer-Squad 2026-07-26: part 1 commit a6db194 (PR #78, merged); part 2 (the held money-field half) commit 79d0f1d, PR pending. Fee/Tip/Expense/Sessions are now gone from the Add-session form entirely -- revenue is attributed at the moment it's actually known instead: markJobPaid() syncs from the invoice's own youReceive when a job is invoiced; applyPackageRevenue() apportions a package-linked job's share of the package's purchase price at delivery time (also fixed a real pre-existing gap -- package.price was write-only before this pass, so package-delivered work silently showed ฿0 revenue everywhere); the Cash job shortcut and the no-invoice "Mark paid" button both route through a new one-field Cash gate since Fee was their only input. "Options compared" and "Plan & payments" stay kept, as already shipped in part 1. Full battery clean: 15 Node + 34 Playwright suites, 0 failures. See squad-handshake-engineer.md. -->
  <priority>MEDIUM</priority>
  <title>Strip the Add-session job modal down to Date/Client/Service/Notes</title>
  <description>Owner asked (screenshot: the "Add session" job modal, Full details mode) to remove: Fee, Tip, Expense, Sessions, the Quick log/Full details toggle, "อสังหาฯ ที่ดู" (the realestate-persona label for the "Options compared" drill row), "Items on this engagement", Time tracking, and "Plan &amp; payments".

Current behavior (confirmed in code), all in app/index.html's `#modal-job`: `job-mode-seg` (:529-532, `setJobModalMode()`, TSK-008) is the Quick log/Full details toggle. `j-amount`/`field_amount` labeled "Fee" (:554, job.amount), `j-tip`/`field_tip` "Tip" (:555, job.tip), `j-expense`/`field_expense` "Expense" (:573, job.expense), `j-count`/`field_count` "Sessions" (:574, job.count) are the 4 money/quantity inputs. `job-tracking-section` (:598-642, Full-details-only) holds the 4 drill rows the owner named: `job-options-details` (:599-612, `renderJobOptions()` app.js:6948 -- title is persona-dependent, "อสังหาฯ ที่ดู" for realestate per the `options_title_re` TH string at app.js:1216, generically "Options compared"/job.options[]), `job-items-details` (:616-619, job.items[], products/services attached to the engagement, flows into quotes/invoices), `job-plan-details` (:625-636, job.subTasks[] + job.milestones[], the same data TSK-018 part 1 just wired the Pipeline Timeline to read from), and `job-time-details` (:638-641, time-tracking timer, app.js:7224 area).

Blast radius the owner should know about before this is scoped: `job.netAmount` (= `amount + tip - expense`, `calcNet()` app.js:4370 and the literal computation at app.js:2089/4423) is the single revenue figure the rest of the app reads everywhere -- Insights/reports, the tax rollup screen, package delivery math, and Home's earned/net stats all key off `netAmount`. Removing Fee/Tip/Expense from the UI without a replacement means every job's `netAmount` goes permanently to 0 (or whatever `amount` defaults to) unless revenue capture moves somewhere else (e.g. onto the invoice/quote instead of the job) -- this is a business-model decision, not a form-field trim. Time tracking, Plan &amp; payments (subTasks/milestones), Items-on-this-engagement, and Options-compared are each their own smaller, more self-contained data model+UI, more like TSK-020's "orphan vs. delete" situation than TSK-021/023's core-money-model one -- these four could plausibly be removed independently of the Fee/Tip/Expense/Sessions decision.</description>
  <researcher_notes>Logged READY-FOR-TRIAGE but marked NEEDS_OWNER_REVIEW -- by far the highest-risk item logged this cycle. This reads as two very differently-sized asks bundled into one screenshot: (1) drop the Quick log/Full details toggle and the 4 drill-in sections (Options compared, Items on this engagement, Plan &amp; payments, Time tracking) -- each is a self-contained feature, deletable independently, similar in shape to TSK-020; and (2) remove Fee/Tip/Expense/Sessions -- which guts `job.netAmount`, the app's core revenue metric, unless the owner has a specific replacement in mind (e.g. "money now lives only on invoices/quotes, not on the session record itself"). Strongly recommend NOT starting any Engineer-Squad work on (2) until the owner confirms what should compute revenue instead, since building the wrong model would need to be substantially redone. (1) could proceed somewhat independently if the owner wants to unblock it first while (2) is still being decided.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-024</id>
  <source>OWNER_CHAT</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-07-25: commit 15f571c, PR pending. See squad-handshake-engineer.md. -->
  <priority>MEDIUM</priority>
  <title>Link a catalog Service to the Package it funds; scope package deduction by service, not just client</title>
  <description>Owner asked why package-usage deduction (the "17/20 left" badge on a client) lived on the client rather than on the specific service booked in Task flow. Root cause confirmed in code: `packages` (app.js's savePackage()) had no `serviceId` field at all -- a package was just {clientId, totalSessions, price, purchasedDate, expiresAt}, created via a separate manual "+Add package" step on the client's own detail screen, entirely disconnected from whichever catalog Service (e.g. "1-on-1 training," 10 sessions, 5,500 THB) the numbers were copied from. Worse: `activePackageFor(clientId)` (app.js:638) picked "the client's most recently purchased package with any balance," regardless of which service a Task-flow job was actually for -- a client holding two different services' packages at once could have the wrong one silently applied to a booking.

Owner's ask, restated: creating a Service with a usage qty > 1 (e.g. "1-on-1 training," 10x, 5,500 THB) should BE the package definition -- booking/delivering that service in Task flow should deduct from that client's balance for that exact service, with no separate manual step.</description>
  <researcher_notes>Built directly (owner gave a clear, concrete spec, not a menu of options) -- see squad-handshake-engineer.md's Recent Commits entry for the full implementation writeup. Nothing held back; no open design question remains on this item.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-025</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-08-05: commit 3c7018d, PR #83 (open). -->
  <priority>LOW</priority>
  <title>Consistency fix: two aria-label sites use htmlEsc() instead of attrEsc() in an attribute context (not currently exploitable)</title>
  <description>app/app.js:5999-6000 build `aria-label="Move ${htmlEsc(label)} up"` / `"...down"`. Per the shared knowledge base's known-issue #4 (a real CodeQL finding fixed earlier in this project), htmlEsc() doesn't escape `"`, so using it in an attribute context is generally the wrong helper -- attrEsc() is the established fix (42 existing call sites in app/app.js already use it correctly), and swapping is a trivial, zero-risk change.

CORRECTION (2026-08-05, caught before shipping): this task_item originally called it a "verified attribute-injection bug" and rated it HIGH/security, describing `label` as "user-entered free text (a task/service/product name)". That was wrong -- traced `label` back to its source (line 5994: `(meta.label && t(meta.label)) || stage`) and it is a static, developer-authored translation string, resolved via `t()` against the hardcoded `I18N` dictionary, keyed by `meta.label` which only ever comes from `STAGE_META`'s 4 fixed keys (`stage_inquiry_label`/`stage_quote_label`/`stage_booked_label`/`stage_deliver_label`) or the `stage` enum itself (`inquiry|quote|booked|deliver`). No user or attacker input reaches this value today. There is no live vulnerability here -- this is a code-hygiene/defense-in-depth fix only (correct helper for the context, so the code stays safe if this label source is ever made dynamic later), downgraded from HIGH to LOW accordingly.</description>
  <researcher_notes>Broadened the sweep across every app/*.js file (not just app.js) with both the original double-quoted-attribute regex and a single-quoted-attribute variant, plus a manual check of every `title=`/`placeholder=`/`value=`/`alt=` attribute for htmlEsc usage anywhere in that attribute. Result: these are the ONLY 2 htmlEsc()-in-attribute sites in the entire app/ directory, and both share the same static source. No genuine attribute-injection instances exist in this codebase today (the one CodeQL previously caught was already fixed). Closing the "audit the rest" half of this task_item as done -- nothing further to find. Fix is still worth shipping for consistency/future-proofing, just not urgent.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-026</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-08-05: commit 3c7018d, PR #83 (open). -->
  <priority>MEDIUM</priority>
  <title>Add a regression test guarding IndexedDB store/DB_VER consistency</title>
  <description>Confirmed: no file under tests/ (`test-*.mjs` or `check-*.js`) asserts that every IndexedDB store name referenced anywhere in app/app.js (via `.objectStore('name')` / `db.transaction([...])`) has a matching `createObjectStore('name', ...)` call reachable from the `onupgradeneeded` migration ladder keyed off `DB_VER` (app/app.js:33, currently 7). This is exactly the bug class in the shared knowledge base's known-issue #6: "IndexedDB version-bump gap -- M2 stores were added without bumping DB_VER, so onupgradeneeded never re-fired for existing DBs" -- a real past incident, fixed once by hand, with no guard against recurring.</description>
  <researcher_notes>Proposed shape: a Node test (matching the existing `tests/test-*.mjs` style) that statically extracts store names from both call sites via regex/string parsing of app/app.js, and asserts the two sets match (every referenced store has a creator, every created store is referenced). Pure static-analysis test, no browser/IndexedDB runtime needed -- should be fast to add and cheap to keep in the `test` CI gate (deploy-vercel.yml) alongside the rest of tests/run-all.sh. No current bug is known to exist today; this is a guard against a recurrence, not a fix for a live defect -- fine to schedule after TSK-025.

SHIPPED as tests/test-db-schema-consistency.mjs. Scope note added at ship time: this catches store-name typos, orphaned createObjectStore() calls, and references to a never-created store -- it can NOT detect "added/removed a store but forgot to bump DB_VER" in isolation, since that requires comparing against a previous deployed version (a git-history-based check was considered but the CI checkout is shallow/depth-1, so a merge-base diff wouldn't reliably have the base commit available; skipped for reliability). Verified the shipped test does catch the realistic case (a new store referenced with no creator) via a throwaway before/after check. 35/35 assertions pass on current app/*.js.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-027</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-08-05: commit f74036c, PR #83 (open). -->
  <priority>HIGH</priority>
  <title>Demo mode: trainer/realestate/insurance personas showed ฿0 on the Home hero, depending which day of the month the demo was run</title>
  <description>Discovered while running the full test battery for TSK-025/026 (not from a screenshot): `tests/check-demo-data.js` failed 3 of 22 assertions -- "[trainer] Home hero amount is non-zero after seeding, got: ฿0", same for realestate and insurance.

CORRECTION (2026-08-05, caught before shipping): this task_item originally guessed "likely TSK-023 fallout" (the revenue-model rework) without verifying. That guess was wrong. Actual root cause, fully traced: Home's hero (renderHome(), app.js) sums `job.amount+tip-expense` over `jobsThisMonth().filter(jobEarned)` -- `jobsThisMonth()` is a HARD calendar-month filter (`j.date.startsWith(monthKey())`), not a rolling window, and `jobEarned()` just checks `job.paid`. `seedDemoData()`'s per-persona job dates are `relDate(daysOffset)` with hand-picked, fixed negative offsets (e.g. trainer's paid jobs are -5/-7/-14 days). Today (2026-08-05) is only 5 days into August, so any offset <= -5 lands in JULY and silently drops out of `jobsThisMonth()`. Verified exactly which offsets crossed the boundary for all 5 tested personas and confirmed it explains every pass/fail: trainer (-5/-7/-14, all excluded) and realestate (-6/-10/-40, all excluded) lost 100% of their paid revenue to the boundary; insurance's one in-month paid job (-2) happened to be a ฿0 "claim assistance" entry while its real revenue (45000, at -7) fell outside; laundry (-3 lands in-month, ฿900) and garage (-1 lands in-month, ฿2500) happened to have at least one paid job close enough to "today" to survive. This is date-of-month-dependent, not a one-time regression -- which personas fail shifts depending on what day the demo/test runs on, which is presumably why it wasn't caught earlier (CI runs on other days of the month wouldn't reproduce it).</description>
  <researcher_notes>Fixed in seedDemoData() (app/app.js, near the `data.jobs` loop): added a job-only `jobDate(offsetDays)` helper that clamps to `Math.max(offsetDays, -(today.getDate()-1))` before calling the existing `relDate()`, guaranteeing every seeded job's date falls within the current calendar month regardless of which day of the month the demo runs on -- matching jobsThisMonth()'s own filter exactly. Deliberately scoped to job dates only (not invoices/bookings/packages/progressLogs/client deal history), which keep their original unclamped offsets since they're read by other screens for date-spread flavor (e.g. trainer's progress-log weight-loss-over-a-month narrative) and aren't subject to this specific ฿0 failure mode. Verified: full `tests/check-demo-data.js` now 22/22 across all 5 tested personas; full battery re-run clean (51/51 suites, 706+ assertions, 0 failures) after this fix.</researcher_notes>
</task_item>

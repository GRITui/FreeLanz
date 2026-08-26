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

<task_item>
  <id>TSK-028</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-08-05: commit 9ac0c83, PR (see squad-handshake-engineer.md). -->
  <priority>LOW</priority>
  <title>check-demo-data.js never tested the 'kol' (KOL/Influencer) persona</title>
  <description>Second auto-improvement epoch, following up on TSK-027. Verified directly: `DEMO_PERSONA_DATA` and `BUSINESS_TYPES` (app/app.js) both define 6 real seeded personas -- trainer/realestate/laundry/insurance/garage/kol, in that exact order (matching the onboarding modal's row order 1-6; 'custom' is row 7 and intentionally has no seed content, per its own comment in app.js). `tests/check-demo-data.js`'s smoke-test `PERSONAS` array only ever listed 5 of the 6: `['trainer', 'realestate', 'laundry', 'insurance', 'garage']` -- 'kol' had zero test coverage, including for the exact TSK-027 failure mode (Home hero ฿0), despite kol's own paid-job day-offsets never having been checked against the day-of-month boundary that broke 3 other personas.</description>
  <researcher_notes>Fixed by adding 'kol' to the PERSONAS array (the loop already derives the onboarding-modal row index from array position, so this was a one-line addition, no other logic changes needed). Verified kol passes cleanly with the TSK-027 fix already in place (toast shown, non-zero hero, zero console errors) -- incidentally also serves as extra confirmation that TSK-027's fix (clamping job dates at the seedDemoData() source, not per-persona) generalizes correctly to a persona it was never explicitly checked against. tests/check-demo-data.js: 25/25 (was 22/22). Full battery: 51/51 suites clean.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-029</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>HIGH</priority>
  <title>Clients screen search triggers an unthrottled full re-render + full IndexedDB re-scan on every keystroke</title>
  <description>`onClientSearchInput()` (app/app.js:5205, wired via `oninput` at app/index.html:488) calls `renderCustomers()` with no debounce. `renderCustomers()` (app/app.js:5221) unconditionally calls `computeClientsNeedingAttention()` (app/app.js:5040), which does a fresh `await dbAll('invoices')` plus an O(invoices) filter and O(packages)+O(jobs) package lookups per customer -- across ALL customers, not just the search-filtered subset. The render body then adds its own per-row O(jobs) `clientStage()`/`clientProspectService()` calls (app/app.js:5243/5279) and repeats `activePackageFor()` (app/app.js:663, itself O(packages)+O(jobs)) per visible row. At a realistic scale (300 clients / 500 jobs / 300 packages / 500 invoices) this is roughly 1.5-2 million array iterations plus one full IndexedDB `getAll('invoices')` round-trip, re-triggered on EVERY keystroke -- typing a 6-character query fires the whole chain 6 times. There is also no render-currency guard (unlike bookings.js's `if (document.getElementById('book-body') !== el) return;` pattern), so a slower keystroke's async IDB read can resolve after a newer one and overwrite the list with stale results. This is the only keystroke-triggered full-list-rerender hot path in the app (jobs pipeline and invoices have no search box at all).</description>
  <researcher_notes>Traced by a dedicated perf-sweep agent with full complexity math against realistic multi-hundred-client volumes (not a tiny-list nitpick) -- confirmed real, will visibly lag once a shop has a few hundred clients/jobs, which is the app's own target usage after a few months. Proposed minimal fix (one PR, no rewrite): (1) debounce `onClientSearchInput` ~150-200ms before calling `renderCustomers()`; (2) cache `computeClientsNeedingAttention()`'s result once per `reload()`/mutation instead of recomputing it on every `renderCustomers()` call, since it doesn't depend on the search query at all; (3) pre-index `jobs`/`packages` by `clientId` once at the top of `renderCustomers()` (a `Map`) and have `clientStage`/`clientProspectService`/`activePackageFor` consume the pre-grouped arrays instead of re-filtering the full arrays per client. HIGH: this is a real, user-visible lag on the app's single most direct list-search interaction at its own stated target scale (hundreds of clients/jobs), not a theoretical edge case -- per CLAUDE.md's scale, P1 (blocks release-quality polish for the SSS-tier launch push) rather than P0 (nothing is broken/lost, just slow).</researcher_notes>
</task_item>

<task_item>
  <id>TSK-030</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>HIGH</priority>
  <title>dbAll/dbGet/dbGetByUsername/dbDel never wire IndexedDB request.onerror -- a read failure can hang the whole app forever with no error shown</title>
  <description>`dbAll()` (app/app.js:134), `dbDel()` (:156), `dbGet()` (:162), and `dbGetByUsername()` (:168) each build a Promise that resolves on `req.onsuccess` but never sets `req.onerror` -- if the underlying `IDBRequest` fires `onerror` instead (transaction abort, unexpected DB close, storage error), the returned Promise never settles at all, not even a rejection. Contrast with `dbPut`/`dbAdd` (app/app.js:140-155), which already correctly wire `req.onerror = () =&gt; rej(req.error)`. `reload()` (app/app.js:1201) does `jobs = (await dbAll('jobs'))...`, `customers = (await dbAll('clients'))...` etc. sequentially and is called on boot and after nearly every mutation -- a single stuck read means every line after it, and every render call that depends on it (renderHome/renderCustomers/renderServices/renderPipeline), simply never runs, with no console error, no toast, no retry. The app appears frozen on whatever screen was last shown (or a blank shell on cold boot), indistinguishable from a real crash.</description>
  <researcher_notes>Traced by the accessibility/error-state sweep agent; verified by reading dbPut/dbAdd's correct error-wiring as the in-file reference pattern the four broken functions should match. Fix is a 4-line, zero-risk change (add `req.onerror = () =&gt; rej(req.error)` to each of the 4 functions, mirroring dbPut/dbAdd exactly) plus wrapping bootApp()'s `await openDB()`/first `reload()` region in a try/catch that shows a retry toast instead of hanging silently. Low likelihood of triggering (IndexedDB read errors are rare) but the failure mode when it does hit is a total, silent app hang with zero user-facing signal -- HIGH per CLAUDE.md's "prod broken" framing even though it's low-frequency, because the fix is trivial and the alternative (a user's app just stops working with no error) is exactly the kind of thing that would tank a support/review score at launch.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-031</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>HIGH</priority>
  <title>Modals have no focus management: no initial focus, no focus trap, no Escape-to-close, no return-focus on close</title>
  <description>All 6 modal surfaces (`openJobModal`/`closeJobModal` app/app.js:3348-3351, plus the matching pairs for customer :6238/6242, service :6416/6417, account name :1181-1186, and the dynamically-created `markJobLost` modal :4496-4520) only toggle a `.modal-overlay.open` CSS class (app/styles.css:404-405) -- none of them call `.focus()` on open, none store/restore `document.activeElement`, none apply `inert`/`aria-hidden` to the screen underneath, and there is no global `keydown` handler for Escape anywhere in app.js (the only modal-adjacent keydown listener is the auth-form Enter-to-submit at app.js:7229). A keyboard or screen-reader user opening e.g. "Add job" keeps tabbing through the invisible home screen underneath the overlay, can't dismiss the modal with Escape, and loses their place (focus resets to `&lt;body&gt;`) every time they close it. This affects all core CRUD flows (add/edit job, client, service) -- not a cosmetic edge case.</description>
  <researcher_notes>Traced by the accessibility sweep agent across all 6 modal open/close function pairs plus a repo-wide check confirming no Escape-key handler exists anywhere. Proposed minimal fix (one PR, vanilla JS, matches the existing pattern already used for overlay-click-to-close in markJobLost): in each `openXModal()`, store `document.activeElement` and call `overlay.querySelector('input,select,textarea,button')?.focus()`; in each `closeXModal()`, restore focus to the stored element; add one delegated `document`-level `keydown` listener that closes the topmost `.modal-overlay.open` on Escape. HIGH: blocks keyboard/screen-reader usability of every core data-entry flow in the app, which is squarely an "embarrass the product at launch" accessibility gap per this epoch's SSS-tier polish mandate, and the fix is small and self-contained (no framework, no rewrite).</researcher_notes>
</task_item>

<task_item>
  <id>TSK-032</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>HIGH</priority>
  <title>Hardcoded English word "Milestone" leaks into real, client-facing Thai invoices</title>
  <description>`draftMilestoneInvoice()` (app/app.js:6142) builds an invoice line item as `description: \`Milestone (${fmt(m.pct, 0)}%)\`` -- a literal English string with no i18n dictionary entry, no `t()` call. Unlike app chrome, this description flows directly into a real invoice document handed to a client (app/i18n.js's own header comments explicitly flag "the actual paperwork handed to Thai clients, not app chrome" as needing full i18n coverage, and this is exactly that class of output). A Thai-language invoice generated from a milestone will contain the literal English word "Milestone" mid-line, in front of a paying client.</description>
  <researcher_notes>Traced by the i18n sweep agent, which diffed the full 965-key EN vs 964-key TH dictionary programmatically (not estimated) and grepped every toast/alert/confirm call plus template-literal text in recently-touched functions. Proposed fix (one line + one new i18n key pair): add `milestone_invoice_desc` (EN `'Milestone ({pct}%)'` / TH `'งวดที่ ({pct}%)'`) to app/i18n.js and change app/app.js:6142 to build the description via `t('milestone_invoice_desc').replace('{pct}', fmt(m.pct,0))`, matching the app's existing `{placeholder}`-substitution convention (verified no broken/mismatched interpolation exists elsewhere in the dictionary). HIGH despite being a one-line fix: this is the single i18n finding this cycle that reaches an outbound client-facing document rather than app-internal chrome -- a Thai business owner sending an English word on their own invoice is a real, visible launch-quality embarrassment, not a cosmetic toast.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-033</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status><!-- SHIPPED by Engineer-Squad 2026-08-26: PR pending (branched from researcher-squad/epoch3-launch-polish-sweep, PR #91 not yet merged). See squad-handshake-engineer.md. -->
  <priority>HIGH</priority>
  <title>api/stripe-webhook.js's handler logic (status mapping + reconciliation) has zero test coverage</title>
  <description>`tests/test-stripe-webhook.mjs` only imports `verifyStripeWebhook` from lib/stripe.js (signature verification) -- it never imports or calls the default `handler` export from api/stripe-webhook.js itself. Confirmed by grep: zero hits for `handler(`, `mapStripeStatus`, or `SUBSCRIPTION_EVENTS` in the test file. The untested logic includes `mapStripeStatus()` (api/stripe-webhook.js:51-56, collapses Stripe's `incomplete`/`paused`/etc. statuses into `canceled`) and the out-of-order-webhook-delivery reconciliation path (:78-127, calls `subscriptions.retrieve` with a fallback to the event payload on failure, then writes `plan`/`team_seats`/`current_period_end` to the DB gated on whether `sub.metadata.plan` is present). A regression in either could silently downgrade or fail to lock out non-paying accounts (revenue leak) or incorrectly lock out paying ones, and would ship with the full test battery green since nothing exercises this code path today.</description>
  <researcher_notes>Traced by the test-coverage sweep agent, which established (and verified per-file) the structural fact that tests/run-all.sh never starts the API/DB backend -- so a filename hit for an api/*.js endpoint inside a check-*.js Playwright file is NOT real handler-level coverage; only a test-*.mjs that directly `import`s and calls the handler counts. Proposed fix: extend tests/test-stripe-webhook.mjs (or add a sibling file) to import the default handler, feed it a fake `db()` and a stubbed `stripeClient().subscriptions.retrieve`, and assert mapStripeStatus's full mapping table plus the reconcile-fails-falls-back-to-event-payload branch -- matching the existing pure-Node test-*.mjs convention (no browser needed). HIGH: this directly gates paid subscription access with currently zero coverage of the actual DB-write path, the highest-stakes gap this cycle's test-coverage sweep found.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-034</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>HIGH</priority>
  <title>api/billing-checkout.js and api/billing-portal.js have no coverage in the actual CI-run test battery</title>
  <description>api/billing-checkout.js's only reference anywhere in tests/ is tests/smoke-live.mjs:136-139 -- and smoke-live.mjs requires a live deployment and is explicitly excluded from tests/run-all.sh's globs (`test-*.mjs`/`check-*.js`), so this endpoint has zero coverage in the battery that actually gates deploys. api/billing-portal.js has literally zero references anywhere in tests/ (grep confirms). Risky untested logic: billing-checkout.js's plan/price-ID selection and success/cancel URL construction (built via lib/cors.js's `appUrl()`, itself also untested -- see the companion cors.js task_item); billing-portal.js's owner-only gate (`isAccountOwner`, :43-53) and the `no_customer` 409 branch for an account with no stored `stripe_customer_id`. A regression in either ships undetected by the regular test run: a broken checkout URL silently breaks the paid-upgrade funnel, or a broken owner-only gate could let a team member (staff/admin) reach the billing portal.</description>
  <researcher_notes>Traced by the test-coverage sweep agent, same methodology note as TSK-033 (only a direct handler `import` in a test-*.mjs counts as real coverage). Proposed fix (one PR, one new tests/test-billing.mjs covering both handlers): import both default handlers with a stubbed `stripeClient()`, assert billing-checkout's price-ID-per-plan selection and that success_url/cancel_url land on the intended app origin, and assert billing-portal's 403-for-non-owner / 200-for-owner-with-customer-id branches. HIGH: these are real money-funnel and billing-access entry points currently sitting entirely outside the deploy-gating test run, not merely under-tested.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-035</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>HIGH</priority>
  <title>api/auth-login.js has zero test coverage (anti-enumeration behavior + rate-limit wiring unverified)</title>
  <description>Grep across tests/ for "auth-login" returns nothing -- this endpoint has no direct test at all. Untested logic includes the generic-failure-message anti-enumeration behavior (api/auth-login.js:44-58 -- a LINE-only account and a wrong-password attempt both return the same `GENERIC_FAIL`, deliberately not revealing which case occurred) and the `rateLimit(request, {key:'auth-login', limit:10})` call at line 31. lib/rateLimit.js itself is unit-tested in isolation, but nothing verifies auth-login.js actually wires it in correctly with the right key/limit, or that a future edit to the failure-message logic doesn't reintroduce a username-enumeration regression (leaking which failure case occurred, e.g. distinguishing "no such user" from "wrong password").</description>
  <researcher_notes>Traced by the test-coverage sweep agent using the same "only a direct handler import counts" methodology as TSK-033/034. Proposed fix (one PR, new tests/test-auth-login.mjs): import the handler with a fake `sql`/`verifyPassword`, assert identical response shape/status across "no such user" / "wrong password" / "LINE-only account" cases, and that the 11th request within a window is rejected. HIGH: this is the app's primary authentication entry point with currently zero automated coverage of either its security-relevant anti-enumeration design or its rate-limit wiring.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-036</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>MEDIUM</priority>
  <title>api/migrate-upload.js bypasses the Basic-plan client cap</title>
  <description>api/clients.js's normal client-create path enforces `clientCapFor()` (15 clients on the Basic plan) via crudHandler's `beforeCreate` hook. api/migrate-upload.js (:46-60), which bulk-inserts clients directly (`insert into clients (...) on conflict (cuid) do nothing`), calls no such check and has no bound on `body.clients.length` at all (contrast with api/shop-public.js's `MAX_ITEMS=20` cap on its own array input). Because the insert is idempotent on `cuid`, an authenticated Basic-plan account can call this endpoint repeatedly, each time with a fresh batch of new client cuids, to load an unlimited number of clients and permanently bypass the monetized 15-client cap -- the cap is never re-checked afterward. This is authenticated, own-account-only (no cross-tenant leak), a real business-rule/monetization-control bypass rather than a data-confidentiality issue.</description>
  <researcher_notes>Traced by the security sweep agent, which read all 37 api/*.js and 14 lib/*.js files in full and confirmed this via the same beforeCreate/clientCapFor pattern already enforced elsewhere in the codebase. Proposed fix (one PR): call the same `clientCapFor(owner)` check inside migrate-upload.js's insert loop (stop inserting once the cap is reached, report the overflow count in the existing `skipped` response field), and add a `clients.length` cap (e.g. 500) matching shop-public.js's MAX_ITEMS pattern. Open sub-question for Engineer-Squad, not blocking: whether a Basic-plan account mid-migration should be allowed to land existing-but-over-cap data once (grandfather the import, block only net-new client creation afterward) vs. hard-capped at import time too -- flag to the PM/owner if it comes up, but the core fix (stop unbounded, uncapped growth via this one endpoint) is unambiguous and buildable now. MEDIUM: real, traceable monetization bypass with no privilege escalation or data leak -- not urgent-safety-critical, but a real revenue-control gap worth closing before launch.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-037</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>MEDIUM</priority>
  <title>Stage-gate card accessibility gaps: qty/date inputs missing accessible names, overdraft error not announced, reason chips missing aria-pressed</title>
  <description>Four related, small a11y gaps in the same gate-card component family (app/app.js, gateCardHtml() and its siblings, ~3200-4550), all reachable in the app's highest-frequency interaction (advancing/logging/cancelling a job): (1) the package "Log delivery" quantity input (`#jfp-qty`, app/app.js:3216-3232) has no `&lt;label&gt;`/`aria-label`/`aria-labelledby`, so a screen-reader user hears only "edit text, blank"; (2) `validateFastPathQty()` (:3240-3253) toggles the overdraft error's `style.display` with no `role="alert"`/`aria-live` and the input has no `aria-describedby` pointing at it, so the "Only N left" error is never announced; (3) the gate-card date input (`#gate-date-${j.id}`, app/app.js:4006) has no accessible name at all across every gate kind (quote-&gt;booked, redo, postpone, package session, package final); (4) `toggleGateReason()`/`toggleLostReason()` (app/app.js:4151/4525, the Cancel gate's optional reason chips) toggle only a CSS `.selected` class with no `aria-pressed`, so a screen-reader user can't tell which reason (if any) is currently chosen before confirming a cancellation.</description>
  <researcher_notes>Traced by the accessibility sweep agent, all four confirmed by reading the actual markup/handler code (not inferred from names). Proposed fix (one PR, all four are 1-3 line additions in the same file/component family): add `aria-label`/`aria-labelledby` to `#jfp-qty` and `#gate-date-*`; add `role="alert"` (or `aria-live="assertive"`) to `#jfp-error` plus `aria-describedby` on the qty input; toggle `aria-pressed="true"/"false"` alongside the `.selected` class in both toggle functions. MEDIUM: real, concrete gaps on a genuinely high-frequency surface (every stage advance/cancel/delivery touches a gate card), but each individually is a small attribute addition, not a structural fix -- bundled as one PR since they share one component family.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-038</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>MEDIUM</priority>
  <title>Six load-failure paths (Invoices screen + 5 Settings backend sections) fail silently with no toast/retry, inconsistent with the app's own established pattern</title>
  <description>`renderInvoices()` (app/invoices.js:97-112) calls `loadInvoices()` -&gt; `dbAll(STORE)` with no try/catch at all, unlike every sibling module (portfolio.js:58-65, research.js:~121-123, followups.js:241-243, bookings.js:562-564/620-622), which all wrap their equivalent load in try/catch and render a "Could not load..." empty-state on failure -- if loadInvoices() throws (or hangs, see TSK-030), the Invoices tab silently shows nothing, not even the normal "no invoices yet" empty state. Separately, 5 backend-driven Settings sections (team members app/app.js:1751, LINE channel status :2019, booking slots :2097, booking requests :2137, shop orders :2307) share the identical one-liner `if (!r.ok) { el.innerHTML = ''; return; }` on fetch failure -- no toast, no retry, no explanatory text, the whole section just disappears. Contrast with `resolveBookingRequest`/`resolveOrderRequest` (app/app.js:2215-2221/2373-2379) a few hundred lines below, which correctly toast on failure. A user with a flaky connection opening Settings -&gt; Team (or LINE booking, or the shop-orders inbox) sees the section vanish with no explanation, indistinguishable from "you have nothing here."</description>
  <researcher_notes>Traced by the accessibility/error-state sweep agent by reading each load path and comparing against the app's own already-correct sibling patterns (used as the reference standard, not an external convention). Proposed fix (one PR, mechanical -- same 2 shapes repeated 6 times): wrap invoices.js's loadInvoices() call in the same try/catch + empty-state pattern already used in bookings.js/portfolio.js; replace the 5 Settings sections' `el.innerHTML = ''` with `el.innerHTML = ''; toast(t('load_failed_generic'))` using one new shared i18n key (EN+TH), matching the toast-on-failure pattern the same file already uses two call sites down. MEDIUM: none of the 6 sites crash or lose data, but the repeated "just vanishes" pattern across 6 real surfaces (one of them financially important) is a genuine, fixable UX-debt pattern worth a normal-backlog pass.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-039</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>MEDIUM</priority>
  <title>convertQuoteToInvoice() swallows a DB write failure and proceeds as if it succeeded, allowing the same quote to be converted twice</title>
  <description>app/docgen.js:853-874's `convertQuoteToInvoice()` wraps its `dbPut('documents', rec)` write (which sets `convertedToInvoice: true`) in a try/catch that ONLY `console.error`s on failure -- execution falls through unconditionally to close the modal, switch to the Invoices screen, and open a prefilled new-invoice form, exactly as on success. If the write throws, the user believes the quote was marked converted and is dropped into a new invoice form as expected, but since `f.convertedToInvoice` never actually persisted, reopening that same quote later still shows the "Convert to invoice" button -- they can convert the same quote into two different invoices with zero warning that the first attempt silently failed.</description>
  <researcher_notes>Traced by the accessibility/error-state sweep agent, confirmed against the same file's own already-correct sibling catch blocks (saveDocumentFromForm, deleteSavedDocument, both a few functions away, which already `toast('Could not save/delete the document.')` on failure). Proposed fix (one PR, ~2 lines): on catch, `toast('Could not mark quote as converted -- try again'); return;` before the modal-close/screen-switch, matching the file's own established pattern exactly. MEDIUM: real data-consistency bug (a duplicate invoice from one quote), but the trigger (a DB write failure) is low-frequency -- normal backlog priority, not urgent.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-040</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>MEDIUM</priority>
  <title>business_type_kol has no Thai translation and is missing from the Settings business-type dropdown</title>
  <description>Diffing the full I18N dictionary (app/i18n.js) programmatically found exactly one EN key with no TH counterpart out of 965 EN / 964 TH keys: `business_type_kol` (app/i18n.js:163, `'KOL / Influencer'`) -- the TH block (~app/i18n.js:690-692) jumps straight from `business_type_garage` to `business_type_custom`, skipping it entirely. It's used at app/index.html:761 (`data-i18n="business_type_kol"`) inside the persona-onboarding picker, which every new "Try a demo" user sees. A Thai user selecting "KOL / Influencer" during onboarding sees this one label fall back silently to English while all 5 sibling persona options are in Thai. Separately (non-i18n, found in the same pass): the Settings screen's `&lt;select id="set-business-type"&gt;` (app/index.html:280-286) has no `kol` `&lt;option&gt;` at all, so an existing account can never manually switch its business type to KOL/Influencer post-onboarding even though the persona fully exists elsewhere in the app (DEMO_PERSONA_DATA, BUSINESS_TYPES, client trackers).</description>
  <researcher_notes>Traced by the i18n sweep agent via a programmatic key-set diff (not estimated) plus a follow-up grep confirming the Settings `&lt;select&gt;`'s option list. Proposed fix (one PR, two small pieces): add the missing `business_type_kol` TH string to app/i18n.js; add the missing `&lt;option value="kol"&gt;` to the Settings business-type `&lt;select&gt;` in app/index.html, matching the other 5 options' markup exactly. MEDIUM: single missing string, but on a core onboarding screen every persona-selecting user hits once, plus a real (if narrow) functional gap where an existing account can never manually pick this persona later.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-041</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>MEDIUM</priority>
  <title>Hardcoded English toasts on core, high-frequency flows: mark-paid, milestone amount validation, trainer progress log, Thai tax calculator</title>
  <description>Several toast()/confirm() calls on genuinely frequent, core flows use literal English strings with no matching i18n dictionary entry, so they never localize for Thai users regardless of the language setting: `toast('Marked paid')` in `markJobPaid()` (app/app.js:4619, fires every time a job is marked paid without an invoice -- one of the most frequently tapped actions in the app); `toast('Enter the milestone amount')` (app/app.js:6083, Plan &amp; payments validation); the trainer-persona progress log's `toast('Enter a weight or a note')` / `toast('Entry saved')` / `confirm('Delete this entry?')` (app/app.js:6178/6187/6191, hit every session for the trainer persona specifically); and `toax('Enter an amount first')` in `taxUseInInvoice()` (app/tax.js:200) -- notable because the Thai tax calculator (`taxr_*` block) is otherwise an explicitly, heavily localized flagship feature, making this one unlocalized toast a visible inconsistency in an otherwise-complete Thai-specific tool.</description>
  <researcher_notes>Traced by the i18n sweep agent, which grepped every literal-English toast/alert/confirm call across app.js and the feature modules and cross-checked each against the full I18N dictionary for a matching key. Proposed fix (one PR): add EN+TH key pairs for each (`job_marked_paid_toast`, `err_milestone_amount`, `err_progress_entry`, `progress_entry_saved`, `confirm_delete_progress_entry`, `err_amount_first`) and wire each call site through `t()`, matching the app's existing i18n call pattern exactly. MEDIUM: none of these are on client-facing documents (unlike TSK-032), but each hits a real, repeated, core interaction -- worth a normal-backlog i18n-completeness pass ahead of the launch push's stated i18n-completeness goal.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-042</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>MEDIUM</priority>
  <title>api/team-invite.js, api/team-join.js, api/team-members.js: seat-limit and role-authorization logic has no endpoint-level test coverage</title>
  <description>tests/check-team.js exists but only stubs the frontend's `SidekickBackend.teamInvite` call (`__fakeTeamInvite`) -- it verifies the UI calls the right stub function, never the real server-side logic. Untested: api/team-join.js's seat-limit check (`seatsUsed &gt;= owner.team_seats`, :72-76) and the identical check in api/team-invite.js (:54-58); api/team-members.js's role-based delete authorization (:53-64 -- staff blocked entirely from deleting, admin can only remove staff, owner can remove anyone, owner cannot be removed). A regression in either class of check could let a team oversell paid seats (revenue leak) or block a legitimate last-seat join, or let an admin remove another admin/the owner (an authorization escalation), and none of it would be caught by the current battery.</description>
  <researcher_notes>Traced by the test-coverage sweep agent using the "only a direct handler import counts as endpoint coverage" methodology established for TSK-033/034/035 (verified check-team.js's stub pattern directly against tests/README.md's documented convention). Proposed fix (one PR, new tests/test-teams-endpoints.mjs): import all three handlers with a fake `sql`, assert seats-full rejection at exactly the limit, admin-removes-admin rejected, staff-calls-DELETE rejected, owner-can't-remove-self. MEDIUM: no direct money movement, but governs paid-seat entitlement and account-access boundaries with currently zero coverage of the actual server-side enforcement.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-043</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>MEDIUM</priority>
  <title>lib/cors.js has zero unit test despite a documented prior regression in exactly this code</title>
  <description>Grep across tests/ for any reference to lib/cors.js returns nothing -- it is the only lib/*.js file with zero test-file references at all (every other lib helper has either a direct test-*.mjs or is imported by one). Untested logic: `resolveOrigin()` (the CORS origin-allowlist fallback) and `appUrl()` (:43-47, branches between the GitHub-Pages-subpath origin and the Vercel origin, called by both api/billing-checkout.js and api/billing-portal.js to build Stripe redirect URLs). The file's own header comment documents that this exact class of bug already shipped once (a broken post-checkout redirect from success_url/cancel_url/return_url pointing at the wrong origin) -- a regression here would silently reintroduce that same broken redirect, or widen the CORS allowlist to an untrusted origin.</description>
  <researcher_notes>Traced by the test-coverage sweep agent; the "documented prior regression in this exact file" detail is from lib/cors.js's own in-file comment, not inferred. Proposed fix (one PR, new tests/test-cors.mjs, pure Node harness): construct Request objects with various Origin headers and assert resolveOrigin/corsHeaders/appUrl/handlePreflight against the 2-entry allowlist and the GitHub-Pages-subpath branch. MEDIUM: security-adjacent (origin trust boundary) with a concretely documented past incident in this exact code path, currently zero automated coverage.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-044</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>LOW</priority>
  <title>Package delivery money-apportionment logic has two untested branches: saveFastPathDelivery (bulk qty) and savePackage() (manual add form)</title>
  <description>check-service-packages.js thoroughly covers the single-increment `logPackageSession()` apportionment path (`applyPackageRevenue()`, asserting exact amount/netAmount math), but two sibling branches have zero coverage: `saveFastPathDelivery()` (app/app.js:3256-3289, the bulk-quantity "Log delivery" fast path -- a structurally different code path from the tested single-increment one, also calling applyPackageRevenue()) including its overdraft guard `validateFastPathQty()` (:3241-3263, `val &gt; remaining`); and `savePackage()` (app/app.js:5395-5416, the standalone manual "+Add package" form's `total &lt;= 0` / `expiresAt &lt; date` validation guards), which check-service-packages.js never exercises since it only tests the auto-created-on-job-save path.</description>
  <researcher_notes>Traced by the test-coverage sweep agent, cross-referencing check-service-packages.js's actual assertion coverage against both untested branches. Proposed fix (one PR, extends the existing check-service-packages.js): add a case entering a qty exceeding remaining (asserts save disabled + error text) and a valid bulk qty (asserts created job's amount/netAmount/count), plus a small case for savePackage()'s two validation toasts. LOW: same class of risk as the already-well-tested sibling path (money apportionment), but narrower/lower-traffic branches with an established, tested sibling already covering the core math -- a real gap, not urgent.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-045</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>LOW</priority>
  <title>api/booking-availability.js is the only public-GET sibling endpoint with zero rate limiting</title>
  <description>api/booking-availability.js (:27-33, unauthenticated GET, 2 DB queries per hit keyed by a `u=&lt;cuid&gt;` query param) calls no rate-limit check at all, unlike its structurally identical siblings api/shop-public.js (:62) and api/invoice-public.js (:56), both of which gate their unauthenticated GET handlers at `limit: 30, windowMs: 60_000` via lib/rateLimit.js. This is the same "public capability-URL read, two DB queries per hit" shape the codebase's own convention already rate-limits elsewhere -- this one file appears to have simply been missed. Impact is a cheap, unauthenticated, unbounded-rate DB-query amplification vector (scraping every `u=` cuid or hammering one), not data loss or auth bypass -- and lib/rateLimit.js's per-isolate weakness is already a known, accepted limitation project-wide, not itself a new finding.</description>
  <researcher_notes>Traced by the security sweep agent after reading all 37 api/*.js files in full and noticing the inconsistency against the two sibling public-GET endpoints' established pattern. Proposed fix (one line): add `rateLimit(request, {key:'booking-availability', limit:30, windowMs:60_000})` immediately after the preflight check, matching the sibling files exactly. LOW: real gap and inconsistent with the codebase's own convention for this exact endpoint shape, but read-only, low-value target, and rate limiting here is best-effort by design project-wide -- ceiling impact is limited.</researcher_notes>
</task_item>

<task_item>
  <id>TSK-046</id>
  <source>RESEARCHER_SQUAD</source>
  <status>READY_FOR_PM</status>
  <priority>LOW</priority>
  <title>Secondary-screen hardcoded English toasts: docgen.js, followups.js, portfolio.js, research.js</title>
  <description>Beyond the core-flow toasts in TSK-041, four lower-traffic modules have hardcoded, unlocalized English toast()/confirm() strings with no i18n dictionary coverage at all -- 34 literal strings total across the four files, unlike the fully i18n-passed bookings.js/invoices.js: app/docgen.js (11, including form-validation errors like "Add at least one line item..." at :576 and "Please fix the highlighted fields." at :734/753, hit whenever a quote/invoice/contract fails validation); app/followups.js (7, e.g. "Snoozed for 7 days"/"Dismissed"/"Restored to follow-ups" at :171/177/183, surfaced off the Home/Today card); app/portfolio.js (8, including :198's "Image too large -- please pick one under 2MB", which duplicates an ALREADY-EXISTING EN+TH key `image_too_large` at app/i18n.js:404/916 -- a straight copy-paste miss, not a missing translation); app/research.js (7, e.g. "Premium unlocked on this device" at :287).</description>
  <researcher_notes>Traced by the i18n sweep agent via per-file literal-string grepping cross-checked against the dictionary. Proposed fix, split by file since each is independently scoped and low-urgency: docgen.js's form-validation strings lean toward the higher end of this LOW tier since users hit them whenever document validation fails (worth doing first if this item is picked up); portfolio.js's duplicate string is the cheapest fix in this whole cycle's findings (delete the literal, reuse the existing `image_too_render` key via `t()`); followups.js/research.js are occasional-use screens. LOW/normal-backlog: none of these are on client-facing documents or high-frequency flows, but collectively represent the last remaining gap in the app's stated EN+TH completeness goal -- recommend Engineer-Squad split this into per-file follow-on PRs rather than one large sweep, since the four files are unrelated to each other.</researcher_notes>
</task_item>

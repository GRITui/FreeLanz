# Sidekickz — Claude Code notes

## Shared knowledge base

Cross-repo tech-stack/feature/module/known-issue knowledge for the whole GRITui project family is maintained in [`GRITui/grit-lib`](https://github.com/GRITui/grit-lib), specifically [`knowledge/sidekickz/README.md`](https://github.com/GRITui/grit-lib/blob/main/knowledge/sidekickz/README.md) for this repo. Consult it before starting new work, and update it when this repo's tech stack, features, or known-issues change meaningfully.

> Note: `grit-lib` may be private — the link 404s for anyone without access.
> If you can't reach it, treat this repo's own docs (`.env.example`,
> `tests/README.md`, the header comments in `api/*` and `lib/*`) as the
> source of truth; they are kept unusually thorough for exactly that reason.

## Priority labels (required on every new issue & PR)

Attach exactly ONE priority label when opening an issue or PR:

- `P0` — critical: prod broken, security, data loss
- `P1` — high: blocks release or next milestone
- `P2` — medium: normal backlog work (default when unsure)
- `P3` — low: nice-to-have, cleanup
- `P4` — someday/maybe: no current plan

Branch prefixes `grade-a…grade-e` still map a=P0 … e=P4, but the explicit
label wins when both exist. The GRIT status board's Scrumban view sorts by
these labels. When torn between two levels, choose the lower one and explain
in the issue body.

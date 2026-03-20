# Planning Folder Refactor

**Date:** 2026-03-18
**Status:** Approved

## Problem

1. **Discoverability** — Hard to find a specific PR's plan in the long single `PLANNING.md` file
2. **Context efficiency** — Claude loads entire PLANNING.md when only the current branch's plan matters
3. **Structural alignment** — Linear issues, PRs, and planning docs lack clear linkage

## Solution

Replace the single `PLANNING.md` with a `planning/` folder containing one file per Linear issue.

## Folder Structure

```
planning/
  TRA-200.md
  TRA-203.md
  TRA-205.md
  ...
```

Delete `PLANNING.md` at root — the single file is replaced by the folder.

## File Naming Convention

- File is named by Linear issue ID: `TRA-XXX.md`
- Issue ID is the stable identifier — created first, used in branch name, referenced in PR title
- PR number is metadata inside the file, not the filename

## File Template

Each `planning/TRA-XXX.md` follows this structure:

```markdown
# TRA-XXX — <Short title>

**Linear:** [TRA-XXX](https://linear.app/travyl/issue/TRA-XXX/...)
**PR:** [#NNN](https://github.com/TravylApp/travyl-frontend/pull/NNN) (or "pending")
**Status:** <Planning | In Progress | In Review | Merged | Shipped>
**Branch:** `feature/tra-XXX`

## Goal
<1-2 sentence description of what this feature/change accomplishes>

## Completed
- <bullet list of completed work items>

## Known Issues / Deferred
- <bullet list of deferred items or known issues>
```

### Status Values

| Status | Meaning |
|--------|---------|
| Planning | Issue created, brainstorming/spec in progress |
| In Progress | Branch created, actively implementing |
| In Review | PR opened, awaiting review |
| Merged | PR merged to main |
| Shipped | Deployed to production |

## CLAUDE.md Updates

### Update Session Start Instructions

Replace:

```markdown
## At the start of each session

Read these three files before doing anything else:
- `PLATFORM.md` — what the product is and who it's for
- `ARCHITECTURE.md` — tech stack, data layer, DB schema, conventions
- `PLANNING.md` — active branch log and current work
```

With:

```markdown
## At the start of each session

Read these files before doing anything else:
- `PLATFORM.md` — what the product is and who it's for
- `ARCHITECTURE.md` — tech stack, data layer, DB schema, conventions
- `planning/TRA-XXX.md` — current branch's planning file (match issue ID from branch name)
```

### Add Planning Files Section

Add after the Branch + Linear convention section:

```markdown
## Planning files

Each Linear issue has a planning file at `planning/TRA-XXX.md`. When starting a new feature:

1. Create the Linear issue in the Travyl workspace
2. Create `planning/TRA-XXX.md` from the template
3. Name the branch `feature/tra-XXX`

The planning file tracks: goal, completed work, known issues, and links to Linear + PR.
```

## Migration Steps

1. Create `planning/` folder
2. Split current `PLANNING.md` entries into individual files:
   - `planning/TRA-200.md` (calendar + Supabase + Yjs)
   - `planning/TRA-205.md` (For You Panel)
3. Delete root `PLANNING.md`
4. Update `CLAUDE.md` with new instructions

**Note:** Active branches without planning content (e.g., TRA-203) will have their planning files created when work starts on them.

## Benefits

- **O(1) lookup** — Find plan by issue ID directly
- **Smaller context** — Claude loads only the relevant planning file
- **Clear linkage** — Issue → Branch → PR → Planning file all tied together
- **Independent history** — Each plan has its own git history

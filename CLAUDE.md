# Travyl Frontend

Collaborative travel planning app — web (Next.js) + mobile (Expo), shared backend on Supabase.

## At the start of each session

Read these files before doing anything else:
- `PLATFORM.md` — what the product is and who it's for
- `ARCHITECTURE.md` — tech stack, data layer, DB schema, conventions
- `planning/TRA-XXX.md` — current branch's planning file (match issue ID from branch name; create if missing)

## Monorepo layout

```
travyl-frontend/
├── apps/web/          # Next.js 16 web app (@travyl/web)
├── apps/mobile/       # Expo 54 mobile app (@travyl/mobile)
└── packages/shared/   # Shared types, hooks, services, utils (@travyl/shared)
```

## Key commands

```bash
npm run web          # Start web dev server (apps/web)
npm run mobile       # Start Expo (apps/mobile)
npm run typecheck    # Typecheck all workspaces
npm run lint         # Lint all workspaces
cd packages/shared && npm test  # Run shared package tests
```

## Branch + Linear convention

**Before starting any feature:**
1. Create a Linear issue in the Travyl workspace
2. Name the branch `feature/<issue-id>` (e.g. `feature/tra-200`)
3. Claude will look up the issue via Linear MCP for context

This applies before invoking `/brainstorm`. No Linear issue = no new branch.

## Planning files

Each Linear issue has a planning file at `planning/TRA-XXX.md`. When starting a new feature:

1. Create the Linear issue in the Travyl workspace
2. Create `planning/TRA-XXX.md` from the template
3. Name the branch `feature/tra-XXX`

The planning file tracks: goal, completed work, known issues, and links to Linear + PR.

# Travyl — Command Reference

## Install Dependencies

```bash
# Web app (from apps/web/)
cd apps/web && npm install

# Mobile app (from apps/mobile/)
cd apps/mobile && npx expo install

# Add a package to web
cd apps/web && npm install <package>

# Add a dev dependency to shared
cd packages/shared && yarn add -D <package>
```

## Run

```bash
# Web app (Next.js)
cd apps/web && npm run dev

# Mobile app (Expo)
cd apps/mobile && npx expo start
```

## Test

```bash
# Run all shared tests (single run)
cd packages/shared && yarn test

# Watch mode (re-runs on file changes)
cd packages/shared && yarn test:watch
```

## Type Check

```bash
cd packages/shared && npx tsc --noEmit
```

## Supabase — Inspect & Debug

```bash
# Table stats (row counts, sizes)
npx supabase inspect db table-stats

# Check index usage
npx supabase inspect db index-usage

# See active locks
npx supabase inspect db locks

# Check RLS policies
npx supabase inspect db policies
```

## Supabase — Database Management

```bash
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# Check status
npx supabase status

# Generate TypeScript types from local schema
npx supabase gen types typescript --local > types.ts

# Generate TypeScript types from remote project
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types.ts
```

## Supabase — Migrations

```bash
# Create a new migration
npx supabase migration new migration_name

# Apply migrations locally (resets DB)
npx supabase db reset

# Push migrations to remote
npx supabase db push

# Pull remote schema changes
npx supabase db pull
```

## Supabase — Auth & Project

```bash
# Link to remote project
npx supabase link --project-ref YOUR_PROJECT_REF

# List projects
npx supabase projects list
```

## Other

```bash
# Regenerate the PowerPoint presentation
cd "Itinerary Page" && python3 generate_pptx.py
```

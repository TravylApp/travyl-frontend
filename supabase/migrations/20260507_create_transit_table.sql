-- Create transit table for ground transportation segments
-- Follows the flights pattern: JSONB data column, dedicated table

create table if not exists transit (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references profiles(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists transit_trip_id_idx on transit(trip_id);

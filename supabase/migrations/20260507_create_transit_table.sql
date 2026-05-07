-- Create transit table for ground transportation segments
-- Follows the flights pattern: JSONB data column, dedicated table

create table if not exists transit (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_transit_trip on transit(trip_id);

alter table transit enable row level security;

create policy "Users can view their trip transit"
  on transit for select
  using (trip_id in (select id from trips where user_id = auth.uid()));

create policy "Users can insert transit to their trips"
  on transit for insert
  with check (trip_id in (select id from trips where user_id = auth.uid()));

create policy "Users can update transit on their trips"
  on transit for update
  using (trip_id in (select id from trips where user_id = auth.uid()));

create policy "Users can delete transit from their trips"
  on transit for delete
  using (trip_id in (select id from trips where user_id = auth.uid()));

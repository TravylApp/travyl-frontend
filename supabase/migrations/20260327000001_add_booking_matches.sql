create table booking_matches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  activity_id text not null,
  provider text,
  matched_name text,
  booking_url text,
  affiliate_url text,
  confidence float,
  status text not null default 'unmatched',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_matches_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint booking_matches_status_values check (status in ('unmatched', 'matched', 'opened')),
  constraint booking_matches_trip_activity_key unique (trip_id, activity_id)
);

create or replace function set_booking_matches_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger booking_matches_updated_at
  before update on booking_matches
  for each row execute function set_booking_matches_updated_at();

alter table booking_matches enable row level security;

-- INSERT: no policy defined. The book.ts Lambda writes via the Supabase service role key,
-- which bypasses RLS entirely. Authenticated browser clients have no INSERT access by design.

create policy "booking_matches_select"
  on booking_matches for select
  using (
    trip_id in (
      select id from trips where user_id = auth.uid()
      union
      select trip_id from trip_collaborators where user_id = auth.uid() and invite_status = 'accepted'
    )
  );

-- UPDATE: authenticated browser clients may only transition status to 'opened'.
-- The `with check (status = 'opened')` clause enforces this — any attempt to set
-- status to 'matched' or 'unmatched' via a client session will be rejected.
create policy "booking_matches_update_opened"
  on booking_matches for update
  using (
    trip_id in (
      select id from trips where user_id = auth.uid()
      union
      select trip_id from trip_collaborators where user_id = auth.uid() and invite_status = 'accepted'
    )
  )
  with check (status = 'opened');

alter publication supabase_realtime add table booking_matches;

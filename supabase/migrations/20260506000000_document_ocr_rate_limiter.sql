-- Rate limiter for Document OCR uploads
--
-- Tracks per-minute (10 req) and per-day (50 req) limits per user.
-- Uses a simple counter table with TTL-style expiry via the RPC function.

create table if not exists rate_limits (
  id bigint primary key generated always as identity,
  counter_key text not null unique,
  count integer not null default 0,
  expires_at timestamptz not null
);

-- Indices for cleanup queries
create index if not exists idx_rate_limits_key on rate_limits (counter_key);
create index if not exists idx_rate_limits_expires on rate_limits (expires_at);

/**
 * Increments a rate-limit counter by 1.
 *
 * If the key doesn't exist or the existing entry has expired, creates/resets it
 * with count=1 and the given expiry_seconds.
 *
 * Returns the new count so the caller can compare against thresholds.
 *
 * Usage:
 *   select increment_counter('documents:minute:<user_id>', 70);  -- 70 second window
 *   select increment_counter('documents:day:<user_id>', 86400);   -- 24 hour window
 */
create or replace function increment_counter(counter_key text, expiry_seconds int)
returns int
language plpgsql
security definer
as $$
declare
  current_count int;
begin
  insert into rate_limits (counter_key, count, expires_at)
  values (counter_key, 1, now() + (expiry_seconds || ' seconds')::interval)
  on conflict (counter_key) do update
    set count = case
      when rate_limits.expires_at < now() then 1
      else rate_limits.count + 1
    end,
    expires_at = case
      when rate_limits.expires_at < now() then now() + (expiry_seconds || ' seconds')::interval
      else rate_limits.expires_at
    end
  returning count into current_count;

  return current_count;
end;
$$;

-- Allow authenticated users to call this RPC
grant execute on function increment_counter to authenticated;

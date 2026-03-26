-- Enable Supabase Realtime Postgres Changes for the activity table.
-- Required for cross-client activity sync via postgres_changes subscription
-- in useYjsSync. Without this, INSERT/UPDATE/DELETE events on activity rows
-- are never broadcast to subscribed clients.
ALTER PUBLICATION supabase_realtime ADD TABLE activity;

-- supabase/migrations/20260325000001_yjs_documents_content_jsonb.sql
-- Change yjs_documents.content from bytea to jsonb.
--
-- PostgREST serialises Uint8Array as a JSON number array (e.g. [1,2,3]).
-- bytea cannot accept that via PostgREST — upserts silently failed and
-- documents were never persisted, so every client started from empty state.
-- jsonb natively stores the number array, so upserts now succeed.

-- 1. Drop any existing default first (bytea default '\x' cannot auto-cast).
ALTER TABLE yjs_documents ALTER COLUMN content DROP DEFAULT;

-- 2. Retype the column. Existing rows get NULL (none expected in production).
ALTER TABLE yjs_documents
  ALTER COLUMN content TYPE jsonb
  USING null;

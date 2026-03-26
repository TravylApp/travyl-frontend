-- supabase/migrations/20260326000004_yjs_documents_y_supabase.sql
-- Adapt yjs_documents for @supabase-labs/y-supabase library.
-- The library stores base64-encoded Yjs state in a text column, keyed by room name.
-- Table had zero rows so this is a safe schema change.

-- 1. Rename id → room to match library default
ALTER TABLE yjs_documents RENAME COLUMN id TO room;

-- 2. Drop old jsonb content column, add text state column
ALTER TABLE yjs_documents DROP COLUMN content;
ALTER TABLE yjs_documents ADD COLUMN state text;

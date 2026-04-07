-- supabase/migrations/20260326000006_fix_yjs_documents_rls.sql
-- Fix RLS policies on yjs_documents after column rename id→room.
-- The room value has format 'trip:{uuid}', so extract the trip UUID via substr.

-- Drop all existing yjs_documents policies that reference the old 'id' column.
DROP POLICY IF EXISTS "collaborators_select_yjs" ON yjs_documents;
DROP POLICY IF EXISTS "editors_upsert_yjs" ON yjs_documents;
DROP POLICY IF EXISTS "editors_update_yjs" ON yjs_documents;
DROP POLICY IF EXISTS "public_read_link_trips_yjs" ON yjs_documents;

-- Recreate SELECT policy: trip collaborators can read
CREATE POLICY "collaborators_select_yjs"
  ON yjs_documents FOR SELECT
  TO authenticated
  USING (public.is_trip_collaborator(substr(room, 6)::uuid));

-- Recreate INSERT policy: trip editors can insert
CREATE POLICY "editors_upsert_yjs"
  ON yjs_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_editor(substr(room, 6)::uuid));

-- Recreate UPDATE policy: trip editors can update
CREATE POLICY "editors_update_yjs"
  ON yjs_documents FOR UPDATE
  TO authenticated
  USING (public.is_trip_editor(substr(room, 6)::uuid))
  WITH CHECK (public.is_trip_editor(substr(room, 6)::uuid));

-- Recreate public read policy for link-shared trips
CREATE POLICY "public_read_link_trips_yjs"
  ON yjs_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id::text = substr(yjs_documents.room, 6)
        AND trips.visibility = 'link'
    )
  );

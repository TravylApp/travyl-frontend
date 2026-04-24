-- Fix RLS policies for shared link users to modify activities
-- Users who access trips via shared links (visibility='link') should be able to
-- insert, update, and delete activities, not just read them.

-- Helper function to check if a trip is shared via link
CREATE OR REPLACE FUNCTION public.is_trip_shared_link(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips
    WHERE id = p_trip_id
      AND visibility = 'link'
  )
$$;

-- Allow shared link users to insert activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity'
      AND policyname = 'shared_link_users_insert_activity'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "shared_link_users_insert_activity"
        ON activity FOR INSERT
        TO authenticated
        WITH CHECK (public.is_trip_shared_link(trip_id))
    $policy$;
  END IF;
END$$;

-- Allow shared link users to update activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity'
      AND policyname = 'shared_link_users_update_activity'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "shared_link_users_update_activity"
        ON activity FOR UPDATE
        TO authenticated
        USING (public.is_trip_shared_link(trip_id))
        WITH CHECK (public.is_trip_shared_link(trip_id))
    $policy$;
  END IF;
END$$;

-- Allow shared link users to delete activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity'
      AND policyname = 'shared_link_users_delete_activity'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "shared_link_users_delete_activity"
        ON activity FOR DELETE
        TO authenticated
        USING (public.is_trip_shared_link(trip_id))
    $policy$;
  END IF;
END$$;

-- Allow shared link users to upsert Yjs documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'yjs_documents'
      AND policyname = 'shared_link_users_upsert_yjs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "shared_link_users_upsert_yjs"
        ON yjs_documents FOR INSERT
        TO authenticated
        WITH CHECK (public.is_trip_shared_link(id::uuid))
    $policy$;
  END IF;
END$$;

-- Allow shared link users to update Yjs documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'yjs_documents'
      AND policyname = 'shared_link_users_update_yjs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "shared_link_users_update_yjs"
        ON yjs_documents FOR UPDATE
        TO authenticated
        USING (public.is_trip_shared_link(id::uuid))
        WITH CHECK (public.is_trip_shared_link(id::uuid))
    $policy$;
  END IF;
END$$;

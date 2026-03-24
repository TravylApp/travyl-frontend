-- supabase/migrations/20260323000000_shared_calendar_rls.sql
-- Allow any authenticated user (including anonymous) to SELECT from
-- activity and yjs_documents when the parent trip has visibility='link'.

-- Activity: public read for link-shared trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity'
      AND policyname = 'public_read_link_trips_activity'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "public_read_link_trips_activity"
        ON activity FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = activity.trip_id
              AND trips.visibility = 'link'
          )
        )
    $policy$;
  END IF;
END$$;

-- yjs_documents: public read for link-shared trips
-- Note: yjs_documents.id is text (trip_id as key); trips.id is uuid — explicit cast required.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'yjs_documents'
      AND policyname = 'public_read_link_trips_yjs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "public_read_link_trips_yjs"
        ON yjs_documents FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id::text = yjs_documents.id
              AND trips.visibility = 'link'
          )
        )
    $policy$;
  END IF;
END$$;

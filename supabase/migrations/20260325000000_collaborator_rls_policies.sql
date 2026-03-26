-- supabase/migrations/20260325000000_collaborator_rls_policies.sql
-- RLS policies for trip collaborators.
-- Uses SECURITY DEFINER helper functions to avoid infinite recursion that
-- would occur if policies on `trips` and `trip_collaborators` reference each other.

-- ── Helper functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_trip_collaborator(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_collaborators
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
      AND invite_status = 'accepted'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_trip_editor(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_collaborators
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
      AND invite_status = 'accepted'
      AND role_type = 'editor'
  )
$$;

-- ── trips: collaborators can read trips they are accepted on ────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trips'
      AND policyname = 'collaborators_select_trips'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "collaborators_select_trips"
        ON trips FOR SELECT
        TO authenticated
        USING (public.is_trip_collaborator(id))
    $policy$;
  END IF;
END$$;

-- ── activity: collaborators can read activities for their trips ─────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity'
      AND policyname = 'collaborators_select_activity'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "collaborators_select_activity"
        ON activity FOR SELECT
        TO authenticated
        USING (public.is_trip_collaborator(trip_id))
    $policy$;
  END IF;
END$$;

-- ── activity: editors can update activities ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity'
      AND policyname = 'editors_update_activity'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "editors_update_activity"
        ON activity FOR UPDATE
        TO authenticated
        USING (public.is_trip_editor(trip_id))
        WITH CHECK (public.is_trip_editor(trip_id))
    $policy$;
  END IF;
END$$;

-- ── activity: editors can delete activities ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity'
      AND policyname = 'editors_delete_activity'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "editors_delete_activity"
        ON activity FOR DELETE
        TO authenticated
        USING (public.is_trip_editor(trip_id))
    $policy$;
  END IF;
END$$;

-- ── activity: editors can insert activities ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity'
      AND policyname = 'editors_insert_activity'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "editors_insert_activity"
        ON activity FOR INSERT
        TO authenticated
        WITH CHECK (public.is_trip_editor(trip_id))
    $policy$;
  END IF;
END$$;

-- ── yjs_documents: collaborators can read Yjs state ────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'yjs_documents'
      AND policyname = 'collaborators_select_yjs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "collaborators_select_yjs"
        ON yjs_documents FOR SELECT
        TO authenticated
        USING (public.is_trip_collaborator(id::uuid))
    $policy$;
  END IF;
END$$;

-- ── yjs_documents: editors can upsert Yjs state ────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'yjs_documents'
      AND policyname = 'editors_upsert_yjs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "editors_upsert_yjs"
        ON yjs_documents FOR INSERT
        TO authenticated
        WITH CHECK (public.is_trip_editor(id::uuid))
    $policy$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'yjs_documents'
      AND policyname = 'editors_update_yjs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "editors_update_yjs"
        ON yjs_documents FOR UPDATE
        TO authenticated
        USING (public.is_trip_editor(id::uuid))
        WITH CHECK (public.is_trip_editor(id::uuid))
    $policy$;
  END IF;
END$$;

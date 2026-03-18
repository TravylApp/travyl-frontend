-- supabase/migrations/20260317000000_trip_sharing.sql

-- 1. Extend trips with sharing columns
--    (is_shared, share_link_role, is_public never existed in this DB — DROP IF EXISTS are safe no-ops)
ALTER TABLE trips
  DROP COLUMN IF EXISTS is_shared,
  DROP COLUMN IF EXISTS share_link_role,
  DROP COLUMN IF EXISTS is_public,
  ADD COLUMN IF NOT EXISTS share_link_token text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'link', 'public')),
  ADD COLUMN IF NOT EXISTS link_permission text NOT NULL DEFAULT 'view'
    CHECK (link_permission IN ('view', 'comment', 'edit'));

-- Ensure share_link_token is unique (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trips_share_link_token_key'
      AND conrelid = 'public.trips'::regclass
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_share_link_token_key UNIQUE (share_link_token);
  END IF;
END$$;

-- 2. Extend trips RLS: any user can read link/public trips.
--    Existing SELECT policy covers owner only; this additive policy covers shared trips.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trips' AND policyname = 'trips_select_shared'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "trips_select_shared"
        ON trips FOR SELECT
        USING (visibility IN ('link', 'public'))
    $policy$;
  END IF;
END$$;

-- 3. Relax trip_collaborators.user_id for pending invites (no user account yet)
ALTER TABLE trip_collaborators
  ALTER COLUMN user_id DROP NOT NULL;

-- Replace role_type check: old = ('viewer','editor','owner'), new = ('viewer','commenter','editor')
ALTER TABLE trip_collaborators
  DROP CONSTRAINT IF EXISTS trip_collaborators_role_type_check;
ALTER TABLE trip_collaborators
  ADD CONSTRAINT trip_collaborators_role_type_check
  CHECK (role_type IN ('viewer', 'commenter', 'editor'));

-- Replace invite_status check: old = ('pending','accepted','denied'), new = ('pending','accepted','cancelled')
ALTER TABLE trip_collaborators
  DROP CONSTRAINT IF EXISTS trip_collaborators_invite_status_check;
ALTER TABLE trip_collaborators
  ADD CONSTRAINT trip_collaborators_invite_status_check
  CHECK (invite_status IN ('pending', 'accepted', 'cancelled'));

-- Unique invite tokens (column already exists as nullable text, idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trip_collaborators_invite_token_key'
      AND conrelid = 'public.trip_collaborators'::regclass
  ) THEN
    ALTER TABLE trip_collaborators ADD CONSTRAINT trip_collaborators_invite_token_key UNIQUE (invite_token);
  END IF;
END$$;

-- 4. trip_notes table — post-it notes pinned to calendar days
CREATE TABLE IF NOT EXISTS trip_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_id uuid        REFERENCES activity(id) ON DELETE SET NULL,
  day         date        NOT NULL,
  pos_x       numeric     NOT NULL DEFAULT 0.5,
  pos_y       numeric     NOT NULL DEFAULT 0.5,
  content     text        NOT NULL DEFAULT '',
  color       text        NOT NULL DEFAULT '#ffd93d',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trip_notes ENABLE ROW LEVEL SECURITY;

-- trip owners and accepted collaborators can read notes; link/public trips too
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trip_notes' AND policyname = 'trip_notes_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "trip_notes_select" ON trip_notes
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM trips t WHERE t.id = trip_notes.trip_id AND (
              t.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM trip_collaborators tc
                WHERE tc.trip_id = t.id AND tc.user_id = auth.uid() AND tc.invite_status = 'accepted'
              )
              OR t.visibility IN ('link', 'public')
            )
          )
        )
    $policy$;
  END IF;
END$$;

-- only trip owners and accepted commenter/editor collaborators (or link/public with comment/edit) can insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trip_notes' AND policyname = 'trip_notes_insert'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "trip_notes_insert" ON trip_notes
        FOR INSERT WITH CHECK (
          user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM trips t WHERE t.id = trip_notes.trip_id AND (
              t.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM trip_collaborators tc
                WHERE tc.trip_id = t.id AND tc.user_id = auth.uid()
                  AND tc.invite_status = 'accepted'
                  AND tc.role_type IN ('commenter', 'editor')
              )
              OR (t.visibility IN ('link', 'public') AND t.link_permission IN ('comment', 'edit'))
            )
          )
        )
    $policy$;
  END IF;
END$$;

-- only the note author can update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trip_notes' AND policyname = 'trip_notes_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "trip_notes_update" ON trip_notes
        FOR UPDATE USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid())
    $policy$;
  END IF;
END$$;

-- note author or trip owner can delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trip_notes' AND policyname = 'trip_notes_delete'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "trip_notes_delete" ON trip_notes
        FOR DELETE USING (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM trips t WHERE t.id = trip_notes.trip_id AND t.user_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END$$;

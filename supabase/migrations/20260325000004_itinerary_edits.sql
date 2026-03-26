-- supabase/migrations/20260325000004_itinerary_edits.sql
-- Create itinerary_edits table for audit logging of calendar changes

-- Create base table
CREATE TABLE IF NOT EXISTS itinerary_edits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  activity_id   uuid NOT NULL,
  edit_type     text NOT NULL,  -- 'create' | 'delete' | 'move' | 'edit' | 'revert'
  original_data jsonb,
  new_data      jsonb,
  user_id       uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX itinerary_edits_trip_id_idx ON itinerary_edits (trip_id, created_at DESC);

ALTER TABLE itinerary_edits ENABLE ROW LEVEL SECURITY;

-- Trip owners and accepted collaborators can read edits
CREATE POLICY "Collaborators can read itinerary edits"
  ON itinerary_edits FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators
      WHERE user_id = auth.uid() AND invite_status = 'accepted'
    )
  );

-- Users can only insert their own edits
CREATE POLICY "Users insert own edits"
  ON itinerary_edits FOR INSERT
  WITH CHECK (user_id = auth.uid());

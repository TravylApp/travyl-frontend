-- Fix RLS policies for trip_collaborators table
-- Users need to read their own collaboration records for the join to work

-- Enable RLS on trip_collaborators if not already enabled
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_can_read_own_collaborations" ON trip_collaborators;
DROP POLICY IF EXISTS "users_can_insert_own_collaborations" ON trip_collaborators;

-- Users can read their own collaboration records
CREATE POLICY "users_can_read_own_collaborations"
  ON trip_collaborators FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own collaboration records (for joining via link)
CREATE POLICY "users_can_insert_own_collaborations"
  ON trip_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trip owners can read all collaboration records for their trips
CREATE POLICY "owners_can_read_trip_collaborations"
  ON trip_collaborators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_collaborators.trip_id
        AND trips.user_id = auth.uid()
    )
  );

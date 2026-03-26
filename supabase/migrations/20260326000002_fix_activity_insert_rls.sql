-- Fix activity INSERT RLS policy to require trip ownership or editor role.
-- Previously "Users can insert activities" only checked auth.uid() = user_id,
-- which allowed any authenticated user (including viewers) to insert activities
-- into trips they have no write access to.

DROP POLICY IF EXISTS "Users can insert activities" ON activity;

CREATE POLICY "Users can insert activities"
  ON activity FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND user_id = auth.uid())
      OR public.is_trip_editor(trip_id)
    )
  );

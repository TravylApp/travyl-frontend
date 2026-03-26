-- Trip owners must be able to update and delete ANY activity in their trips,
-- even activities created by collaborators (different user_id on the row).
-- Without these policies the owner's Yjs flush fails with an RLS USING expression
-- error when upserting activities that an editor originally inserted.

CREATE POLICY "Trip owners can update any activity"
  ON activity FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Trip owners can delete any activity"
  ON activity FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND user_id = auth.uid())
  );

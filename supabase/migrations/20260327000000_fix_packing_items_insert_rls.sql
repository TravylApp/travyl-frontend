-- Fix: packing_items and packing_audit_log INSERT policies were rejecting inserts
-- on trips with user_id = NULL (orphan trips created before auth was wired).
--
-- Root cause: "Trip members can add packing items" required auth.uid() = user_id,
-- which is impossible when trips.user_id IS NULL. The trips have no owner and no
-- entries in trip_collaborators, so the is_trip_editor() helper also returned false.
--
-- Fix: add an explicit branch that allows inserts on orphan trips (trips where
-- trips.user_id IS NULL) — these trips have no ownership model to protect anyway.

-- ── packing_items ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Trip members can add packing items" ON packing_items;

CREATE POLICY "Trip members can add packing items"
  ON packing_items FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- Normal case: user is the item creator AND their trip is owned or collaborated
      (auth.uid() = user_id)
      AND
      (trip_id IN (
        SELECT id FROM trips WHERE user_id = auth.uid()
        UNION
        SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND invite_status = 'accepted'
      ))
    )
    OR
    (
      -- Orphan trips (user_id IS NULL): allow any authenticated user to insert.
      -- These trips have no established owner, so no ownership constraint to enforce.
      (user_id IS NULL)
      AND
      (EXISTS (SELECT 1 FROM trips WHERE trips.id = packing_items.trip_id AND trips.user_id IS NULL))
    )
  );

-- ── packing_audit_log ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "packing_audit_log_insert" ON packing_audit_log;

CREATE POLICY "packing_audit_log_insert"
  ON packing_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- Normal case: user owns the trip
      EXISTS (SELECT 1 FROM trips WHERE trips.id = packing_audit_log.trip_id AND trips.user_id = auth.uid())
    )
    OR
    (
      -- Orphan trips (no owner): allow any authenticated user
      EXISTS (SELECT 1 FROM trips WHERE trips.id = packing_audit_log.trip_id AND trips.user_id IS NULL)
    )
    OR
    (
      -- Trip has an owner but user is an editor (collaborator with editor role)
      is_trip_editor(packing_audit_log.trip_id)
    )
  );

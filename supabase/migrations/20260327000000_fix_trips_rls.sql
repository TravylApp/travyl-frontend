-- Fix trips RLS: remove overly-broad public policies that leak all shared/public trips
-- to every authenticated user, and tighten anonymous insert access.

-- 1. Drop trips_select_shared — any auth user sees ALL link/public trips.
--    trips_select_by_share_token already handles share-link access correctly
--    (requires matching share_link_token via current_share_token()).
--    Collaborators access trips via "Collaborators can select trips" policy.
DROP POLICY IF EXISTS "trips_select_shared" ON trips;

-- 2. Drop trips_insert_public — WITH CHECK true lets anyone insert any trip.
--    Replace with policy that only allows inserts where user_id IS NULL
--    (anonymous creates from savePlanToSupabase via the web planner).
DROP POLICY IF EXISTS "trips_insert_public" ON trips;

CREATE POLICY "trips_insert_anonymous"
  ON trips FOR INSERT
  TO authenticated, anon
  WITH CHECK (user_id IS NULL);

-- 3. Drop trips_delete_public — anyone could delete public trips.
--    "Users can delete their own trips" already covers owner deletes.
DROP POLICY IF EXISTS "trips_delete_public" ON trips;

-- 4. Drop trips_update_context_public — anyone could update public trips.
--    "Users can update their own trips" already covers owner updates.
--    Collaborator editors are covered by "editors_update_*" policies on child tables.
DROP POLICY IF EXISTS "trips_update_context_public" ON trips;

-- 5. Fix existing anonymous-created trips: set visibility from 'public' to 'private'.
--    These are accessed via /api/trips?ids=... with service key, not RLS.
UPDATE trips
SET visibility = 'private'
WHERE visibility = 'public'
  AND user_id IS NULL;

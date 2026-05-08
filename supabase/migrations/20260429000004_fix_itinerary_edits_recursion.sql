-- Fix infinite recursion in itinerary_edits SELECT policy
-- The previous policy directly queried trip_collaborators, which has its own policies
-- that might loop back. Using SECURITY DEFINER functions breaks the loop.

-- 1. Ensure we have a helper for owner check
CREATE OR REPLACE FUNCTION public.is_trip_owner(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips
    WHERE id = p_trip_id
      AND user_id = auth.uid()
  )
$$;

DROP POLICY IF EXISTS "Collaborators can read itinerary edits" ON itinerary_edits;

CREATE POLICY "Collaborators can read itinerary edits"
  ON itinerary_edits FOR SELECT
  TO authenticated
  USING (
    public.is_trip_owner(trip_id)
    OR
    public.is_trip_collaborator(trip_id)
  );

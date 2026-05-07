-- Editors (accepted trip_collaborators with role_type='editor') need write
-- access to flights, hotels, and the trip_context JSONB on trips (where cars
-- and user_history are stored). The existing policies only allow the trip
-- owner, so the share/calendar UI silently 403s for invited collaborators.

-- ── flights ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Editors can manage flights" ON public.flights;
CREATE POLICY "Editors can manage flights"
  ON public.flights
  FOR ALL
  TO authenticated
  USING (public.is_trip_editor(trip_id))
  WITH CHECK (public.is_trip_editor(trip_id));

-- ── hotels ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Editors can manage hotels" ON public.hotels;
CREATE POLICY "Editors can manage hotels"
  ON public.hotels
  FOR ALL
  TO authenticated
  USING (public.is_trip_editor(trip_id))
  WITH CHECK (public.is_trip_editor(trip_id));

-- ── trips: editors can update, but only safe columns ─────────────────────
-- Trigger guards columns RLS can't easily protect (RLS WITH CHECK only sees
-- the NEW row, not OLD; we need OLD-vs-NEW comparison to lock down owner /
-- visibility / share-token / link-permission so an editor can't take over
-- the trip or flip it public via direct API write.
CREATE OR REPLACE FUNCTION public.trips_block_editor_owner_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Owner is unrestricted.
  IF auth.uid() = OLD.user_id THEN
    RETURN NEW;
  END IF;

  -- Service role / no auth context: leave alone (e.g., backend writes).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Beyond this point: the actor is a non-owner authenticated user who
  -- only got past RLS via the editor policy. Block any change to the
  -- owner-only columns.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Editors cannot change trip owner';
  END IF;
  IF NEW.visibility IS DISTINCT FROM OLD.visibility THEN
    RAISE EXCEPTION 'Editors cannot change trip visibility';
  END IF;
  IF NEW.share_link_token IS DISTINCT FROM OLD.share_link_token THEN
    RAISE EXCEPTION 'Editors cannot rotate share-link token';
  END IF;
  IF NEW.link_permission IS DISTINCT FROM OLD.link_permission THEN
    RAISE EXCEPTION 'Editors cannot change link permission';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trips_block_editor_owner_columns ON public.trips;
CREATE TRIGGER trips_block_editor_owner_columns
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.trips_block_editor_owner_columns();

DROP POLICY IF EXISTS "Editors can update trip context" ON public.trips;
CREATE POLICY "Editors can update trip context"
  ON public.trips
  FOR UPDATE
  TO authenticated
  USING (public.is_trip_editor(id))
  WITH CHECK (public.is_trip_editor(id));

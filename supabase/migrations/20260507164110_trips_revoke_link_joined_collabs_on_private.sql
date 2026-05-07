-- When the owner flips a trip from a shared visibility back to 'private',
-- revoke access for users who only joined via the link (i.e. self-invited
-- through the share-page "Sign in to edit" flow). These rows are identifiable
-- by `invited_by = user_id` because join_trip_via_link sets the inviter to
-- the joiner themselves. Owner-issued invitations (`invited_by = trip.user_id`)
-- are intentionally preserved — they outlive any link-permission change.

CREATE OR REPLACE FUNCTION public.trips_revoke_link_joined_on_private()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when visibility transitions INTO 'private' from a shared state.
  IF NEW.visibility = 'private'
     AND OLD.visibility IS DISTINCT FROM NEW.visibility
     AND OLD.visibility = ANY (ARRAY['link', 'public']) THEN
    DELETE FROM public.trip_collaborators
    WHERE trip_id = NEW.id
      AND invited_by = user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trips_revoke_link_joined_on_private ON public.trips;
CREATE TRIGGER trips_revoke_link_joined_on_private
  AFTER UPDATE OF visibility ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.trips_revoke_link_joined_on_private();

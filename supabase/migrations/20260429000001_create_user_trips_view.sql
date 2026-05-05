-- Create a security definer function to fetch all trips a user has access to
-- This includes both owned trips and collaborated trips

CREATE OR REPLACE FUNCTION public.get_user_trips(p_user_id uuid)
RETURNS SETOF trips
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Owned trips
  SELECT trips.*
  FROM trips
  WHERE trips.user_id = p_user_id

  UNION

  -- Collaborated trips (where user is an accepted collaborator)
  SELECT trips.*
  FROM trips
  INNER JOIN trip_collaborators ON trips.id = trip_collaborators.trip_id
  WHERE trip_collaborators.user_id = p_user_id
    AND trip_collaborators.invite_status = 'accepted'
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_trips(uuid) TO authenticated;

-- Create a security definer function to fetch only collaborated trips
CREATE OR REPLACE FUNCTION public.get_collaborator_trips(p_user_id uuid)
RETURNS SETOF trips
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT trips.*
  FROM trips
  INNER JOIN trip_collaborators ON trips.id = trip_collaborators.trip_id
  WHERE trip_collaborators.user_id = p_user_id
    AND trip_collaborators.invite_status = 'accepted'
  ORDER BY trips.created_at DESC
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_collaborator_trips(uuid) TO authenticated;

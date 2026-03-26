-- SECURITY DEFINER function to accept an invite by token.
-- Bypasses RLS so the authenticated user can update the pending row
-- (which has user_id = NULL and therefore isn't visible via RLS).

CREATE OR REPLACE FUNCTION public.accept_invite_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row trip_collaborators%ROWTYPE;
BEGIN
  -- Find the pending invite
  SELECT * INTO v_row
    FROM trip_collaborators
   WHERE invite_token = p_token
     AND invite_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already accepted';
  END IF;

  -- Accept: set user_id to the calling user
  UPDATE trip_collaborators
     SET user_id       = auth.uid(),
         invite_status = 'accepted',
         accepted_at   = now()
   WHERE id = v_row.id;

  RETURN jsonb_build_object('trip_id', v_row.trip_id);
END;
$$;

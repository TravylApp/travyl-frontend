-- SECURITY DEFINER function to accept a pending collaboration by its row ID.
-- Used by the share-page "Join to edit" flow when the visitor already has a
-- pending email-invite row (user_id = NULL).  Direct UPDATE from the client
-- would be blocked by RLS because user_id IS DISTINCT FROM auth.uid(), and
-- would fail to set user_id anyway.

CREATE OR REPLACE FUNCTION public.accept_pending_collaboration(p_collab_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE trip_collaborators
  SET    user_id       = auth.uid(),
         invite_status = 'accepted',
         accepted_at   = now()
  WHERE  id            = p_collab_id
    AND  user_id       IS NULL
    AND  invite_status = 'pending';
$$;

GRANT EXECUTE ON FUNCTION public.accept_pending_collaboration(uuid) TO authenticated;

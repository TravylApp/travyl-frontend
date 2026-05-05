-- Fix RLS policies for trip_collaborators to avoid infinite recursion
-- This is necessary for the "Join to edit" flow to work properly

-- Step 1: Create SECURITY DEFINER functions to bypass RLS

-- Function to check if user has existing collaboration
CREATE OR REPLACE FUNCTION public.get_user_collaboration(p_trip_id uuid, p_user_id uuid)
  RETURNS TABLE (
    id uuid,
    trip_id uuid,
    user_id uuid,
    role_type text,
    invite_status text,
    invited_by uuid,
    accepted_at timestamptz,
    created_at timestamptz
  )
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tc.id,
    tc.trip_id,
    tc.user_id,
    tc.role_type,
    tc.invite_status,
    tc.invited_by,
    tc.accepted_at,
    tc.created_at
  FROM trip_collaborators tc
  WHERE tc.trip_id = p_trip_id
    AND (tc.user_id = p_user_id OR tc.user_id IS NULL)
    AND tc.invite_status IN ('pending', 'accepted', 'cancelled')
$$;

-- Function to join a trip via link (bypasses RLS)
CREATE OR REPLACE FUNCTION public.join_trip_via_link(
  p_trip_id uuid,
  p_user_id uuid,
  p_role_type text
)
  RETURNS TABLE (
    id uuid,
    trip_id uuid,
    user_id uuid,
    role_type text,
    invite_status text,
    invited_by uuid,
    accepted_at timestamptz,
    created_at timestamptz
  )
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Insert the new collaboration record
  INSERT INTO trip_collaborators (
    trip_id,
    user_id,
    role_type,
    invite_status,
    invited_by,
    accepted_at
  )
  VALUES (
    p_trip_id,
    p_user_id,
    p_role_type,
    'accepted',
    p_user_id,
    now()
  )
  -- Return the inserted record
  RETURNING
    id,
    trip_id,
    user_id,
    role_type as role_type,
    invite_status,
    invited_by,
    accepted_at,
    created_at;
$$;

-- Step 2: Drop ALL existing policies on trip_collaborators to start fresh
DROP POLICY IF EXISTS "users_can_read_own_collaborations" ON trip_collaborators;
DROP POLICY IF EXISTS "users_can_insert_own_collaborations" ON trip_collaborators;
DROP POLICY IF EXISTS "owners_can_read_trip_collaborations" ON trip_collaborators;
DROP POLICY IF EXISTS "Trip owners can view all collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can update own invite status" ON trip_collaborators;
DROP POLICY IF EXISTS "users_can_update_own_collaborations" ON trip_collaborators;
DROP POLICY IF EXISTS "users_can_delete_own_collaborations" ON trip_collaborators;

-- Step 3: Create simple, non-circular policies

-- Users can read their own collaboration records
CREATE POLICY "users_can_read_own_collaborations"
  ON trip_collaborators FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can update their own collaboration records
CREATE POLICY "users_can_update_own_collaborations"
  ON trip_collaborators FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own collaboration records
CREATE POLICY "users_can_delete_own_collaborations"
  ON trip_collaborators FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Step 4: Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_collaboration(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_trip_via_link(uuid, uuid, text) TO authenticated;

-- Note: We removed the INSERT policy completely and use a SECURITY DEFINER function instead
-- This bypasses RLS for the INSERT operation and avoids infinite recursion
-- The join_trip_via_link() function handles inserting new collaboration records safely
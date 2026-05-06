# TRA-XXX: Fix Trip Invitation System - Add Missing RLS Policies

**Status:** 🚧 In Progress
**Priority:** High
**Assigned:** @shink
**Type:** Bug Fix

## 🎯 Goal

Fix trip invitations so that when users invite someone to a trip, the invited person can actually see and access the trip.

## 🐛 Problem Description

When a user invites someone to a trip via email, the invitation is created in the database but the invited user **cannot see the trip** in their "My Trips" page. The invited user only sees trips they own, not trips they've been invited to collaborate on.

## 🔍 Root Cause

The `trip_collaborators` table is missing Row Level Security (RLS) policies. While the table exists and invitations are being created, **no users have permission to read from this table** due to missing RLS policies.

### Current State:
- ✅ Invitations are created successfully in `trip_collaborators` table
- ✅ Email invites are sent with accept links  
- ✅ Front-end code correctly queries both owned trips AND collaborated trips
- ❌ **Missing RLS policies on `trip_collaborators` table**
- ❌ Users cannot query the table, so `fetchCollaboratorTrips()` returns empty

### Technical Details:
The front-end `useTrips()` hook calls `fetchCollaboratorTrips()` which runs:
```sql
SELECT *, trip_collaborators!inner(*)
FROM trips
WHERE trip_collaborators.user_id = userId
  AND trip_collaborators.invite_status = 'accepted'
```

This query fails because users don't have SELECT permission on `trip_collaborators`.

## 🛠️ Solution

Add comprehensive RLS policies to the `trip_collaborators` table to allow proper access control.

## 📋 Implementation Steps

### 1. Create and Run SQL Fix
- [ ] Create SQL script to add RLS policies to `trip_collaborators` table
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Execute the SQL script
- [ ] Verify the 4 policies were created (check output)

### 2. Verify Policies Created
The script should create these policies:
- [ ] `Users can view collaborations for their trips` (SELECT)
- [ ] `Trip owners can add collaborators` (INSERT)
- [ ] `Users can update their own collaborations` (UPDATE)
- [ ] `Trip owners can remove collaborators` (DELETE)

### 3. Test Invitation Flow
- [ ] **As User A**: Create a test trip
- [ ] **As User A**: Invite User B to the trip via Share Modal
- [ ] **As User B**: Log in and check "My Trips" page
- [ ] **Verify**: User B can see the trip in their list
- [ ] **As User B**: Accept the invitation (if pending)
- [ ] **Verify**: User B can access the trip details and calendar

### 4. Test Permissions
- [ ] **Test Owner**: Can add/remove collaborators
- [ ] **Test Editor**: Can edit activities and calendar
- [ ] **Test Viewer**: Can view but not edit
- [ ] **Test Commenter**: Can view and comment but not edit

### 5. Edge Cases
- [ ] Test with users who have multiple collaborated trips
- [ ] Test removing a collaborator (they should lose access)
- [ ] Test changing collaborator roles
- [ ] Test accepting pending invites via email link

## ✅ Acceptance Criteria

- [ ] Invited users can see trips in their "My Trips" page
- [ ] Invited users can access trip details and calendar
- [ ] Permissions work correctly (viewer vs editor vs commenter)
- [ ] Trip owners can manage collaborators
- [ ] Removing collaborators revokes access
- [ ] Email invitations work end-to-end

## 🔗 Related Files

- `apps/web/components/calendar/sharing/ShareModal.tsx` - UI for inviting
- `apps/web/app/api/calendar/invite/route.ts` - API endpoint
- `packages/shared/src/hooks/useTrips.ts` - Frontend query logic
- `supabase/migrations/20260325000000_collaborator_rls_policies.sql` - Related migration

## 📝 Notes

- The front-end code was already correct - this was purely a database permissions issue
- The SQL fix uses security definer functions to avoid circular RLS policy dependencies
- All policies are scoped to `authenticated` users for security
- Test with real user accounts, not just the owner

## 🐳 Risk Assessment

**Risk Level:** Low
- Changes only affect RLS policies (data access layer)
- No schema changes or data migration required
- Policies are restrictive (only allow appropriate access)
- Can be easily rolled back if needed

---

**Created:** 2026-04-19
**Last Updated:** 2026-04-19

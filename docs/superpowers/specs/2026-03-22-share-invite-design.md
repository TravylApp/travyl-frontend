# Share & Invite Feature — Design Spec

## Goal

Make trip sharing work end-to-end using the Google Docs permission model:
- **Anyone with the link** can view the trip (no account needed)
- **Email invites** grant **editor** access (requires sign up/login to claim)
- Link sharing toggle controls whether the trip is publicly viewable or restricted

## Current State

### What exists
- `ShareModal` UI with `InviteBar`, `CollaboratorList`, `LinkSharingSection`
- Lambda `services/invite.ts` — creates `trip_collaborators` row + sends SES email
- SST infra: `sst.aws.Email` resource for `gotravyl.com`, `/invite` route linked to it
- `acceptInviteByToken()` in `packages/shared/src/services/api.ts`
- `trip_collaborators` table with `invite_token`, `invite_status`, `invited_email`
- `/trip/[id]/share/[token]` page — basic view-only trip summary
- `canViewTrip()`, `canEditTrip()` permission utils in `packages/shared/src/utils/permissions.ts`
- Middleware redirects unauthenticated `/trip/*` access to `/login?redirect=...`
- SES verified domain: `noreply@gotravyl.com`

### What's broken/missing
- Login page accepts `?redirect=` param but ignores it (always redirects to `/`)
- No `/invite/accept` route — email links go nowhere
- InviteBar has a viewer/editor role picker (should be editor-only)
- LinkSharingSection has a "Can view / Can edit" dropdown (should be view-only always)
- Share page renders a summary, not the actual calendar
- No read-only mode for the calendar UI
- No "Sign up to edit" banner on shared view
- Middleware blocks `/trip/[id]/share/[token]` for unauthenticated users (it matches `pathname.startsWith('/trip/')`)
- `canEditTrip()` returns true when `link_permission === 'editor'`, contradicting view-only link model

## Design

### 1. Simplify InviteBar

**File:** `apps/web/components/calendar/sharing/InviteBar.tsx`

Remove the `<select>` role picker. Email invites always grant `editor`. The component becomes: email input + "Invite" button. The `onInvite` callback signature changes from `(email, role)` to `(email)` — role is always `'editor'`.

### 2. Simplify LinkSharingSection

**File:** `apps/web/components/calendar/sharing/LinkSharingSection.tsx`

Remove the "Can view / Can edit" permission dropdown. Link sharing always means view-only. The section becomes: toggle on/off + copy link button. Remove the `onChangeLinkPermission` prop.

### 3. Update ShareModal

**File:** `apps/web/components/calendar/sharing/ShareModal.tsx`

- Update `handleInvite` to pass `'editor'` explicitly (or omit role — Lambda hardcodes it)
- Remove `handleChangeLinkPermission` and its prop to `LinkSharingSection`

### 4. Update Lambda

**File:** `services/invite.ts`

- Ignore `role` from request body, hardcode `role_type: 'editor'`
- Keep everything else (auth validation, duplicate check, SES email)

### 5. Fix login redirect

**File:** `apps/web/app/login/page.tsx`

The login page reads `searchParams` (line 20) but `handleSubmit` always calls `router.replace('/')` (line 45). Fix to use the `redirect` param:

```ts
const redirectTo = searchParams.get('redirect') || '/'
router.replace(redirectTo)
```

**Security:** Validate the redirect is a relative path (starts with `/`, does not start with `//`) to prevent open redirect attacks.

### 6. Create `/invite/accept` route

**File:** `apps/web/app/invite/accept/page.tsx`

This is where email invite links land (`gotravyl.com/invite/accept?token=xxx`).

Logic:
1. Read `token` from query params
2. If no token, show error ("Invalid invite link")
3. Check auth state:
   - **Logged in** — call `acceptInviteByToken(token, userId)`, redirect to `/trip/[tripId]`
   - **Not logged in** — redirect to `/login?redirect=` with the value **URL-encoded**: `/login?redirect=%2Finvite%2Faccept%3Ftoken%3Dxxx`
4. After login, the redirect brings them back here, step 3 runs again (now logged in), invite is accepted

Edge cases:
- Token already accepted → show "This invite has already been accepted" with link to the trip
- Token not found → show "Invalid or expired invite link"
- User accepting their own invite → handle gracefully (shouldn't error)

### 7. Middleware update

**File:** `apps/web/middleware.ts`

Two routes need to bypass the auth gate:

1. `/trip/[id]/share/[token]` — public view-only access. Currently blocked because `pathname.startsWith('/trip/')` redirects to login.
2. `/invite/accept` — needs to load before redirecting unauthenticated users to login with the token preserved.

Add pass-through checks before the `/trip/` auth gate:

```ts
// Share links — public read-only access
if (/^\/trip\/[^/]+\/share\/[^/]+/.test(pathname)) {
  return NextResponse.next()
}

// Invite accept — handles its own auth redirect
if (pathname.startsWith('/invite/')) {
  return NextResponse.next()
}
```

### 8. Read-only calendar view

**File:** `apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx`

Replace the current summary view with the actual calendar rendered in read-only mode.

**Data fetching:** The share page uses a **static Supabase fetch** (not Yjs real-time sync). This avoids wiring up `YjsTripProvider` for anonymous users and keeps the implementation simple. Create a `ReadOnlyCalendarDashboard` component that:
1. Fetches the trip via `fetchTripByShareToken(token)`
2. Fetches activities via a new `fetchActivitiesByTripId(tripId)` function (direct Supabase query, no Yjs)
3. Validates trip ID matches the route param
4. Renders the calendar grid with activities placed in their time slots
5. Shows a top banner: "You're viewing [Trip Name] — [Sign up to edit]"

The `ReadOnlyCalendarDashboard` is a simpler component than `CalendarDashboard` — it renders the same visual calendar grid (week/day views, time slots, event blocks) but without DnD, Yjs, mutations, presence, suggestions, or command palette. This is cleaner than trying to conditionally disable all those features inside the existing `CalendarDashboard` which hard-depends on hooks like `useYjsSync`, `useActivityMutations`, `useCollaboratorPresence`.

### 9. Update `canEditTrip` permission util

**File:** `packages/shared/src/utils/permissions.ts`

`canEditTrip()` currently returns `true` when `trip.link_permission === 'editor'`. Under the Google Docs model, link access is always view-only. Edit access requires being the owner or an accepted collaborator with `role_type: 'editor'`.

Update `canEditTrip()` to check:
- User is the trip owner, OR
- User has an accepted `trip_collaborators` row with `role_type: 'editor'`

This may require passing collaborators data to the function, or keeping it simple and just removing the `link_permission === 'editor'` path. The latter is sufficient for now — the UI will gate edit controls based on auth state and collaborator status.

### 10. Clean up types

**File:** `packages/shared/src/types/index.ts`

- `LinkPermission` type stays to avoid churn in the Trip type and DB schema. The UI just won't expose the editor option.
- `CollaboratorRole` stays — still used for the `trip_collaborators` table, but email invites always use `'editor'`.

## Data Flow

```
INVITE FLOW:
Inviter clicks Share -> ShareModal opens
  -> Types email, clicks Invite
  -> POST /invite (Lambda)
     -> Creates trip_collaborators row (role=editor, status=pending)
     -> SES sends email with /invite/accept?token=xxx link
  -> Collaborator list refreshes, shows pending invite

Recipient clicks email link
  -> /invite/accept?token=xxx
  -> Not logged in? -> /login?redirect=%2Finvite%2Faccept%3Ftoken%3Dxxx
  -> Signs up / logs in -> redirected back to /invite/accept?token=xxx
  -> acceptInviteByToken() -> sets user_id, status=accepted
  -> Redirect to /trip/[tripId] (full edit access)

LINK SHARING FLOW:
Owner enables link sharing in ShareModal
  -> updateTripVisibility(tripId, 'link')
  -> ensureShareLinkToken(tripId)
  -> Copy link: /trip/[id]/share/[token]

Anyone opens share link
  -> /trip/[id]/share/[token] (middleware passes through)
  -> No auth needed
  -> Static fetch of trip + activities from Supabase
  -> ReadOnlyCalendarDashboard renders calendar view-only
  -> Banner: "Sign up to edit" -> /signup?redirect=/trip/[id]/share/[token]
  -> After signup, they land back on the share page (still read-only)
  -> To get edit access, owner must send them an email invite
```

## What does NOT change

- `trip_collaborators` table schema — no migrations needed
- `trips` table schema — `visibility`, `link_permission`, `share_link_token` columns stay
- `useCollaborators` hook — unchanged
- `CollaboratorList` component — still shows who has access with role display
- SES configuration — already set up with `noreply@gotravyl.com`
- SST infra — `sst.aws.Email` and `/invite` route already configured

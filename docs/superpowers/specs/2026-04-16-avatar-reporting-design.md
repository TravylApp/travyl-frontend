# Avatar Reporting Design Notes

Date: April 16, 2026

## Current product context

- Users cannot currently search arbitrary user profiles through the main product flow.
- Users can still encounter another user's identity surface through collaboration and sharing features.
- The most relevant current exposure is collaborator identity inside trip sharing flows, where another person's avatar or avatar-derived identity can appear.
- The repo also contains a public user profile route at `apps/web/app/(main)/user/[username]/page.tsx`, so avatar reporting should eventually be consistent there as well if that route is exposed in production.

## Product goal

Allow a signed-in user to report a suspicious or inappropriate user avatar without requiring broad profile discovery or profile search.

The core object being reported should be the avatar instance and its owning user, not "a user profile page."

## Recommended scope order

### Phase 1: frontend entry points

Add a `Report avatar` action anywhere another user's avatar is already visible:

- Trip share modal collaborator rows
- Shared trip / collaborator surfaces
- Public profile page, if exposed
- Public trip cards that show creator avatars

The frontend flow should collect:

- reported user identifier
- current avatar URL if available
- source context
- reason
- optional freeform details

### Phase 2: report submission API

Add a protected API endpoint such as `POST /api/reports/avatar`.

The client should not write directly into the moderation table if the backend can own validation instead.

### Phase 3: moderation tooling

Create an internal review workflow for moderators/admins:

- open reports
- see reporter, reported user, reason, details, and source context
- inspect the reported avatar snapshot/URL
- dismiss or action the report

### Phase 4: enforcement

Possible moderator actions:

- dismiss report
- warn user
- remove current avatar
- temporarily lock avatar uploads
- auto-replace avatar with default placeholder

## Data model recommendation

Create a dedicated table such as `avatar_reports`.

Suggested columns:

- `id uuid primary key`
- `reported_user_id uuid not null`
- `reporter_user_id uuid not null`
- `avatar_url text null`
- `avatar_storage_path text null`
- `reason text not null`
- `details text null`
- `status text not null default 'open'`
- `source_type text not null`
- `source_trip_id uuid null`
- `source_collaborator_id uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended enums / constrained values:

- `status`: `open`, `reviewing`, `resolved`, `dismissed`
- `source_type`: `trip_share`, `public_profile`, `public_trip`, `other`

## Important implementation detail: snapshot the reported avatar

Do not rely only on `profiles.avatar_url` at review time.

Store one or more of:

- the avatar URL visible at report time
- storage path / object key if known
- optional cached thumbnail or signed review asset generated at report time

Reason:

- users can change avatars after being reported
- moderators need to review what was actually seen

## Access-control recommendation

The report API should verify that the reporter had a legitimate path to see the avatar.

Good initial rule:

- reporter must be authenticated
- reporter cannot report themself
- reporter can report the avatar only if one of the following is true:
  - they share a trip with the reported user
  - the avatar is visible on a public profile
  - the avatar is visible on a public trip/card surface

For the collaboration flow, the cleanest first rule is:

- reporter and reported user must both be connected to the same trip through ownership or accepted collaboration

## Frontend data dependency you will likely need

The current collaborator list is built from `trip_collaborators` rows, which are not enough for a proper avatar reporting target on their own.

Current limitation:

- `TripCollaborator` includes `user_id`, invite status, role, and email
- it does not currently include joined profile presentation fields like `display_name` or `avatar_url`

Recommended next step:

Extend collaborator fetching so accepted collaborators can return joined profile data:

- `display_name`
- `avatar_url`

Suggested shape for future frontend use:

- collaborator id
- trip id
- user id
- display name
- avatar url
- invited email
- invite status
- role

This makes it possible to:

- show real avatars instead of initials
- open a report modal with a reliable target user id
- preserve clear moderation context

## UI recommendation

### Trigger placement

Preferred placement:

- a small icon button or overflow menu action on each visible non-self avatar row

Avoid:

- placing the action only on a separate settings page
- requiring profile search to report

### Modal fields

Suggested fields:

- reason picker
- optional notes textarea
- short explainer text

Suggested reason options:

- `Explicit sexual content`
- `Harassment or hate`
- `Violence or gore`
- `Impersonation or scam`
- `Other`

### Submission UX

On submit:

- disable button while submitting
- show success toast
- close modal

Optional:

- keep a local optimistic audit entry for the current session

## Moderation workflow recommendation

Minimum viable moderation:

- reports are saved
- internal reviewers are notified
- reviewer can dismiss or clear avatar

More robust moderation later:

- auto-hide avatar after N unique reports from different users
- rate limit reporting to reduce abuse
- prevent duplicate reports from the same reporter against the same avatar version
- track moderator actions and rationale

## Abuse and trust safeguards

Recommended safeguards:

- prevent self-reporting
- rate limit report creation per reporter
- deduplicate repeated identical reports from the same reporter for the same avatar URL
- require authentication
- log source trip id or source page context

## Suggested implementation tickets

### Frontend

- Add reusable `ReportAvatarModal` component
- Add `Report avatar` trigger to collaborator rows in share modal
- Add the same trigger to any public avatar surfaces
- Update collaborator query/types to include profile display data

### Backend

- Add `avatar_reports` table and RLS
- Add `POST /api/reports/avatar`
- Validate visibility path between reporter and reported user
- Persist report snapshot fields

### Admin / moderation

- Build internal report review screen
- Add moderator action for clearing avatar
- Add audit trail for moderation actions

## Notes specific to this repo

- Current collaborator UI lives under `apps/web/components/calendar/sharing/`
- Current share modal collaborator list only has initials + email, not joined profile avatars
- Avatar/profile data already exists in `profiles.avatar_url`
- Public profile rendering already exists in `apps/web/app/(main)/user/[username]/page.tsx`

## MVP recommendation

If implementation time is limited, build this in order:

1. Frontend-only report modal in collaborator UI
2. collaborator/profile join so the report targets a real `reported_user_id`
3. backend submission endpoint
4. moderation table and admin review flow

That sequencing gives product reviewable UI immediately while keeping the backend path clear.

# Create Trip Modal — Design Spec
**Date:** 2026-03-17
**Status:** Approved

## Problem

The trips list page falls back to `MOCK_TRIPS` when Supabase returns no data. Mock trips have non-UUID IDs (`"mock-trip-1"`, `"mock-trip-2"`, etc.). Clicking one navigates to `/trip/mock-trip-2`, which is passed directly into Supabase `.eq('id', tripId)` — Postgres rejects it with `invalid input syntax for type uuid`. Users have no way to create real trips.

## Solution

Remove the mock data fallback and add a minimal "Create Trip" modal so users can create real Supabase-backed trips.

## Scope

- `apps/web/components/trips/CreateTripModal.tsx` — new component
- `apps/web/app/(main)/trips/page.tsx` — remove mock fallback, wire up buttons

No new routes. No changes to the trip detail page, calendar, or Yjs layer.

## Components

### `CreateTripModal`

A controlled modal rendered inside `TripsContent`. Props:

```ts
interface CreateTripModalProps {
  open: boolean
  onClose: () => void
}
```

**Fields:**
| Label | Input type | Required | Column |
|---|---|---|---|
| Trip name | text | yes | `title` |
| Destination | text | yes | `destination` |
| Start date | date | yes | `start_date` |
| End date | date | yes | `end_date` |

**Imports required:**
- `import { useRouter } from 'next/navigation'`
- `import { useQueryClient } from '@tanstack/react-query'`
- `import { useAuthStore } from '@travyl/shared'`
- `import { supabase } from '@travyl/shared/services/supabase'`

**On submit:**
1. Read `user` from `useAuthStore`. If `user` is null, set error and return early — do not call Supabase.
2. Validate all 4 fields are non-empty and `end_date >= start_date`. Show inline errors if not.
3. Set `submitting: true`. Disable the submit button and all form fields while submitting.
4. Call:
   ```ts
   const { data, error } = await supabase
     .from('trips')
     .insert({ title, destination, start_date, end_date, status: 'planning', user_id: user.id })
     .select()
     .single()
   ```
5. On success:
   - `queryClient.invalidateQueries({ queryKey: ['trips'] })`
   - `router.push('/trip/' + data.id)`
   - call `onClose()`
6. On error: set `error: string` shown as a banner inside the modal, keep modal open.
7. Always set `submitting: false` in a finally block.

**Dismissal:** Clicking the backdrop or pressing Escape calls `onClose()`.

**State:** `submitting: boolean`, `error: string | null`

### `TripsContent` changes

1. **Remove mock fallback.** The `allTrips` derivation becomes:
   ```ts
   const allTrips: MockTripCard[] = (trips ?? []).map((t) => ({
     ...t,
     image: `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800`,
   }))
   ```
   Remove the `MOCK_TRIPS` named import. Keep the `MockTripCard` type import (still needed for the cast above).

2. **Add modal state:** `const [modalOpen, setModalOpen] = useState(false)`

3. **Wire buttons:** Both the header "Plan a Trip" button and the empty-state "Plan a Trip" button call `setModalOpen(true)`.

4. **Render modal:** `<CreateTripModal open={modalOpen} onClose={() => setModalOpen(false)} />`

## Data Shape

```ts
// Insert payload
{
  title: string        // e.g. "Paris Adventure"
  destination: string  // e.g. "Paris, France"
  start_date: string   // ISO date "YYYY-MM-DD"
  end_date: string     // ISO date "YYYY-MM-DD"
  status: 'planning'
  user_id: string      // user.id from useAuthStore
}
// Supabase generates `id` (uuid) automatically
```

## Error Handling

- Null user at submit time: set error, return early
- Empty fields: inline validation messages under each input
- End date before start date: inline error on end date field
- Supabase insert error: banner at top of modal form
- Submit button disabled while `submitting: true`

## Out of Scope

- Cover image upload (hardcoded fallback Unsplash URL used in list view)
- Trip collaborators
- Wizard/multi-step flow
- Editing or deleting existing trips

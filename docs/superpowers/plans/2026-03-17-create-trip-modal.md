# Create Trip Modal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Create Trip" modal so users can create real Supabase-backed trips, and remove the mock-data fallback that causes UUID errors.

**Architecture:** New `CreateTripModal` component inserts a row into the `trips` table via the shared Supabase client, then invalidates the React Query `['trips']` cache and navigates to the new trip. The trips list page removes its `MOCK_TRIPS` fallback, replacing it with a `.map()` that adds a fallback image to real DB trips.

**Tech Stack:** Next.js App Router, Supabase JS v2, React Query v5, Zustand, Tailwind CSS, Lucide icons.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `apps/web/components/trips/CreateTripModal.tsx` | Modal form: 4 fields, submit, validation, error state |
| Modify | `apps/web/components/trips/index.ts` | Export `CreateTripModal` |
| Modify | `apps/web/app/(main)/trips/page.tsx` | Remove mock fallback, wire modal |

---

### Task 1: Create `CreateTripModal` component

**Files:**
- Create: `apps/web/components/trips/CreateTripModal.tsx`

- [ ] **Step 1: Create the file with this exact content**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { X, Plane } from 'lucide-react'
import { useAuthStore } from '@travyl/shared'
import { supabase } from '@travyl/shared'

interface CreateTripModalProps {
  open: boolean
  onClose: () => void
}

interface FieldErrors {
  title?: string
  destination?: string
  start_date?: string
  end_date?: string
}

export function CreateTripModal({ open, onClose }: CreateTripModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('')
      setDestination('')
      setStartDate('')
      setEndDate('')
      setFieldErrors({})
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function validate(): boolean {
    const errors: FieldErrors = {}
    if (!title.trim()) errors.title = 'Trip name is required'
    if (!destination.trim()) errors.destination = 'Destination is required'
    if (!startDate) errors.start_date = 'Start date is required'
    if (!endDate) errors.end_date = 'End date is required'
    else if (startDate && endDate < startDate) errors.end_date = 'End date must be after start date'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!user) {
      setError('You must be signed in to create a trip.')
      return
    }
    if (!validate()) return

    setSubmitting(true)
    try {
      const { data, error: insertError } = await supabase
        .from('trips')
        .insert({
          title: title.trim(),
          destination: destination.trim(),
          start_date: startDate,
          end_date: endDate,
          status: 'planning',
          user_id: user.id,
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['trips'] })
      onClose()
      router.push(`/trip/${data.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center">
              <Plane size={14} className="text-white -rotate-12" />
            </div>
            <h2 className="text-lg font-bold text-[#1e3a5f]">Plan a Trip</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trip name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trip name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Paris Adventure"
              disabled={submitting}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
            />
            {fieldErrors.title && <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>}
          </div>

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Paris, France"
              disabled={submitting}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
            />
            {fieldErrors.destination && <p className="mt-1 text-xs text-red-500">{fieldErrors.destination}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
              />
              {fieldErrors.start_date && <p className="mt-1 text-xs text-red-500">{fieldErrors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={submitting}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
              />
              {fieldErrors.end_date && <p className="mt-1 text-xs text-red-500">{fieldErrors.end_date}</p>}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2a4d78] disabled:opacity-50 transition-all mt-2"
          >
            {submitting ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Export from the trips barrel**

In `apps/web/components/trips/index.ts`, add this line:
```ts
export { CreateTripModal } from './CreateTripModal';
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/trips/CreateTripModal.tsx apps/web/components/trips/index.ts
git commit -m "feat: add CreateTripModal component"
```

---

### Task 2: Update trips page — remove mock fallback and wire modal

**Files:**
- Modify: `apps/web/app/(main)/trips/page.tsx`

- [ ] **Step 1: Update the imports line**

Change line 6 from:
```ts
import { useTrips, MOCK_TRIPS } from '@travyl/shared';
```
to:
```ts
import { useTrips } from '@travyl/shared';
```

**Important:** Line 7 (`import type { MockTripCard } from '@travyl/shared'`) must be **preserved** — it is still needed for the `allTrips` type cast in Step 3.

And add `CreateTripModal` to the trips component imports on line 10:
```ts
import { ViewToggle, TripCard, TripListItem, CreateTripModal } from '@/components/trips';
```

- [ ] **Step 2: Add modal state inside `TripsContent`**

After the `const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')` line, add:
```ts
const [modalOpen, setModalOpen] = useState(false)
```

- [ ] **Step 3: Replace the `allTrips` derivation**

Change:
```ts
const allTrips: MockTripCard[] = (trips?.length && !isError)
  ? trips.map((t) => ({
      ...t,
      image: MOCK_TRIPS.find((m) => m.id === t.id)?.image
        || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800`,
    }))
  : MOCK_TRIPS;
```
to:
```ts
const allTrips: MockTripCard[] = (trips ?? []).map((t) => ({
  ...t,
  image: `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800`,
}))
```

- [ ] **Step 4: Wire the header "Plan a Trip" button**

Find the header button (currently `<button className="flex items-center gap-2 px-4 py-2.5 ...`):
```tsx
<button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
  style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
>
  <Plus size={16} />
  Plan a Trip
</button>
```
Add `onClick={() => setModalOpen(true)}`:
```tsx
<button
  onClick={() => setModalOpen(true)}
  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
  style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
>
  <Plus size={16} />
  Plan a Trip
</button>
```

- [ ] **Step 5: Wire the empty-state "Plan a Trip" button**

Find the empty-state button (inside the `displayTrips.length === 0` block) and add `onClick={() => setModalOpen(true)}`:
```tsx
<button
  onClick={() => setModalOpen(true)}
  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
  style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
>
  <Plus size={16} />
  Plan a Trip
</button>
```

- [ ] **Step 6: Render the modal at the bottom of the `TripsContent` return**

Inside the outermost `<div className="flex flex-col min-h-...">`, just before the closing `</div>`, add:
```tsx
<CreateTripModal open={modalOpen} onClose={() => setModalOpen(false)} />
```

- [ ] **Step 7: Verify no TypeScript errors**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: no errors referencing `MOCK_TRIPS`, `CreateTripModal`, or `allTrips`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/\(main\)/trips/page.tsx
git commit -m "feat: wire CreateTripModal into trips page, remove mock fallback"
```

---

### Task 3: Manual smoke test

- [ ] **Step 1: Start the dev server**
```bash
cd apps/web && npm run dev
```

- [ ] **Step 2: Sign up / sign in**, then navigate to `/trips`

Expected: empty state showing "No trips yet" with a "Plan a Trip" button. No UUID errors in console.

- [ ] **Step 3: Click "Plan a Trip"**

Expected: modal opens with 4 fields. Escape key and backdrop click close it.

- [ ] **Step 4: Submit with empty fields**

Expected: inline validation errors under each field. No Supabase call made.

- [ ] **Step 5: Submit with end date before start date**

Expected: inline error on end date field only.

- [ ] **Step 6: Fill all fields correctly and submit**

Expected: modal closes, navigates to `/trip/<uuid>` (a real UUID). No `invalid input syntax for type uuid` error.

- [ ] **Step 7: Navigate back to `/trips`**

Expected: the new trip appears in the list with the fallback Unsplash image.

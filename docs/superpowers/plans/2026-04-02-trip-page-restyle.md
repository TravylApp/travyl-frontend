# Trip Page Restyle — Unified App Shell Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dual magazine/suitcase-card layout on trip pages with a single consistent app-shell layout — compact header, no card wrapper, no footer, consistent sidebar.

**Architecture:** Modify `trip-layout-inner.tsx` to remove the magazine-vs-card branching. Replace `TripMagazineHero` (full-viewport parallax) with a new `CompactTripHeader` (~180px). Hide footer on trip routes via the dashboard layout. Keep calendar full-screen layout unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Framer Motion, Supabase

**Spec:** `docs/superpowers/specs/2026-04-02-trip-page-restyle-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/web/components/trip/CompactTripHeader.tsx` | New ~180px trip header with bg image, title, dates, edit |
| Modify | `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx` | Remove dual layout, unified shell, no footer/OceanWave |
| Modify | `apps/web/components/dashboard/DashboardLayout.tsx` | Accept `hideFooter` prop, conditionally render footer |
| Modify | `apps/web/app/(dashboard)/layout.tsx` | Pass route info to decide footer visibility |
| Keep | `apps/web/components/trip/TripMagazineHero.tsx` | Not deleted yet — keep for reference, unused after changes |
| Keep | `apps/web/components/trip-tabs.tsx` | No changes needed — already icon-only spine on desktop |

---

### Task 1: Create CompactTripHeader Component

**Files:**
- Create: `apps/web/components/trip/CompactTripHeader.tsx`

This replaces the full-viewport `TripMagazineHero` with a compact ~180px header showing trip identity.

- [ ] **Step 1: Create the CompactTripHeader component**

```tsx
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Pencil, X, Check, Calendar, Users } from 'lucide-react';
import { formatDateRange, updateTripDetails } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

export function CompactTripHeader({
  tripId,
  trip,
  onTripUpdate,
}: {
  tripId: string;
  trip: Trip | null;
  onTripUpdate?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editTravelers, setEditTravelers] = useState(1);
  const [saving, setSaving] = useState(false);

  const rawCover = trip?.trip_context?.hero_image_url;
  const coverImage = rawCover?.includes('googleusercontent.com')
    ? rawCover.replace(/=w\d+-h\d+[^&]*/, '=w1600-h600-k-no')
    : rawCover;

  const destination = trip?.destination;
  const cityName = destination ? destination.split(',')[0].trim() : '';
  const countryName = destination ? destination.split(',').slice(1).join(',').trim() : '';
  const dateStr = trip?.start_date && trip?.end_date ? formatDateRange(trip.start_date, trip.end_date) : null;
  const travelersCount = trip?.travelers || 1;

  const countryFlag = trip?.trip_context?.country?.flag as string | undefined;
  const countryCca2 = trip?.trip_context?.country?.cca2 as string | undefined;
  const flagUrl = countryFlag || (countryCca2 ? `https://flagcdn.com/24x18/${countryCca2.toLowerCase()}.png` : null);

  const openEditor = useCallback(() => {
    setEditTitle(trip?.title || '');
    setEditStart(trip?.start_date || '');
    setEditEnd(trip?.end_date || '');
    setEditTravelers(trip?.travelers || 1);
    setEditing(true);
  }, [trip]);

  const saveEdits = useCallback(async () => {
    if (!tripId || saving) return;
    setSaving(true);
    try {
      await updateTripDetails(tripId, {
        title: editTitle || undefined,
        start_date: editStart || undefined,
        end_date: editEnd || undefined,
        travelers: editTravelers,
      });
      setEditing(false);
      onTripUpdate?.();
    } catch (e) {
      console.error('Failed to update trip:', e);
    } finally {
      setSaving(false);
    }
  }, [tripId, editTitle, editStart, editEnd, editTravelers, saving, onTripUpdate]);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 180 }}>
      {/* Background image */}
      {coverImage ? (
        <Image
          src={coverImage}
          alt={destination || ''}
          fill
          referrerPolicy="no-referrer"
          className="object-cover"
          style={{ objectPosition: 'center 30%' }}
          sizes="100vw"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end max-w-7xl mx-auto px-6 sm:px-10 md:pl-24 pb-5">
        {/* Country tag */}
        <p className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-semibold mb-1.5"
          style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {flagUrl && <img src={flagUrl} alt="flag" width={20} height={15} className="rounded-[2px]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />}
          <span>{countryName || ''}</span>
        </p>

        {/* Title row */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-white leading-tight font-serif"
              style={{ letterSpacing: '0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              {cityName || trip?.title || 'Untitled Trip'}
            </h1>

            {/* Meta row */}
            {!editing && (
              <div className="flex items-center gap-3 mt-1.5 text-[13px] text-white/80">
                {dateStr && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-white/50" />
                    {dateStr}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users size={12} className="text-white/50" />
                  {travelersCount} {travelersCount === 1 ? 'traveler' : 'travelers'}
                </span>
                <button
                  onClick={openEditor}
                  className="ml-1 p-1 rounded-full hover:bg-white/15 text-white/50 hover:text-white transition-colors"
                  title="Edit trip details"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Inline editor */}
        {editing && (
          <div className="flex flex-wrap items-end gap-2.5 mt-2">
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Trip title"
              className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 w-40" />
            <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 [color-scheme:dark]" />
            <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 [color-scheme:dark]" />
            <input type="number" min={1} max={20} value={editTravelers} onChange={(e) => setEditTravelers(Number(e.target.value))}
              className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 w-16" />
            <button onClick={saveEdits} disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-[#0f1f33] text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50">
              <Check size={13} /> {saving ? '...' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors border border-white/20">
              <X size={13} /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls -la apps/web/components/trip/CompactTripHeader.tsx`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/trip/CompactTripHeader.tsx
git commit -m "Add CompactTripHeader component for unified trip shell"
```

---

### Task 2: Rewrite trip-layout-inner.tsx — Unified Shell

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx`

Remove the dual magazine/suitcase-card branching. All non-calendar tabs use the same layout: CompactTripHeader + flat content area. Keep TripExploreSection on overview (it's useful content), but remove footer/OceanWave.

- [ ] **Step 1: Update imports**

Replace TripMagazineHero import with CompactTripHeader. Remove OceanWave and Footer imports.

In `trip-layout-inner.tsx`, change:
```tsx
import { OceanWave, Footer } from '@/components/home';
```
to:
```tsx
// Footer/OceanWave removed — trip pages are a workspace, no marketing footer
```

And change:
```tsx
import { TripMagazineHero } from '@/components/trip/TripMagazineHero';
```
to:
```tsx
import { CompactTripHeader } from '@/components/trip/CompactTripHeader';
```

- [ ] **Step 2: Simplify TripLayoutContent**

Remove these variables and logic:
- `isMagazineLayout` const and its usage
- `exitingFromMagazine` state and `wasMagazineRef`
- `useOverviewBg` const
- The `handleExitComplete` callback
- `isItinerary` const

Replace the main return (after the calendar early-return) with a unified layout:

```tsx
  return (
    <div className="pb-14 md:pb-0 bg-white dark:bg-[var(--background)]">
      {/* Sidebar — always icon-only spine on desktop, bottom bar on mobile */}
      <TripTabs tripId={tripId} position="left" />

      {/* Compact trip header — all tabs */}
      <CompactTripHeader tripId={tripId} trip={trip} onTripUpdate={refetch} />

      {/* Content area */}
      <div className="mx-auto max-w-7xl">
        <div className="relative z-10">
          <ContentHeader
            tripId={tripId}
            mapOpen={mapOpen}
            onToggleMap={() => setMapOpen(!mapOpen)}
          />

          <div className="flex">
            {/* Main content */}
            <div className="flex-1 min-w-0 relative overflow-hidden px-5 md:pl-20 pt-4 pb-5">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={`tab-${currentSegment}`}
                  initial={pageVariants.initial}
                  animate={pageVariants.animate}
                  exit={pageVariants.exit}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Map side panel — unchanged */}
            <AnimatePresence>
              {mapOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '35%', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  className="hidden md:block shrink-0 border-l border-gray-200 dark:border-white/[0.08] overflow-hidden"
                >
                  {/* ... existing map panel content stays exactly as-is ... */}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Explore section — overview only (useful content, not decoration) */}
      {isOverview && (
        <div className="w-full relative z-10 bg-white dark:bg-[var(--background)]">
          <TripExploreSection trip={trip} />
        </div>
      )}

      {/* NO footer, NO OceanWave — this is a workspace */}
    </div>
  );
```

- [ ] **Step 3: Update ContentHeader to show on all tabs**

Change the ContentHeader to render on ALL tabs (not skip overview/itinerary):

```tsx
  // Remove this early return:
  // if (segment === '' || segment === 'itinerary') return null;
  
  // Instead, show on all tabs. Overview gets a simple label too.
  if (!tab) return null;
```

- [ ] **Step 4: Clean up unused variables**

Remove these now-unused declarations from TripLayoutContent:
- `isItinerary`
- `isMagazineLayout`
- `exitingFromMagazine` / `setExitingFromMagazine`
- `wasMagazineRef`
- `useOverviewBg`
- `handleExitComplete`

Update `pageVariants` — remove `onExitComplete={handleExitComplete}` from AnimatePresence.

- [ ] **Step 5: Typecheck**

Run: `cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend/.worktrees/feature-tra-404 && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -30`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(dashboard\)/trip/\[id\]/trip-layout-inner.tsx
git commit -m "Unify trip layout: compact header, remove card wrapper and footer"
```

---

### Task 3: Hide Footer on Trip Routes

**Files:**
- Modify: `apps/web/components/dashboard/DashboardLayout.tsx`
- Modify: `apps/web/app/(dashboard)/layout.tsx`

The dashboard layout currently doesn't render a footer (the trip layout was doing it internally). But verify no footer leaks in from elsewhere, and ensure the DashboardLayout cleanly supports trip-route detection.

- [ ] **Step 1: Verify no footer in DashboardLayout**

Read `apps/web/components/dashboard/DashboardLayout.tsx` — confirm it doesn't render a Footer. If it does, make footer conditional based on a `hideFooter` prop.

Current code has no footer — just `<main>{children}</main>`. No change needed here unless a footer was added elsewhere.

- [ ] **Step 2: Check root layout for footer**

Read `apps/web/app/layout.tsx` to verify the global footer isn't rendered at root level (it shouldn't be — the trip layout was rendering it conditionally).

- [ ] **Step 3: Commit (if changes were needed)**

```bash
git add -A
git commit -m "Ensure footer is hidden on trip routes"
```

---

### Task 4: Visual QA with Playwright

**Files:** No code changes — testing only.

- [ ] **Step 1: Start local dev server**

Copy `.env.local` from main tree if needed, then start:
```bash
cp ../../apps/web/.env.local apps/web/.env.local 2>/dev/null
npm run web
```

- [ ] **Step 2: Navigate to trip page and screenshot**

Use Playwright MCP to navigate to `http://localhost:3000/trip/b2e1743f-6356-4d42-9859-fd9c8720ba63` and take a screenshot. Verify:
- Compact header (~180px) with trip image, title, destination, dates
- No quote/blockquote
- Consistent sidebar (icon-only spine)
- No rounded card wrapper on content
- No footer

- [ ] **Step 3: Check itinerary tab**

Navigate to `/trip/.../itinerary`, screenshot. Verify same compact header, same layout pattern.

- [ ] **Step 4: Check a utility tab (e.g. packing)**

Navigate to `/trip/.../packing`, screenshot. Verify no suitcase card, same header, no footer.

- [ ] **Step 5: Check calendar tab**

Navigate to `/trip/.../calendar`, screenshot. Verify calendar still uses full-screen layout (unchanged).

- [ ] **Step 6: Check mobile viewport**

Resize to 375x812, navigate to overview. Verify bottom tab bar, compact header scales, no footer.

---

### Task 5: Create Planning File and Final Commit

**Files:**
- Create: `planning/TRA-404.md`

- [ ] **Step 1: Write planning file**

```markdown
# TRA-404: Restyle Trip Pages — Unified App Shell

## Goal
Replace dual magazine/suitcase-card layout with one consistent app shell.

## Completed
- CompactTripHeader component (180px, bg image, title, dates, edit)
- Unified layout in trip-layout-inner.tsx (no card wrapper, no footer)
- ContentHeader shows on all tabs
- Footer/OceanWave removed from trip pages
- Calendar layout unchanged

## Files Changed
- `apps/web/components/trip/CompactTripHeader.tsx` (new)
- `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx` (rewritten)
- `apps/web/components/dashboard/DashboardLayout.tsx` (verified)

## Linear
https://linear.app/travyl/issue/TRA-404
```

- [ ] **Step 2: Final commit and push**

```bash
git add planning/TRA-404.md
git commit -m "Add TRA-404 planning file"
git push -u origin feature/TRA-404
```

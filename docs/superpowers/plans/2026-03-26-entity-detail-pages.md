# Entity Detail Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dedicated detail pages for places, hotels, activities, and destinations with a shared layout shell and type-specific sections.

**Architecture:** Shared Entity Shell (Option A) — all four routes share common layout components (EntityHero, EntityActionsBar, EntityMap, EntityBreadcrumb, NearbySection). Each route has its own page file and type-specific section components. API endpoints fetch single entities by ID. Pages are server components with `generateMetadata` for SEO, hydrated client-side with React Query.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, iconoir-react, Leaflet, React Query v5, @travyl/shared types

**Spec:** `docs/superpowers/specs/2026-03-26-entity-detail-pages-design.md`

---

## File Structure Overview

### New Files

**Shared components** (`apps/web/components/entity/`):
- `EntityHero.tsx` — Full-bleed image carousel with gradient, title, overline, badges (REPLACES existing 64-line version)
- `EntityActionsBar.tsx` — Add-to-trip, favorite, share (REPLACES existing 44-line version)
- `EntityMap.tsx` — Leaflet map section (REPLACES existing 20-line version)
- `EntityBreadcrumb.tsx` — Hierarchical breadcrumb (REPLACES existing 21-line version)
- `EntitySection.tsx` — Section wrapper with Lustria heading (REPLACES existing 27-line version)
- `NearbySection.tsx` — Horizontal scroll of related entity cards (NEW)
- `EntityQuickInfo.tsx` — 2-column info grid (NEW)
- `EntityTagList.tsx` — Tag pills display (NEW)
- `EntitySkeleton.tsx` — Loading skeleton for all entity pages (NEW)
- `EntityError.tsx` — Error/404 state (NEW)
- `EntityTips.tsx` — Shared bulleted tips list (NEW, used by place + activity)
- `EntityAccessibility.tsx` — Shared accessibility badges (NEW, used by place + activity)

**Place components** (`apps/web/components/entity/place/`):
- `PlaceAbout.tsx` — Description + tags
- `PlaceQuickInfo.tsx` — Hours, price, phone, website, duration, admission
- (Uses shared `EntityTips.tsx`)
- (Uses shared `EntityAccessibility.tsx`)

**Hotel components** (`apps/web/components/entity/hotel/`):
- `HotelOverview.tsx` — Description, star rating, guest rating, tags
- `HotelStayDetails.tsx` — Address, price, check-in/out, phone, website
- `HotelGuestRatings.tsx` — Overall + 5 subcategory progress bars
- `HotelRooms.tsx` — Room type cards with photos
- `HotelAmenities.tsx` — Grouped amenities with icons

**Activity components** (`apps/web/components/entity/activity/`):
- `ActivityAbout.tsx` — Description, AI reason callout, tags
- `ActivityDetails.tsx` — Duration, price, meeting point, times, group size, languages
- `ActivityInclusions.tsx` — Included/not-included checklist
- (Uses shared `EntityTips.tsx`)
- (Uses shared `EntityAccessibility.tsx`)

**Destination components** (`apps/web/components/entity/destination/`):
- `DestinationOverview.tsx` — Description + tags
- `DestinationQuickFacts.tsx` — Country, language, currency, timezone, best time, budget
- `DestinationTrips.tsx` — User's trips + "Plan a trip" CTA
- `DestinationTopPlaces.tsx` — Horizontal scroll of places
- `DestinationTopActivities.tsx` — Horizontal scroll of activities
- `DestinationWhereToStay.tsx` — Horizontal scroll of hotels

**Pages** (`apps/web/app/(main)/`):
- `place/[id]/page.tsx` — Place detail route (NEW)
- `hotel/[id]/page.tsx` — Hotel detail route (NEW)
- `activity/[id]/page.tsx` — Activity detail route (NEW)
- `destination/[name]/page.tsx` — Enhanced destination route (MODIFY existing)

**API routes** (`apps/web/app/api/`):
- `places/[id]/route.ts` — Single place fetch (NEW)
- `hotels/[id]/route.ts` — Single hotel fetch (NEW)
- `activities/[id]/route.ts` — Single activity fetch (NEW)
- `destinations/[name]/route.ts` — Destination metadata (NEW)

**Types** (`packages/shared/src/types/index.ts`):
- Add `ActivityDetail` interface
- Add `DestinationDetail` interface

---

## Chunk 1: Types & Shared Entity Components

### Task 1: Add new type definitions

**Files:**
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/index.ts` (ensure re-export)

- [ ] **Step 1: Add ActivityDetail type**

Add after the existing `SuggestionCard` interface (~line 541):

```typescript
export interface ActivityDetail {
  id: string
  name: string
  category: ActivityCategory
  imageUrl: string
  imageUrls?: string[]
  duration: number
  price: number | null
  currency: string
  rating: number | null
  location: string
  latitude: number
  longitude: number
  description: string
  source: 'ai' | 'search'
  relevanceScore: number
  reason?: string
  meetingPoint?: string
  availableTimes?: string[]
  groupSize?: number
  languages?: string[]
  included?: string[]
  notIncluded?: string[]
  tips?: string[]
  accessibility?: string[]
  address?: string
  phone?: string
  website?: string
}
```

- [ ] **Step 2: Add DestinationDetail type**

Add after `ActivityDetail`:

```typescript
export interface DestinationDetail {
  name: string
  country: string
  description: string
  language: string
  currency: string
  timezone: string
  bestTimeToVisit: string
  budgetLevel: 1 | 2 | 3 | 4
  tags: string[]
  image: string
  images?: string[]
  latitude: number
  longitude: number
  population?: string
}
```

- [ ] **Step 3: Add EntityImage helper type for normalization**

```typescript
export interface NormalizedEntity {
  name: string
  images: string[]
  overline: string
  rating: number | null
  priceLevel?: number | null
  href: string
}
```

- [ ] **Step 4: Verify exports**

Check `packages/shared/src/index.ts` re-exports from `./types`. If it uses `export * from './types'`, the new types are auto-exported.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no new usage yet, just type definitions)

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat(types): add ActivityDetail, DestinationDetail, NormalizedEntity types (TRA-279)"
```

---

### Task 2: EntityHero — Full-bleed image carousel with gradient overlay

**Files:**
- Replace: `apps/web/components/entity/EntityHero.tsx` (currently 64 lines, uses lucide-react)

- [ ] **Step 1: Write EntityHero component**

```tsx
'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { NavArrowLeft, NavArrowRight } from 'iconoir-react'

interface EntityHeroProps {
  images: string[]
  title: string
  overline: string
  rating?: number | null
  reviewCount?: number
  priceLevel?: number | null
  fallbackGradient?: string
}

export function EntityHero({
  images,
  title,
  overline,
  rating,
  reviewCount,
  priceLevel,
  fallbackGradient = 'from-[#1e3a5f] to-[#2d4a6f]',
}: EntityHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  const validImages = images.filter((url) => url && !failedUrls.has(url))
  const hasImages = validImages.length > 0
  const currentImage = validImages[currentIndex] ?? null

  const goTo = useCallback(
    (dir: 'prev' | 'next') => {
      if (validImages.length <= 1) return
      setCurrentIndex((i) =>
        dir === 'next'
          ? (i + 1) % validImages.length
          : (i - 1 + validImages.length) % validImages.length
      )
    },
    [validImages.length]
  )

  const handleImageError = useCallback((url: string) => {
    setFailedUrls((prev) => new Set(prev).add(url))
    setCurrentIndex(0)
  }, [])

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/9] overflow-hidden group">
      {/* Image or gradient fallback */}
      {hasImages && currentImage ? (
        <Image
          src={currentImage}
          alt={title}
          fill
          className="object-cover"
          priority
          onError={() => handleImageError(currentImage)}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient}`} />
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f1d30] via-[#0f1d30]/40 to-transparent" />

      {/* Content positioned in lower third */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        {/* Overline */}
        <p className="font-sans text-xs font-medium tracking-widest uppercase text-white/70 mb-1">
          {overline}
        </p>
        {/* Title — Lustria */}
        <h1 className="text-3xl md:text-5xl font-serif font-normal tracking-wide text-white leading-tight">
          {title}
        </h1>
        {/* Badges row */}
        <div className="flex items-center gap-3 mt-3">
          {rating != null && (
            <span className="inline-flex items-center gap-1.5 bg-[#1e3a5f]/80 backdrop-blur-sm text-white text-sm font-medium px-3 py-1 rounded-lg">
              <span className="text-amber-400">&#9733;</span>
              {rating.toFixed(1)}
              {reviewCount != null && (
                <span className="text-white/60 text-xs">({reviewCount})</span>
              )}
            </span>
          )}
          {priceLevel != null && priceLevel > 0 && (
            <span className="inline-flex items-center gap-0.5 bg-[#1e3a5f]/80 backdrop-blur-sm text-white text-sm font-medium px-3 py-1 rounded-lg">
              {Array.from({ length: 4 }, (_, i) => (
                <span
                  key={i}
                  className={i < priceLevel ? 'text-white' : 'text-white/30'}
                >
                  $
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      {/* Carousel navigation arrows (hover-visible) */}
      {validImages.length > 1 && (
        <>
          <button
            onClick={() => goTo('prev')}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            aria-label="Previous image"
          >
            <NavArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => goTo('next')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            aria-label="Next image"
          >
            <NavArrowRight className="w-5 h-5" />
          </button>
          {/* Dot indicators */}
          <div className="absolute bottom-4 right-6 md:right-10 flex items-center gap-1.5">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-white w-4' : 'bg-white/50'
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/entity/EntityHero.tsx
git commit -m "feat(entity): replace EntityHero with full-bleed carousel + gradient overlay (TRA-279)"
```

---

### Task 3: EntityActionsBar — Add to trip, favorite, share

**Files:**
- Replace: `apps/web/components/entity/EntityActionsBar.tsx` (currently 44 lines, uses lucide-react)

- [ ] **Step 1: Write EntityActionsBar component**

```tsx
'use client'

import { useState } from 'react'
import { Heart, ShareAndroid, Plus } from 'iconoir-react'
import { useAuthStore } from '@travyl/shared'

interface EntityActionsBarProps {
  entityId: string
  entityType: 'place' | 'hotel' | 'activity' | 'destination'
  entityName: string
  /** For destination, show "Plan a Trip" instead of "Add to Trip" */
  variant?: 'default' | 'destination'
}

export function EntityActionsBar({
  entityId,
  entityType,
  entityName,
  variant = 'default',
}: EntityActionsBarProps) {
  const user = useAuthStore((s) => s.user)
  const [isFavorited, setIsFavorited] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const handleFavorite = () => {
    if (!user) {
      setShowAuthPrompt(true)
      return
    }
    setIsFavorited((prev) => !prev)
    // TODO: persist to favorite_places table
  }

  const handleAddToTrip = () => {
    if (!user) {
      setShowAuthPrompt(true)
      return
    }
    // TODO: open trip picker dropdown
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: entityName, url })
    } else {
      await navigator.clipboard.writeText(url)
      // TODO: show toast "Link copied"
    }
  }

  return (
    <div className="flex items-center gap-3 px-6 md:px-10 py-4 border-b border-gray-200">
      {/* Primary action */}
      <button
        onClick={handleAddToTrip}
        className="inline-flex items-center gap-2 bg-[#003594] hover:bg-[#002B7A] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
      >
        <Plus className="w-4 h-4" />
        {variant === 'destination' ? 'Plan a Trip' : 'Add to Trip'}
      </button>

      {/* Favorite */}
      <button
        onClick={handleFavorite}
        className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-colors ${
          isFavorited
            ? 'bg-red-50 border-red-200 text-red-500'
            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500' : ''}`} />
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
        aria-label="Share"
      >
        <ShareAndroid className="w-5 h-5" />
      </button>

      {/* Auth prompt */}
      {showAuthPrompt && (
        <div className="ml-auto text-sm text-gray-500">
          <a href="/login" className="text-[#003594] hover:underline font-medium">
            Sign in
          </a>{' '}
          to save this {entityType}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/entity/EntityActionsBar.tsx
git commit -m "feat(entity): replace EntityActionsBar with add-to-trip/favorite/share (TRA-279)"
```

---

### Task 4: EntityBreadcrumb — Hierarchical navigation

**Files:**
- Replace: `apps/web/components/entity/EntityBreadcrumb.tsx` (currently 21 lines, uses lucide-react)

- [ ] **Step 1: Write EntityBreadcrumb component**

```tsx
import Link from 'next/link'
import { NavArrowRight } from 'iconoir-react'

interface BreadcrumbItem {
  label: string
  href: string
}

interface EntityBreadcrumbProps {
  items: BreadcrumbItem[]
  current: string
}

export function EntityBreadcrumb({ items, current }: EntityBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 px-6 md:px-10 py-3 text-sm" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <Link
            href={item.href}
            className="text-gray-500 hover:text-[#003594] transition-colors"
          >
            {item.label}
          </Link>
          <NavArrowRight className="w-3.5 h-3.5 text-gray-400" />
        </span>
      ))}
      <span className="text-gray-900 font-medium truncate">{current}</span>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/entity/EntityBreadcrumb.tsx
git commit -m "feat(entity): replace EntityBreadcrumb with hierarchical nav (TRA-279)"
```

---

### Task 5: EntitySection — Section wrapper with Lustria heading

**Files:**
- Replace: `apps/web/components/entity/EntitySection.tsx` (currently 27 lines, uses lucide-react)

- [ ] **Step 1: Write EntitySection component**

```tsx
interface EntitySectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function EntitySection({ title, children, className = '' }: EntitySectionProps) {
  return (
    <section className={`px-6 md:px-10 py-6 ${className}`}>
      <h2 className="text-2xl font-serif font-normal text-[#1e3a5f] tracking-wide mb-4">
        {title}
      </h2>
      {children}
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/entity/EntitySection.tsx
git commit -m "feat(entity): replace EntitySection with Lustria heading wrapper (TRA-279)"
```

---

### Task 6: EntityMap — Leaflet map section

**Files:**
- Replace: `apps/web/components/entity/EntityMap.tsx` (currently 20 lines)

- [ ] **Step 1: Write EntityMap component**

```tsx
'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'iconoir-react'

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false })

interface EntityMapProps {
  latitude: number
  longitude: number
  address?: string | null
  name: string
}

export function EntityMap({ latitude, longitude, address, name }: EntityMapProps) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`

  return (
    <section className="px-6 md:px-10 py-6">
      <h2 className="text-2xl font-serif font-normal text-[#1e3a5f] tracking-wide mb-4">
        Location
      </h2>
      {address && (
        <div className="flex items-start gap-2 mb-4">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-600">{address}</p>
        </div>
      )}
      <div className="rounded-xl overflow-hidden border border-gray-200 h-64 md:h-80">
        <LeafletMap
          lat={latitude}
          lng={longitude}
          zoom={15}
          label={name}
        />
      </div>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-[#003594] hover:underline mt-3"
      >
        <MapPin className="w-3.5 h-3.5" />
        Open in Google Maps
      </a>
    </section>
  )
}
```

Note: Uses the existing `leaflet-map.tsx` component at `@/components/leaflet-map`. Props are `lat`, `lng`, `zoom`, `label`. Verify during implementation and adjust if the interface has changed.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/entity/EntityMap.tsx
git commit -m "feat(entity): replace EntityMap with Leaflet section + address (TRA-279)"
```

---

### Task 7: New shared utility components

**Files:**
- Create: `apps/web/components/entity/EntityQuickInfo.tsx`
- Create: `apps/web/components/entity/EntityTagList.tsx`
- Create: `apps/web/components/entity/NearbySection.tsx`
- Create: `apps/web/components/entity/EntitySkeleton.tsx`
- Create: `apps/web/components/entity/EntityError.tsx`

- [ ] **Step 1: Write EntityQuickInfo — 2-column info grid**

```tsx
import type { ReactNode } from 'react'

interface InfoItem {
  icon: ReactNode
  label: string
  value: string | ReactNode
  href?: string
}

interface EntityQuickInfoProps {
  items: InfoItem[]
}

export function EntityQuickInfo({ items }: EntityQuickInfoProps) {
  const filtered = items.filter((item) => item.value)

  if (filtered.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filtered.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="text-gray-400 mt-0.5 shrink-0">{item.icon}</span>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {item.label}
            </p>
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#003594] hover:underline"
              >
                {item.value}
              </a>
            ) : (
              <p className="text-sm text-gray-900">{item.value}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write EntityTagList — Tag pills**

```tsx
interface EntityTagListProps {
  tags: string[]
}

export function EntityTagList({ tags }: EntityTagListProps) {
  if (!tags || tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write NearbySection — Horizontal scroll of related cards**

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { NavArrowLeft, NavArrowRight } from 'iconoir-react'
import { useRef } from 'react'

interface NearbyItem {
  id: string
  name: string
  image: string
  type: string
  rating: number | null
  href: string
}

interface NearbySectionProps {
  title: string
  items: NearbyItem[]
}

export function NearbySection({ title, items }: NearbySectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!items || items.length === 0) return null

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 280
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="px-6 md:px-10 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-serif font-normal text-[#1e3a5f] tracking-wide">
          {title}
        </h2>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 transition-colors"
            aria-label="Scroll left"
          >
            <NavArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 transition-colors"
            aria-label="Scroll right"
          >
            <NavArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex-shrink-0 w-56 snap-start rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all group"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {item.rating != null && (
                <span className="absolute top-2 right-2 bg-[#1e3a5f]/80 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-md">
                  &#9733; {item.rating.toFixed(1)}
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">{item.type}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Write EntitySkeleton — Loading state**

```tsx
export function EntitySkeleton() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="w-full aspect-[4/3] md:aspect-[16/9] bg-gray-200" />
      {/* Actions bar skeleton */}
      <div className="flex items-center gap-3 px-6 md:px-10 py-4 border-b border-gray-200">
        <div className="h-10 w-32 bg-gray-200 rounded-xl" />
        <div className="h-10 w-10 bg-gray-200 rounded-xl" />
        <div className="h-10 w-10 bg-gray-200 rounded-xl" />
      </div>
      {/* Content sections skeleton */}
      <div className="px-6 md:px-10 py-6 space-y-6">
        <div className="h-8 w-40 bg-gray-200 rounded" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write EntityError — 404 and error states**

```tsx
import Link from 'next/link'

interface EntityErrorProps {
  type: 'place' | 'hotel' | 'activity' | 'destination'
  variant: '404' | 'error'
  onRetry?: () => void
}

const listingHrefs: Record<string, string> = {
  place: '/places',
  hotel: '/places',
  activity: '/places',
  destination: '/',
}

export function EntityError({ type, variant, onRetry }: EntityErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <span className="text-3xl text-gray-400">?</span>
      </div>
      {variant === '404' ? (
        <>
          <h1 className="text-2xl font-serif font-normal text-[#1e3a5f] mb-2">
            We couldn&apos;t find this {type}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            It may have been removed or the link might be incorrect.
          </p>
          <Link
            href={listingHrefs[type]}
            className="inline-flex items-center gap-2 bg-[#003594] hover:bg-[#002B7A] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            Browse {type}s
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-serif font-normal text-[#1e3a5f] mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            We had trouble loading this {type}. Please try again.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 bg-[#003594] hover:bg-[#002B7A] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              Try again
            </button>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write EntityTips — shared bulleted tips list**

```tsx
import { EntitySection } from './EntitySection'

export function EntityTips({ tips }: { tips?: string[] }) {
  if (!tips || tips.length === 0) return null

  return (
    <EntitySection title="Tips">
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-gray-400 mt-0.5 shrink-0">&bull;</span>
            {tip}
          </li>
        ))}
      </ul>
    </EntitySection>
  )
}
```

- [ ] **Step 7: Write EntityAccessibility — shared accessibility badges**

```tsx
import { EntitySection } from './EntitySection'

export function EntityAccessibility({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null

  return (
    <EntitySection title="Accessibility">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 text-xs font-medium px-3 py-1"
          >
            <span className="text-green-500">&#10003;</span>
            {item}
          </span>
        ))}
      </div>
    </EntitySection>
  )
}
```

- [ ] **Step 8: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/entity/EntityQuickInfo.tsx apps/web/components/entity/EntityTagList.tsx apps/web/components/entity/NearbySection.tsx apps/web/components/entity/EntitySkeleton.tsx apps/web/components/entity/EntityError.tsx apps/web/components/entity/EntityTips.tsx apps/web/components/entity/EntityAccessibility.tsx
git commit -m "feat(entity): add shared QuickInfo, TagList, NearbySection, Skeleton, Error, Tips, Accessibility components (TRA-279)"
```

---

## Chunk 2: Place Detail Page

### Task 8: Place API endpoint

**Files:**
- Create: `apps/web/app/api/places/[id]/route.ts`

- [ ] **Step 1: Write single-place API route**

This endpoint fetches a single place from the existing backend places API by ID.

```typescript
import { NextRequest, NextResponse } from 'next/server'

// Re-use the mapping logic from the parent /api/places route
// Import the known cities table and backend place mapping

const BACKEND_URL = process.env.PLACES_BACKEND_URL

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing place ID' }, { status: 400 })
  }

  try {
    // Fetch from backend by ID
    const res = await fetch(`${BACKEND_URL}/places/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    const place = await res.json()

    return NextResponse.json(place, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch place' }, { status: 500 })
  }
}
```

Note: The exact backend URL and response shape depend on how `/api/places/route.ts` works. Read that file during implementation and adapt. If the backend doesn't support single-place fetch, use the existing `/api/places` endpoint with a query filter and return the first match.

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/places/\[id\]/route.ts
git commit -m "feat(api): add /api/places/[id] endpoint (TRA-279)"
```

---

### Task 9: Place section components

**Files:**
- Create: `apps/web/components/entity/place/PlaceAbout.tsx`
- Create: `apps/web/components/entity/place/PlaceQuickInfo.tsx`
- Create: `apps/web/components/entity/place/PlaceTips.tsx`
- Create: `apps/web/components/entity/place/PlaceAccessibility.tsx`

- [ ] **Step 1: Write PlaceAbout**

```tsx
import type { PlaceItem } from '@travyl/shared'
import { EntitySection } from '../EntitySection'
import { EntityTagList } from '../EntityTagList'

export function PlaceAbout({ place }: { place: PlaceItem }) {
  if (!place.description && (!place.tags || place.tags.length === 0)) return null

  return (
    <EntitySection title="About">
      {place.description && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
          {place.description}
        </p>
      )}
      {place.tagline && !place.description && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4">{place.tagline}</p>
      )}
      <EntityTagList tags={place.tags ?? []} />
    </EntitySection>
  )
}
```

- [ ] **Step 2: Write PlaceQuickInfo**

```tsx
import type { PlaceItem } from '@travyl/shared'
import { Clock, MapPin, Phone, Globe, Wallet } from 'iconoir-react'
import { EntitySection } from '../EntitySection'
import { EntityQuickInfo } from '../EntityQuickInfo'

export function PlaceQuickInfo({ place }: { place: PlaceItem }) {
  const items = [
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Hours',
      value: place.hours ?? '',
    },
    {
      icon: <Wallet className="w-4 h-4" />,
      label: 'Price',
      value: place.priceLevel
        ? Array.from({ length: 4 }, (_, i) => (i < place.priceLevel! ? '$' : '')).join('')
        : '',
    },
    {
      icon: <Phone className="w-4 h-4" />,
      label: 'Phone',
      value: place.phone ?? '',
      href: place.phone ? `tel:${place.phone}` : undefined,
    },
    {
      icon: <Globe className="w-4 h-4" />,
      label: 'Website',
      value: place.website ? (() => { try { return new URL(place.website!).hostname } catch { return place.website! } })() : '',
      href: place.website ?? undefined,
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Typical visit',
      value: place.duration ?? '',
    },
    {
      icon: <Wallet className="w-4 h-4" />,
      label: 'Admission',
      value: place.admissionFee ?? '',
    },
  ]

  const filtered = items.filter((item) => item.value)
  if (filtered.length === 0) return null

  return (
    <EntitySection title="Quick Info">
      <EntityQuickInfo items={filtered} />
    </EntitySection>
  )
}
```

Note: `Phone` and `Globe` may not exist in iconoir-react. During implementation, check available icons and use the closest match (e.g., `PhoneOutcome` for phone, `Internet` or `OpenNewWindow` for website). Use the existing codebase patterns as reference.

- [ ] **Step 3: (PlaceTips and PlaceAccessibility use shared EntityTips and EntityAccessibility — created in Task 7)**

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/entity/place/
git commit -m "feat(place): add PlaceAbout, PlaceQuickInfo, PlaceTips, PlaceAccessibility sections (TRA-279)"
```

---

### Task 10: Place detail page route

**Files:**
- Create: `apps/web/app/(main)/place/[id]/page.tsx`

- [ ] **Step 1: Write the place detail page with generateMetadata**

```tsx
import { Metadata } from 'next'
import { PlaceDetailClient } from './PlaceDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchPlace(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/places/${id}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const place = await fetchPlace(id)

  if (!place) {
    return { title: 'Place Not Found | Travyl' }
  }

  return {
    title: `${place.name}${place.address ? ` - ${place.address}` : ''} | Travyl`,
    description: place.description?.slice(0, 160) || place.tagline || `Discover ${place.name} on Travyl`,
    alternates: { canonical: `/place/${id}` },
    openGraph: {
      type: 'website',
      title: place.name,
      description: place.description?.slice(0, 160) || place.tagline,
      images: place.images?.[0] || place.image ? [{ url: place.images?.[0] || place.image }] : [],
    },
  }
}

export default async function PlaceDetailPage({ params }: PageProps) {
  const { id } = await params
  const place = await fetchPlace(id)

  return <PlaceDetailClient initialPlace={place} placeId={id} />
}
```

- [ ] **Step 2: Write the client component**

Create `apps/web/app/(main)/place/[id]/PlaceDetailClient.tsx`:

```tsx
'use client'

import type { PlaceItem } from '@travyl/shared'
import { EntityHero } from '@/components/entity/EntityHero'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityMap } from '@/components/entity/EntityMap'
import { NearbySection } from '@/components/entity/NearbySection'
import { EntitySkeleton } from '@/components/entity/EntitySkeleton'
import { EntityError } from '@/components/entity/EntityError'
import { PlaceAbout } from '@/components/entity/place/PlaceAbout'
import { PlaceQuickInfo } from '@/components/entity/place/PlaceQuickInfo'
import { EntityTips } from '@/components/entity/EntityTips'
import { EntityAccessibility } from '@/components/entity/EntityAccessibility'

interface PlaceDetailClientProps {
  initialPlace: PlaceItem | null
  placeId: string
}

export function PlaceDetailClient({ initialPlace, placeId }: PlaceDetailClientProps) {
  // TODO: React Query hydration from initialPlace for client-side interactivity
  const place = initialPlace

  if (!place) {
    return <EntityError type="place" variant="404" />
  }

  const images = [place.image, ...(place.images ?? [])].filter(Boolean)
  const overline = [place.category?.toUpperCase(), place.address?.split(',').pop()?.trim()]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="min-h-screen bg-white">
      <EntityBreadcrumb
        items={[
          { label: 'Places', href: '/places' },
        ]}
        current={place.name}
      />

      <EntityHero
        images={images}
        title={place.name}
        overline={overline}
        rating={place.rating}
        reviewCount={place.reviewCount}
        priceLevel={place.priceLevel}
      />

      <EntityActionsBar
        entityId={placeId}
        entityType="place"
        entityName={place.name}
      />

      <PlaceAbout place={place} />
      <PlaceQuickInfo place={place} />
      <EntityTips tips={place.tips} />
      <EntityAccessibility items={place.accessibility} />

      {place.latitude != null && place.longitude != null && (
        <EntityMap
          latitude={place.latitude}
          longitude={place.longitude}
          address={place.address}
          name={place.name}
        />
      )}

      {/* NearbySection will be wired when nearby API is ready */}
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(main\)/place/
git commit -m "feat(place): add /place/[id] detail page with SSR metadata (TRA-279)"
```

---

## Chunk 3: Hotel Detail Page

### Task 11: Hotel API endpoint

**Files:**
- Create: `apps/web/app/api/hotels/[id]/route.ts`

- [ ] **Step 1: Write hotel API route**

Uses Foursquare venue lookup by ID. Read the existing `apps/web/app/api/foursquare/route.ts` to understand the Foursquare integration pattern, then adapt for single-venue fetch.

```typescript
import { NextRequest, NextResponse } from 'next/server'

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing hotel ID' }, { status: 400 })
  }

  try {
    // Try Foursquare venue details endpoint
    const res = await fetch(`https://api.foursquare.com/v3/places/${id}`, {
      headers: {
        Accept: 'application/json',
        Authorization: FSQ_API_KEY ?? '',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
    }

    const venue = await res.json()

    // Also fetch photos
    const photosRes = await fetch(
      `https://api.foursquare.com/v3/places/${id}/photos?limit=10`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: FSQ_API_KEY ?? '',
        },
      }
    )
    const photos = photosRes.ok ? await photosRes.json() : []

    // Map to hotel detail shape
    const hotel = {
      id: venue.fsq_id,
      name: venue.name,
      address: venue.location?.formatted_address ?? venue.location?.address ?? null,
      latitude: venue.geocodes?.main?.latitude ?? null,
      longitude: venue.geocodes?.main?.longitude ?? null,
      rating: venue.rating ? venue.rating / 2 : null, // Foursquare is 0-10, normalize to 0-5
      starRating: venue.stats?.total_ratings ? Math.min(5, Math.round(venue.rating / 2)) : null,
      phone: venue.tel ?? null,
      website: venue.website ?? null,
      description: venue.description ?? venue.tastes?.join(', ') ?? null,
      images: photos.map?.((p: { prefix: string; suffix: string }) =>
        `${p.prefix}original${p.suffix}`
      ) ?? [],
      categories: venue.categories?.map?.((c: { name: string }) => c.name) ?? [],
      hours: venue.hours?.display ?? null,
      price: venue.price ?? null,
    }

    return NextResponse.json(hotel, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch hotel' }, { status: 500 })
  }
}
```

Note: Adapt the Foursquare response mapping based on the actual API response structure. The existing `services/lib/foursquare.ts` has the enrichment pattern — reference it.

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/hotels/\[id\]/route.ts
git commit -m "feat(api): add /api/hotels/[id] Foursquare venue endpoint (TRA-279)"
```

---

### Task 12: Hotel section components

**Files:**
- Create: `apps/web/components/entity/hotel/HotelOverview.tsx`
- Create: `apps/web/components/entity/hotel/HotelStayDetails.tsx`
- Create: `apps/web/components/entity/hotel/HotelGuestRatings.tsx`
- Create: `apps/web/components/entity/hotel/HotelRooms.tsx`
- Create: `apps/web/components/entity/hotel/HotelAmenities.tsx`

- [ ] **Step 1: Write HotelOverview**

```tsx
import { EntitySection } from '../EntitySection'
import { EntityTagList } from '../EntityTagList'
import { Star } from 'iconoir-react'

interface HotelOverviewProps {
  description?: string | null
  starRating?: number | null
  guestRating?: number | null
  reviewCount?: number
  tags?: string[]
}

export function HotelOverview({
  description,
  starRating,
  guestRating,
  reviewCount,
  tags,
}: HotelOverviewProps) {
  if (!description && !starRating && !guestRating) return null

  return (
    <EntitySection title="Overview">
      {/* Star rating */}
      {starRating != null && starRating > 0 && (
        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < starRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
              }`}
            />
          ))}
          <span className="text-sm text-gray-500 ml-1">{starRating}-star hotel</span>
        </div>
      )}

      {/* Guest rating inline */}
      {guestRating != null && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#1e3a5f] text-white font-semibold text-sm">
            {guestRating.toFixed(1)}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {guestRating >= 4.5 ? 'Excellent' : guestRating >= 4.0 ? 'Very Good' : guestRating >= 3.5 ? 'Good' : 'Fair'}
            </p>
            {reviewCount != null && (
              <p className="text-xs text-gray-500">{reviewCount} reviews</p>
            )}
          </div>
        </div>
      )}

      {description && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4">{description}</p>
      )}

      <EntityTagList tags={tags ?? []} />
    </EntitySection>
  )
}
```

- [ ] **Step 2: Write HotelStayDetails**

```tsx
import { MapPin, Clock, Wallet, Globe, Phone } from 'iconoir-react'
import { EntitySection } from '../EntitySection'
import { EntityQuickInfo } from '../EntityQuickInfo'

interface HotelStayDetailsProps {
  address?: string | null
  pricePerNight?: number | null
  currency?: string | null
  checkIn?: string | null
  checkOut?: string | null
  phone?: string | null
  website?: string | null
}

export function HotelStayDetails({
  address,
  pricePerNight,
  currency,
  checkIn,
  checkOut,
  phone,
  website,
}: HotelStayDetailsProps) {
  const items = [
    {
      icon: <MapPin className="w-4 h-4" />,
      label: 'Address',
      value: address ?? '',
    },
    {
      icon: <Wallet className="w-4 h-4" />,
      label: 'Price',
      value: pricePerNight != null ? `${currency ?? '$'}${pricePerNight}/night` : '',
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Check-in',
      value: checkIn ?? '',
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Check-out',
      value: checkOut ?? '',
    },
    ...(phone ? [{
      icon: <Phone className="w-4 h-4" />,
      label: 'Phone',
      value: phone,
      href: `tel:${phone}`,
    }] : []),
    ...(website ? [{
      icon: <Globe className="w-4 h-4" />,
      label: 'Website',
      value: (() => { try { return new URL(website).hostname } catch { return website } })(),
      href: website,
    }] : []),
  ]

  const filtered = items.filter((item) => item.value)
  if (filtered.length === 0) return null

  return (
    <EntitySection title="Stay Details">
      <EntityQuickInfo items={filtered} />
    </EntitySection>
  )
}
```

Note: `Globe` may not exist in iconoir-react. Use `Internet` or `OpenNewWindow` instead — check during implementation.

- [ ] **Step 3: Write HotelGuestRatings**

```tsx
import { EntitySection } from '../EntitySection'

interface RatingCategory {
  label: string
  score: number
}

interface HotelGuestRatingsProps {
  overall: number
  reviewCount?: number
  categories?: RatingCategory[]
}

export function HotelGuestRatings({ overall, reviewCount, categories }: HotelGuestRatingsProps) {
  if (!categories || categories.length === 0) return null

  return (
    <EntitySection title="Guest Ratings">
      <div className="flex items-center gap-4 mb-6">
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#1e3a5f] text-white font-bold text-2xl">
          {overall.toFixed(1)}
        </span>
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {overall >= 4.5 ? 'Excellent' : overall >= 4.0 ? 'Very Good' : overall >= 3.5 ? 'Good' : 'Fair'}
          </p>
          {reviewCount != null && (
            <p className="text-sm text-gray-500">Based on {reviewCount} reviews</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.label} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-24 shrink-0">{cat.label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#003594] rounded-full transition-all"
                style={{ width: `${(cat.score / 5) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 w-8 text-right">
              {cat.score.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </EntitySection>
  )
}
```

- [ ] **Step 4: Write HotelRooms**

```tsx
import Image from 'next/image'
import type { RoomType } from '@travyl/shared'
import { EntitySection } from '../EntitySection'

interface HotelRoomsProps {
  rooms?: RoomType[]
  currency?: string
}

export function HotelRooms({ rooms, currency = '$' }: HotelRoomsProps) {
  if (!rooms || rooms.length === 0) return null

  return (
    <EntitySection title="Rooms">
      <div className="space-y-4">
        {rooms.map((room, i) => (
          <div
            key={i}
            className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
          >
            {/* Room image */}
            <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden shrink-0">
              <Image
                src={room.image}
                alt={room.type}
                fill
                className="object-cover"
              />
            </div>

            {/* Room details */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{room.type}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {[room.beds, room.size, `${room.guests} guest${room.guests > 1 ? 's' : ''}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {room.amenities && room.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {room.amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-gray-100 text-gray-600 text-xs px-2 py-0.5"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price */}
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold text-gray-900">
                {currency}{room.price}
              </p>
              <p className="text-xs text-gray-500">per night</p>
            </div>
          </div>
        ))}
      </div>
    </EntitySection>
  )
}
```

- [ ] **Step 5: Write HotelAmenities**

```tsx
import { EntitySection } from '../EntitySection'

interface AmenityGroup {
  category: string
  items: string[]
}

interface HotelAmenitiesProps {
  groups?: AmenityGroup[]
}

export function HotelAmenities({ groups }: HotelAmenitiesProps) {
  if (!groups || groups.length === 0) return null

  return (
    <EntitySection title="Amenities">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{group.category}</h3>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003594] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </EntitySection>
  )
}
```

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/entity/hotel/
git commit -m "feat(hotel): add Overview, StayDetails, GuestRatings, Rooms, Amenities sections (TRA-279)"
```

---

### Task 13: Hotel detail page route

**Files:**
- Create: `apps/web/app/(main)/hotel/[id]/page.tsx`
- Create: `apps/web/app/(main)/hotel/[id]/HotelDetailClient.tsx`

- [ ] **Step 1: Write hotel page with generateMetadata**

```tsx
import { Metadata } from 'next'
import { HotelDetailClient } from './HotelDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchHotel(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/hotels/${id}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const hotel = await fetchHotel(id)

  if (!hotel) {
    return { title: 'Hotel Not Found | Travyl' }
  }

  return {
    title: `${hotel.name}${hotel.address ? ` - ${hotel.address}` : ''} | Travyl`,
    description: hotel.description?.slice(0, 160) || `Book ${hotel.name} on Travyl`,
    alternates: { canonical: `/hotel/${id}` },
    openGraph: {
      type: 'website',
      title: hotel.name,
      description: hotel.description?.slice(0, 160),
      images: hotel.images?.[0] ? [{ url: hotel.images[0] }] : [],
    },
  }
}

export default async function HotelDetailPage({ params }: PageProps) {
  const { id } = await params
  const hotel = await fetchHotel(id)

  return <HotelDetailClient initialHotel={hotel} hotelId={id} />
}
```

- [ ] **Step 2: Write HotelDetailClient**

```tsx
'use client'

import { EntityHero } from '@/components/entity/EntityHero'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntityError } from '@/components/entity/EntityError'
import { HotelOverview } from '@/components/entity/hotel/HotelOverview'
import { HotelStayDetails } from '@/components/entity/hotel/HotelStayDetails'
import { HotelGuestRatings } from '@/components/entity/hotel/HotelGuestRatings'
import { HotelRooms } from '@/components/entity/hotel/HotelRooms'
import { HotelAmenities } from '@/components/entity/hotel/HotelAmenities'

interface HotelApiResponse {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  rating: number | null
  starRating: number | null
  phone: string | null
  website: string | null
  description: string | null
  images: string[]
  categories: string[]
  hours: string | null
  price: number | null
  image_url?: string | null
  pricePerNight?: number | null
  currency?: string | null
  checkIn?: string | null
  checkOut?: string | null
  reviewCount?: number
  ratingCategories?: { label: string; score: number }[]
  rooms?: import('@travyl/shared').RoomType[]
  amenityGroups?: { category: string; items: string[] }[]
}

interface HotelDetailClientProps {
  initialHotel: HotelApiResponse | null
  hotelId: string
}

export function HotelDetailClient({ initialHotel, hotelId }: HotelDetailClientProps) {
  const hotel = initialHotel

  if (!hotel) {
    return <EntityError type="hotel" variant="404" />
  }

  const images = [hotel.image_url, ...(hotel.images ?? [])].filter(Boolean)
  const overline = [
    'HOTEL',
    hotel.starRating ? `${hotel.starRating}★` : null,
    hotel.address?.split(',').pop()?.trim(),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="min-h-screen bg-white">
      <EntityBreadcrumb
        items={[{ label: 'Hotels', href: '/places' }]}
        current={hotel.name}
      />

      <EntityHero
        images={images}
        title={hotel.name}
        overline={overline}
        rating={hotel.rating}
        reviewCount={hotel.reviewCount}
        priceLevel={hotel.price}
      />

      <EntityActionsBar
        entityId={hotelId}
        entityType="hotel"
        entityName={hotel.name}
      />

      <HotelOverview
        description={hotel.description}
        starRating={hotel.starRating}
        guestRating={hotel.rating}
        reviewCount={hotel.reviewCount}
        tags={hotel.categories}
      />

      <HotelStayDetails
        address={hotel.address}
        pricePerNight={hotel.pricePerNight}
        currency={hotel.currency}
        checkIn={hotel.checkIn}
        checkOut={hotel.checkOut}
        phone={hotel.phone}
        website={hotel.website}
      />

      <HotelGuestRatings
        overall={hotel.rating ?? 0}
        reviewCount={hotel.reviewCount}
        categories={hotel.ratingCategories}
      />

      <HotelRooms rooms={hotel.rooms} currency={hotel.currency} />

      <HotelAmenities groups={hotel.amenityGroups} />

      {hotel.latitude != null && hotel.longitude != null && (
        <EntityMap
          latitude={hotel.latitude}
          longitude={hotel.longitude}
          address={hotel.address}
          name={hotel.name}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(main\)/hotel/
git commit -m "feat(hotel): add /hotel/[id] detail page with SSR metadata (TRA-279)"
```

---

## Chunk 4: Activity Detail Page

### Task 14: Activity API endpoint

**Files:**
- Create: `apps/web/app/api/activities/[id]/route.ts`

- [ ] **Step 1: Write activity API route**

Uses SerpAPI place_id for stable lookups. Read `apps/web/app/api/suggest/route.ts` to understand the existing SerpAPI integration, then adapt for single-activity fetch.

```typescript
import { NextRequest, NextResponse } from 'next/server'

const SERP_API_KEY = process.env.SERP_API_KEY

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing activity ID' }, { status: 400 })
  }

  // Strip 'serp-' prefix if present
  const placeId = id.startsWith('serp-') ? id.slice(5) : id

  try {
    // Use SerpAPI Google Maps place details
    const serpUrl = new URL('https://serpapi.com/search.json')
    serpUrl.searchParams.set('engine', 'google_maps')
    serpUrl.searchParams.set('place_id', placeId)
    serpUrl.searchParams.set('api_key', SERP_API_KEY ?? '')

    const res = await fetch(serpUrl.toString())

    if (!res.ok) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const data = await res.json()
    const place = data.place_results

    if (!place) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const activity = {
      id: `serp-${placeId}`,
      name: place.title ?? place.name ?? 'Unknown',
      category: place.type ?? 'activity',
      imageUrl: place.thumbnail ?? '',
      imageUrls: place.images?.map((img: { image: string }) => img.image) ?? [],
      duration: place.visit_duration_min ? place.visit_duration_min / 60 : 2,
      price: place.price ? parseFloat(place.price.replace(/[^0-9.]/g, '')) : null,
      currency: '$',
      rating: place.rating ?? null,
      reviewCount: place.reviews ?? null,
      location: place.address ?? '',
      latitude: place.gps_coordinates?.latitude ?? 0,
      longitude: place.gps_coordinates?.longitude ?? 0,
      description: place.description ?? place.snippet ?? '',
      source: 'search' as const,
      relevanceScore: 1,
      address: place.address ?? null,
      phone: place.phone ?? null,
      website: place.website ?? null,
      hours: place.operating_hours ?? null,
    }

    return NextResponse.json(activity, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
```

Note: The exact SerpAPI response shape for Google Maps place details may differ. Adapt the mapping during implementation based on actual response data.

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/activities/\[id\]/route.ts
git commit -m "feat(api): add /api/activities/[id] SerpAPI place details endpoint (TRA-279)"
```

---

### Task 15: Activity section components

**Files:**
- Create: `apps/web/components/entity/activity/ActivityAbout.tsx`
- Create: `apps/web/components/entity/activity/ActivityDetails.tsx`
- Create: `apps/web/components/entity/activity/ActivityInclusions.tsx`
- Create: `apps/web/components/entity/activity/ActivityTips.tsx`
- Create: `apps/web/components/entity/activity/ActivityAccessibility.tsx`

- [ ] **Step 1: Write ActivityAbout**

```tsx
import type { ActivityDetail } from '@travyl/shared'
import { EntitySection } from '../EntitySection'
import { EntityTagList } from '../EntityTagList'

export function ActivityAbout({ activity }: { activity: ActivityDetail }) {
  return (
    <EntitySection title="About">
      {/* AI recommendation callout */}
      {activity.source === 'ai' && activity.reason && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
          <p className="text-sm text-[#003594]">
            <span className="font-medium">Recommended for you:</span>{' '}
            {activity.reason}
          </p>
        </div>
      )}

      {activity.description && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
          {activity.description}
        </p>
      )}

      <EntityTagList tags={activity.category ? [activity.category] : []} />
    </EntitySection>
  )
}
```

- [ ] **Step 2: Write ActivityDetails**

```tsx
import type { ActivityDetail } from '@travyl/shared'
import { Clock, Wallet, MapPin, Group, Language } from 'iconoir-react'
import { EntitySection } from '../EntitySection'
import { EntityQuickInfo } from '../EntityQuickInfo'

export function ActivityDetails({ activity }: { activity: ActivityDetail }) {
  const items = [
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Duration',
      value: activity.duration
        ? activity.duration >= 1
          ? `${activity.duration} hour${activity.duration > 1 ? 's' : ''}`
          : `${Math.round(activity.duration * 60)} minutes`
        : '',
    },
    {
      icon: <Wallet className="w-4 h-4" />,
      label: 'Price',
      value:
        activity.price != null
          ? `${activity.currency ?? '$'}${activity.price}/person`
          : 'Free',
    },
    {
      icon: <MapPin className="w-4 h-4" />,
      label: 'Meeting point',
      value: activity.meetingPoint ?? activity.location ?? '',
    },
    ...(activity.availableTimes?.length
      ? [
          {
            icon: <Clock className="w-4 h-4" />,
            label: 'Available times',
            value: activity.availableTimes.join(', '),
          },
        ]
      : []),
    ...(activity.groupSize
      ? [
          {
            icon: <Group className="w-4 h-4" />,
            label: 'Group size',
            value: `Up to ${activity.groupSize}`,
          },
        ]
      : []),
    ...(activity.languages?.length
      ? [
          {
            icon: <Language className="w-4 h-4" />,
            label: 'Languages',
            value: activity.languages.join(', '),
          },
        ]
      : []),
  ]

  const filtered = items.filter((item) => item.value)
  if (filtered.length === 0) return null

  return (
    <EntitySection title="Details">
      <EntityQuickInfo items={filtered} />
    </EntitySection>
  )
}
```

- [ ] **Step 3: Write ActivityInclusions**

```tsx
import { EntitySection } from '../EntitySection'

interface ActivityInclusionsProps {
  included?: string[]
  notIncluded?: string[]
}

export function ActivityInclusions({ included, notIncluded }: ActivityInclusionsProps) {
  if ((!included || included.length === 0) && (!notIncluded || notIncluded.length === 0)) {
    return null
  }

  return (
    <EntitySection title="What's Included">
      <div className="space-y-2">
        {included?.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm">
            <span className="text-green-500 shrink-0">&#10003;</span>
            <span className="text-gray-700">{item}</span>
          </div>
        ))}
        {notIncluded?.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm">
            <span className="text-red-400 shrink-0">&#10007;</span>
            <span className="text-gray-500">{item}</span>
          </div>
        ))}
      </div>
    </EntitySection>
  )
}
```

- [ ] **Step 4: (ActivityTips and ActivityAccessibility use shared EntityTips and EntityAccessibility — created in Task 7)**

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/entity/activity/
git commit -m "feat(activity): add About, Details, Inclusions, Tips, Accessibility sections (TRA-279)"
```

---

### Task 16: Activity detail page route

**Files:**
- Create: `apps/web/app/(main)/activity/[id]/page.tsx`
- Create: `apps/web/app/(main)/activity/[id]/ActivityDetailClient.tsx`

- [ ] **Step 1: Write activity page with generateMetadata**

Follow the same pattern as Task 10 (place page). Server component fetches from `/api/activities/{id}`, passes to `ActivityDetailClient`.

```tsx
import { Metadata } from 'next'
import { ActivityDetailClient } from './ActivityDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchActivity(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/activities/${id}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const activity = await fetchActivity(id)

  if (!activity) {
    return { title: 'Activity Not Found | Travyl' }
  }

  return {
    title: `${activity.name}${activity.location ? ` - ${activity.location}` : ''} | Travyl`,
    description: activity.description?.slice(0, 160) || `Discover ${activity.name} on Travyl`,
    alternates: { canonical: `/activity/${id}` },
    openGraph: {
      type: 'website',
      title: activity.name,
      description: activity.description?.slice(0, 160),
      images: activity.imageUrl ? [{ url: activity.imageUrl }] : [],
    },
  }
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params
  const activity = await fetchActivity(id)

  return <ActivityDetailClient initialActivity={activity} activityId={id} />
}
```

- [ ] **Step 2: Write ActivityDetailClient**

```tsx
'use client'

import type { ActivityDetail } from '@travyl/shared'
import { EntityHero } from '@/components/entity/EntityHero'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntityError } from '@/components/entity/EntityError'
import { ActivityAbout } from '@/components/entity/activity/ActivityAbout'
import { ActivityDetails } from '@/components/entity/activity/ActivityDetails'
import { ActivityInclusions } from '@/components/entity/activity/ActivityInclusions'
import { EntityTips } from '@/components/entity/EntityTips'
import { EntityAccessibility } from '@/components/entity/EntityAccessibility'

interface ActivityDetailClientProps {
  initialActivity: ActivityDetail | null
  activityId: string
}

export function ActivityDetailClient({ initialActivity, activityId }: ActivityDetailClientProps) {
  const activity = initialActivity

  if (!activity) {
    return <EntityError type="activity" variant="404" />
  }

  const images = [activity.imageUrl, ...(activity.imageUrls ?? [])].filter(Boolean)
  const overline = [activity.category?.toUpperCase(), activity.location?.split(',').pop()?.trim()]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="min-h-screen bg-white">
      <EntityBreadcrumb
        items={[{ label: 'Activities', href: '/places' }]}
        current={activity.name}
      />

      <EntityHero
        images={images}
        title={activity.name}
        overline={overline}
        rating={activity.rating}
      />

      <EntityActionsBar
        entityId={activityId}
        entityType="activity"
        entityName={activity.name}
      />

      <ActivityAbout activity={activity} />
      <ActivityDetails activity={activity} />
      <ActivityInclusions
        included={activity.included}
        notIncluded={activity.notIncluded}
      />
      <EntityTips tips={activity.tips} />
      <EntityAccessibility items={activity.accessibility} />

      {activity.latitude != null && activity.longitude != null && (
        <EntityMap
          latitude={activity.latitude}
          longitude={activity.longitude}
          address={activity.address}
          name={activity.name}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(main\)/activity/
git commit -m "feat(activity): add /activity/[id] detail page with SSR metadata (TRA-279)"
```

---

## Chunk 5: Destination Detail Page (Enhance Existing)

### Task 17: Destination API endpoint

**Files:**
- Create: `apps/web/app/api/destinations/[name]/route.ts`

- [ ] **Step 1: Write destination metadata API**

Hardcoded metadata for popular destinations + Nominatim fallback. Reference the known cities table in `/api/places/route.ts` (101 cities) for the initial set.

```typescript
import { NextRequest, NextResponse } from 'next/server'

// Hardcoded destination metadata — expand over time
const DESTINATIONS: Record<string, {
  country: string
  description: string
  language: string
  currency: string
  timezone: string
  bestTimeToVisit: string
  budgetLevel: 1 | 2 | 3 | 4
  tags: string[]
  latitude: number
  longitude: number
  image: string
}> = {
  paris: {
    country: 'France',
    description: 'The City of Light captivates with its blend of world-class art, iconic landmarks, and vibrant cafe culture. From the Eiffel Tower to hidden Marais bistros, Paris offers endless discovery for every traveler.',
    language: 'French',
    currency: 'EUR',
    timezone: 'CET (UTC+1)',
    bestTimeToVisit: 'April - June, September - October',
    budgetLevel: 3,
    tags: ['Europe', 'Culture', 'Romance', 'Food', 'Art'],
    latitude: 48.8566,
    longitude: 2.3522,
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80',
  },
  london: {
    country: 'United Kingdom',
    description: 'A global city blending centuries of history with cutting-edge culture. Explore royal palaces, world-famous museums, vibrant markets, and a dining scene that rivals any in the world.',
    language: 'English',
    currency: 'GBP',
    timezone: 'GMT (UTC+0)',
    bestTimeToVisit: 'May - September',
    budgetLevel: 4,
    tags: ['Europe', 'Culture', 'History', 'Shopping', 'Theatre'],
    latitude: 51.5074,
    longitude: -0.1278,
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80',
  },
  tokyo: {
    country: 'Japan',
    description: 'Where ancient tradition meets neon-lit modernity. Experience serene temples, the world\'s best street food, cutting-edge technology, and a culture of precision and hospitality.',
    language: 'Japanese',
    currency: 'JPY',
    timezone: 'JST (UTC+9)',
    bestTimeToVisit: 'March - May, September - November',
    budgetLevel: 3,
    tags: ['Asia', 'Culture', 'Food', 'Technology', 'Temples'],
    latitude: 35.6762,
    longitude: 139.6503,
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80',
  },
  // Add more destinations during implementation — pull from the known cities
  // table in /api/places/route.ts and enrich with metadata
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const slug = decodeURIComponent(name).toLowerCase().replace(/-/g, ' ').trim()
  const slugKey = slug.replace(/\s+/g, '-')

  // Check hardcoded metadata
  const destination = DESTINATIONS[slug] ?? DESTINATIONS[slugKey]

  if (destination) {
    return NextResponse.json(
      { name: slug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), ...destination },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  }

  // Fallback: Nominatim geocoding for unknown destinations
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(slug)}&format=json&limit=1&accept-language=en`,
      { headers: { 'User-Agent': 'Travyl/1.0' } }
    )
    const results = await nomRes.json()

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
    }

    const result = results[0]
    const displayName = result.display_name?.split(',')[0] ?? slug

    return NextResponse.json(
      {
        name: displayName,
        country: result.display_name?.split(',').pop()?.trim() ?? '',
        description: null,
        language: '',
        currency: '',
        timezone: '',
        bestTimeToVisit: '',
        budgetLevel: null,
        tags: [],
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        image: `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80`,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch {
    return NextResponse.json({ error: 'Failed to fetch destination' }, { status: 500 })
  }
}
```

Note: Expand the `DESTINATIONS` object during implementation to cover the 99+ cities already in the known cities table. This is a starting point with 3 examples.

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/destinations/\[name\]/route.ts
git commit -m "feat(api): add /api/destinations/[name] metadata endpoint (TRA-279)"
```

---

### Task 18: Destination section components

**Files:**
- Create: `apps/web/components/entity/destination/DestinationOverview.tsx`
- Create: `apps/web/components/entity/destination/DestinationQuickFacts.tsx`
- Create: `apps/web/components/entity/destination/DestinationTrips.tsx`
- Create: `apps/web/components/entity/destination/DestinationTopPlaces.tsx`
- Create: `apps/web/components/entity/destination/DestinationTopActivities.tsx`
- Create: `apps/web/components/entity/destination/DestinationWhereToStay.tsx`

- [ ] **Step 1: Write DestinationOverview**

```tsx
import { EntitySection } from '../EntitySection'
import { EntityTagList } from '../EntityTagList'

interface DestinationOverviewProps {
  description?: string | null
  tags?: string[]
}

export function DestinationOverview({ description, tags }: DestinationOverviewProps) {
  if (!description && (!tags || tags.length === 0)) return null

  return (
    <EntitySection title="Overview">
      {description && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4">{description}</p>
      )}
      <EntityTagList tags={tags ?? []} />
    </EntitySection>
  )
}
```

- [ ] **Step 2: Write DestinationQuickFacts**

```tsx
import { MapPin, Clock, Wallet } from 'iconoir-react'
import { EntitySection } from '../EntitySection'
import { EntityQuickInfo } from '../EntityQuickInfo'

interface DestinationQuickFactsProps {
  country?: string
  language?: string
  currency?: string
  timezone?: string
  bestTimeToVisit?: string
  budgetLevel?: number | null
}

export function DestinationQuickFacts({
  country,
  language,
  currency,
  timezone,
  bestTimeToVisit,
  budgetLevel,
}: DestinationQuickFactsProps) {
  const items = [
    { icon: <MapPin className="w-4 h-4" />, label: 'Country', value: country ?? '' },
    { icon: <MapPin className="w-4 h-4" />, label: 'Language', value: language ?? '' },
    { icon: <Wallet className="w-4 h-4" />, label: 'Currency', value: currency ?? '' },
    { icon: <Clock className="w-4 h-4" />, label: 'Timezone', value: timezone ?? '' },
    { icon: <Clock className="w-4 h-4" />, label: 'Best time to visit', value: bestTimeToVisit ?? '' },
    {
      icon: <Wallet className="w-4 h-4" />,
      label: 'Budget',
      value: budgetLevel ? Array.from({ length: 4 }, (_, i) => (i < budgetLevel ? '$' : '')).join('') : '',
    },
  ]

  const filtered = items.filter((item) => item.value)
  if (filtered.length === 0) return null

  return (
    <EntitySection title="Quick Facts">
      <EntityQuickInfo items={filtered} />
    </EntitySection>
  )
}
```

- [ ] **Step 3: Write DestinationTrips**

This component shows the user's trips to this destination. Reuse logic from the existing `destination/[name]/page.tsx`.

```tsx
'use client'

import Link from 'next/link'
import { useTrips, useAuthStore } from '@travyl/shared'
import { Plus } from 'iconoir-react'
import { EntitySection } from '../EntitySection'

interface DestinationTripsProps {
  destinationName: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  planning: { bg: 'bg-blue-100', text: 'text-blue-700' },
  booked: { bg: 'bg-amber-100', text: 'text-amber-700' },
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600' },
  abandoned: { bg: 'bg-red-100', text: 'text-red-600' },
}

export function DestinationTrips({ destinationName }: DestinationTripsProps) {
  const user = useAuthStore((s) => s.user)
  const { data: trips } = useTrips()

  if (!user) return null

  const matchingTrips = trips?.filter((t) =>
    t.destination.toLowerCase().includes(destinationName.toLowerCase())
  ) ?? []

  return (
    <EntitySection title="Your Trips Here">
      {matchingTrips.length > 0 ? (
        <div className="space-y-3">
          {matchingTrips.map((trip) => {
            const colors = STATUS_COLORS[trip.status] ?? STATUS_COLORS.planning
            return (
              <Link
                key={trip.id}
                href={`/trip/${trip.id}`}
                className="block rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{trip.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{trip.destination}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    {trip.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {trip.start_date} - {trip.end_date}
                </p>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">You don&apos;t have any trips to {destinationName} yet.</p>
      )}

      <Link
        href="/trips"
        className="inline-flex items-center gap-2 mt-4 text-sm text-[#003594] hover:underline font-medium"
      >
        <Plus className="w-4 h-4" />
        Plan a new trip to {destinationName}
      </Link>
    </EntitySection>
  )
}
```

- [ ] **Step 4: Write DestinationTopPlaces, DestinationTopActivities, DestinationWhereToStay**

These three follow the same pattern — fetch from existing APIs and display as horizontal card scrolls. Use `NearbySection` component.

Create `DestinationTopPlaces.tsx`:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { NearbySection } from '../NearbySection'

interface DestinationTopPlacesProps {
  destinationName: string
  latitude: number
  longitude: number
}

export function DestinationTopPlaces({ destinationName, latitude, longitude }: DestinationTopPlacesProps) {
  const { data: places } = useQuery({
    queryKey: ['destination-places', destinationName],
    queryFn: async () => {
      const res = await fetch(
        `/api/places?q=${encodeURIComponent(destinationName)}&lat=${latitude}&lng=${longitude}&limit=8&category=sightseeing`
      )
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 30 * 60 * 1000,
  })

  const items = (places ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    image: p.image || p.images?.[0] || '',
    type: p.type || p.category || 'place',
    rating: p.rating,
    href: `/place/${p.id}`,
  }))

  if (items.length === 0) return null

  return <NearbySection title={`Top Places in ${destinationName}`} items={items} />
}
```

Create `DestinationTopActivities.tsx`:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { NearbySection } from '../NearbySection'

interface DestinationTopActivitiesProps {
  destinationName: string
}

export function DestinationTopActivities({ destinationName }: DestinationTopActivitiesProps) {
  const { data: activities } = useQuery({
    queryKey: ['destination-activities', destinationName],
    queryFn: async () => {
      const res = await fetch(
        `/api/suggest?destination=${encodeURIComponent(destinationName)}&category=sightseeing`
      )
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 30 * 60 * 1000,
  })

  const items = (activities ?? []).slice(0, 8).map((a: any) => ({
    id: a.id,
    name: a.name,
    image: a.imageUrl || a.imageUrls?.[0] || '',
    type: a.category || 'activity',
    rating: a.rating,
    href: `/activity/${a.id}`,
  }))

  if (items.length === 0) return null

  return <NearbySection title={`Top Activities in ${destinationName}`} items={items} />
}
```

Create `DestinationWhereToStay.tsx`:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { NearbySection } from '../NearbySection'

interface DestinationWhereToStayProps {
  destinationName: string
  latitude: number
  longitude: number
}

export function DestinationWhereToStay({ destinationName, latitude, longitude }: DestinationWhereToStayProps) {
  const { data: hotels } = useQuery({
    queryKey: ['destination-hotels', destinationName],
    queryFn: async () => {
      const res = await fetch(
        `/api/places?q=${encodeURIComponent(destinationName + ' hotel')}&lat=${latitude}&lng=${longitude}&limit=8&category=hotel`
      )
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 30 * 60 * 1000,
  })

  const items = (hotels ?? []).map((h: any) => ({
    id: h.id,
    name: h.name,
    image: h.image || h.images?.[0] || '',
    type: 'hotel',
    rating: h.rating,
    href: `/hotel/${h.id}`,
  }))

  if (items.length === 0) return null

  return <NearbySection title={`Where to Stay in ${destinationName}`} items={items} />
}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/entity/destination/
git commit -m "feat(destination): add Overview, QuickFacts, Trips, TopPlaces, TopActivities, WhereToStay sections (TRA-279)"
```

---

### Task 19: Enhance existing destination page

**Files:**
- Modify: `apps/web/app/(main)/destination/[name]/page.tsx`

- [ ] **Step 1: Read the existing destination page**

Read `apps/web/app/(main)/destination/[name]/page.tsx` fully to understand the current implementation before modifying.

- [ ] **Step 2: Full rewrite — replace existing client page with server component**

The existing page is a `'use client'` component using `use(params)`, Nominatim geocoding, and lucide-react icons. **Completely replace it** with a server component page + separate `DestinationDetailClient.tsx`. The Nominatim/geocoding logic moves to the `/api/destinations/[name]` endpoint (Task 17). Trip matching logic is now in `DestinationTrips` component. All lucide-react icons are dropped.

Create a server component page:

```tsx
import { Metadata } from 'next'
import { DestinationDetailClient } from './DestinationDetailClient'

interface PageProps {
  params: Promise<{ name: string }>
}

async function fetchDestination(name: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/destinations/${encodeURIComponent(name)}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params
  const destination = await fetchDestination(name)
  const displayName = destination?.name ?? decodeURIComponent(name)

  return {
    title: `${displayName}${destination?.country ? `, ${destination.country}` : ''} | Travyl`,
    description: destination?.description?.slice(0, 160) || `Plan your trip to ${displayName} with Travyl`,
    alternates: { canonical: `/destination/${name}` },
    openGraph: {
      type: 'website',
      title: displayName,
      description: destination?.description?.slice(0, 160),
      images: destination?.image ? [{ url: destination.image }] : [],
    },
  }
}

export default async function DestinationDetailPage({ params }: PageProps) {
  const { name } = await params
  const destination = await fetchDestination(name)

  return <DestinationDetailClient initialDestination={destination} slug={name} />
}
```

- [ ] **Step 3: Create DestinationDetailClient**

Create `apps/web/app/(main)/destination/[name]/DestinationDetailClient.tsx`:

```tsx
'use client'

import type { DestinationDetail } from '@travyl/shared'
import { EntityHero } from '@/components/entity/EntityHero'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntityError } from '@/components/entity/EntityError'
import { DestinationOverview } from '@/components/entity/destination/DestinationOverview'
import { DestinationQuickFacts } from '@/components/entity/destination/DestinationQuickFacts'
import { DestinationTrips } from '@/components/entity/destination/DestinationTrips'
import { DestinationTopPlaces } from '@/components/entity/destination/DestinationTopPlaces'
import { DestinationTopActivities } from '@/components/entity/destination/DestinationTopActivities'
import { DestinationWhereToStay } from '@/components/entity/destination/DestinationWhereToStay'

interface DestinationDetailClientProps {
  initialDestination: DestinationDetail | null
  slug: string
}

export function DestinationDetailClient({ initialDestination, slug }: DestinationDetailClientProps) {
  const destination = initialDestination

  if (!destination) {
    return <EntityError type="destination" variant="404" />
  }

  const images = [destination.image, ...(destination.images ?? [])].filter(Boolean)
  const overline = ['DESTINATION', destination.country].filter(Boolean).join(' · ')

  return (
    <div className="min-h-screen bg-white">
      <EntityBreadcrumb
        items={[{ label: 'Explore', href: '/' }]}
        current={destination.name}
      />

      <EntityHero
        images={images}
        title={destination.name}
        overline={overline}
      />

      <EntityActionsBar
        entityId={slug}
        entityType="destination"
        entityName={destination.name}
        variant="destination"
      />

      <DestinationOverview
        description={destination.description}
        tags={destination.tags}
      />

      <DestinationQuickFacts
        country={destination.country}
        language={destination.language}
        currency={destination.currency}
        timezone={destination.timezone}
        bestTimeToVisit={destination.bestTimeToVisit}
        budgetLevel={destination.budgetLevel}
      />

      <DestinationTrips destinationName={destination.name} />

      <DestinationTopPlaces
        destinationName={destination.name}
        latitude={destination.latitude}
        longitude={destination.longitude}
      />

      <DestinationTopActivities destinationName={destination.name} />

      <DestinationWhereToStay
        destinationName={destination.name}
        latitude={destination.latitude}
        longitude={destination.longitude}
      />

      <EntityMap
        latitude={destination.latitude}
        longitude={destination.longitude}
        name={destination.name}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(main\)/destination/
git commit -m "feat(destination): enhance /destination/[name] with entity shell and rich sections (TRA-279)"
```

---

## Chunk 6: Navigation Wiring & Final Integration

### Task 20: Wire navigation links from existing pages

**Files:**
- Modify: `apps/web/components/PlaceDetailOverlay.tsx` (or wherever place cards link)
- Modify: `apps/web/components/calendar/SuggestionCard.tsx`
- Modify: `apps/web/components/calendar/ForYouPanel.tsx`

- [ ] **Step 1: Read existing click handlers**

Read `SuggestionCard.tsx`, `ForYouPanel.tsx`, and the `/places` page to understand current click behavior. Identify where to add navigation links to the new detail pages.

- [ ] **Step 2: Add link to suggestion cards**

In `SuggestionCard.tsx`, add an "Open detail" link/icon that navigates to `/activity/{id}` (using `next/link` or `router.push`). Keep the existing click-to-open-drawer behavior but add a secondary navigation action.

- [ ] **Step 3: Add links from place browse cards**

In the `/places` page's card components, make cards link to `/place/{id}` when clicked. If the current behavior opens an overlay, add the link as a "View full page" action inside the overlay.

- [ ] **Step 4: Run typecheck and verify**

Run: `npm run typecheck`
Manually navigate to each of the 4 new routes to verify rendering.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(nav): wire entity detail page links from suggestion cards and browse pages (TRA-279)"
```

---

### Task 21: Final typecheck and cleanup

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Fix any errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Fix any lint errors.

- [ ] **Step 3: Manual smoke test**

Visit each route and verify:
- `/place/test-id` — renders place detail or 404
- `/hotel/test-id` — renders hotel detail or 404
- `/activity/test-id` — renders activity detail or 404
- `/destination/paris` — renders enhanced destination page
- All pages show correct metadata in page title
- Skeleton/error states work

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "fix(entity): typecheck and lint cleanup (TRA-279)"
```

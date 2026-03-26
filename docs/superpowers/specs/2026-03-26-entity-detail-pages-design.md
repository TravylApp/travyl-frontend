# Entity Detail Pages — Design Spec

**Date:** 2026-03-26
**Routes:** `/place/[id]`, `/hotel/[id]`, `/activity/[id]`, `/destination/[name]`

## Goal

Give every entity type (places, hotels, activities, destinations) a dedicated, shareable detail page with a consistent layout shell and type-specific content sections.

## Architecture: Shared Entity Shell + Type-Specific Sections (Option A)

All four routes share a common layout shell. Type-specific content lives in dedicated section components per entity type.

### Shared Components

| Component | Purpose |
|-----------|---------|
| `EntityHero` | Full-bleed image carousel (16:9), bottom gradient, Lustria title, overline (type + location), rating/price badges, dot indicators |
| `EntityActionsBar` | "Add to Trip" dropdown, favorite heart toggle, share button |
| `EntityMap` | Leaflet map with marker, address text, Google Maps external link |
| `EntityBreadcrumb` | Hierarchical breadcrumb (e.g. Places > Paris > Sandrini's) |
| `NearbySection` | Horizontal scroll of related entity cards |

### Shared Shell Layout

```
EntityBreadcrumb
EntityHero
EntityActionsBar
-- Type-specific sections --
EntityMap
NearbySection
```

---

## Route 1: Place Detail (`/place/[id]`)

**For:** Restaurants, cafes, bars, shops, markets.

**Sections (in order):**

1. **About** — Description text + tags as pills
2. **Quick Info** — 2-column grid: hours, price level (dots), phone (tap-to-call), website (external link), typical visit duration, admission fee
3. **Tips** — Bulleted list of visitor tips
4. **Accessibility** — Pill badges (wheelchair accessible, family friendly, etc.)

**Data source:** `PlaceItem` interface via `/api/places`. New `/api/places/[id]` endpoint for single-place fetch.

**Type definition (existing):**
```typescript
interface PlaceItem {
  id: string
  name: string
  image: string
  images?: string[]
  type: 'destination' | 'attraction' | 'restaurant' | 'experience' | 'event'
  rating: number
  tagline: string
  category: string
  description?: string
  tags?: string[]
  latitude?: number
  longitude?: number
  priceLevel?: 1 | 2 | 3 | 4
  hours?: string
  phone?: string
  website?: string
  reviewCount?: number
  address?: string
  bestTimeToVisit?: string
  duration?: string
  admissionFee?: string
  tips?: string[]
  accessibility?: string[]
  nearbyPlaces?: string[]
}
```

---

## Route 2: Hotel Detail (`/hotel/[id]`)

**For:** Hotels, hostels, resorts, Airbnbs.

**Sections (in order):**

1. **Overview** — Description, star rating display, guest rating score, tags as pills
2. **Stay Details** — 2-column grid: address, price per night, check-in/out times, phone, website
3. **Guest Ratings** — Overall score + 5 subcategory bars (cleanliness, service, location, comfort, value) with visual progress bars and review count
4. **Rooms** — Card per room type: photo, room name, bed config, size, max guests, price/night, feature list, amenity chips
5. **Amenities** — Grouped by category (Room, Dining, Wellness, Services) with icon per item

**Data source:** `HotelSearchResult` / `MockHotelDetail` interfaces. New `/api/hotels/[id]` endpoint. Existing `HotelSection` and `HotelListView` components have much of this UI — extract and adapt.

**Key types (existing):**
```typescript
interface HotelData {
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  check_in: string
  check_out: string
  price_per_night: number | null
  total_price: number | null
  currency: string | null
  rating: number | null
  star_rating: number | null
  image_url: string | null
  booking_ref: string | null
  offer_id: string | null
}

interface RoomType {
  type: string
  beds: string
  size: string
  guests: number
  price: number
  features?: string[]
  image: string
  images?: string[]
  amenities?: string[]
}
```

---

## Route 3: Activity Detail (`/activity/[id]`)

**For:** Tours, experiences, attractions, events.

**Sections (in order):**

1. **About** — Description, AI recommendation reason (if source: 'ai', shown in a tinted callout card), tags as pills
2. **Details** — 2-column grid: duration, price per person, meeting point, available times, group size, languages
3. **What's Included** — Checklist with check/cross icons for included/not-included items
4. **Tips** — Bulleted visitor tips
5. **Accessibility** — Pill badges

**Data source:** `SuggestionCard` interface via `/api/suggest`. New `/api/activities/[id]` endpoint. Extend `SuggestionCard` with optional fields:

See standalone `ActivityDetail` type in the Type Definitions section below.

---

## Route 4: Destination Detail (`/destination/[name]`)

**For:** Cities, regions, countries.

**Enhances** the existing `/destination/[name]` page which currently only shows matching user trips.

**Sections (in order):**

1. **Overview** — Description text, tags as pills (Europe, Culture, Romance, etc.)
2. **Quick Facts** — 2-column grid: country, language, currency, timezone, best time to visit, budget level
3. **Your Trips Here** — Existing trip cards for this destination + "Plan a new trip to [destination]" CTA
4. **Top Places** — Horizontal scroll of PlaceCards, "View all places in [destination]" link
5. **Top Activities** — Horizontal scroll of ActivityCards, "View all activities in [destination]" link
6. **Where to Stay** — Horizontal scroll of HotelCards, "View all hotels in [destination]" link

**Actions bar difference:** Shows "Plan a Trip" button instead of "Add to Trip".

**Data source:** New `/api/destinations/[name]` endpoint for metadata (description, quick facts). Top places/activities/hotels from existing `/api/places` and `/api/suggest` endpoints filtered by destination. Existing trip query for user's trips.

**New type:**
```typescript
interface DestinationDetail {
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

---

## New API Endpoints

| Endpoint | Method | Source | Cache |
|----------|--------|-------|-------|
| `/api/places/[id]` | GET | Existing places API, fetch by ID | 1h browser, 24h stale |
| `/api/hotels/[id]` | GET | Foursquare/SerpAPI enrichment | 1h browser, 24h stale |
| `/api/activities/[id]` | GET | SerpAPI + enrichment | 1h browser, 24h stale |
| `/api/destinations/[name]` | GET | Hardcoded metadata + aggregation | 1h browser, 24h stale |

---

## Design System Application

All pages follow the Travyl product design system (Context B):

- **Hero:** Full-bleed photography, `object-fit: cover`, bottom gradient `linear-gradient(to top, #0f1d30 0%, transparent 60%)`, white text only on photos
- **Title:** Lustria serif, `text-4xl font-serif font-normal tracking-wide`, white on hero
- **Overline:** Satoshi, uppercase, `text-xs font-medium tracking-widest`, `rgba(255,255,255,0.7)` on hero
- **Section headings:** Lustria, `text-2xl font-serif font-normal text-[#1e3a5f]`
- **Body/UI text:** Satoshi, `font-sans`, Gray[900] for primary, Gray[500] for secondary
- **Cards:** `rounded-xl border border-gray-200` with hover `border-gray-300`
- **CTAs:** Blue[600] `#003594` primary, Amber `#F59E0B` for prominent actions
- **Tags/pills:** `rounded-full bg-gray-100 text-gray-600 text-xs px-3 py-1`
- **Icons:** iconoir-react (not lucide — per project convention)
- **Rating badges:** Navy bg with white text, `rounded-lg`
- **Price dots:** Filled/unfilled circles for price level visualization
- **Map:** Leaflet with navy-tinted marker

---

## File Structure

```
apps/web/
  app/(main)/
    place/[id]/page.tsx          # Place detail route
    hotel/[id]/page.tsx          # Hotel detail route
    activity/[id]/page.tsx       # Activity detail route
    destination/[name]/page.tsx  # Enhanced destination route (existing)
  app/api/
    places/[id]/route.ts         # Single place API
    hotels/[id]/route.ts         # Single hotel API
    activities/[id]/route.ts     # Single activity API
    destinations/[name]/route.ts # Destination metadata API
  components/entity/
    EntityHero.tsx               # Shared hero with image carousel
    EntityActionsBar.tsx         # Shared actions (add to trip, fav, share)
    EntityMap.tsx                # Shared Leaflet map section
    EntityBreadcrumb.tsx         # Shared breadcrumb
    NearbySection.tsx            # Shared horizontal scroll of related cards
    EntitySection.tsx            # Shared section wrapper (heading + content)
    EntityQuickInfo.tsx          # Shared 2-col info grid
    EntityTagList.tsx            # Shared tag pills display
  components/entity/place/
    PlaceAbout.tsx
    PlaceQuickInfo.tsx
    PlaceTips.tsx
    PlaceAccessibility.tsx
  components/entity/hotel/
    HotelOverview.tsx
    HotelStayDetails.tsx
    HotelGuestRatings.tsx
    HotelRooms.tsx
    HotelAmenities.tsx
  components/entity/activity/
    ActivityAbout.tsx
    ActivityDetails.tsx
    ActivityInclusions.tsx
    ActivityTips.tsx
    ActivityAccessibility.tsx
  components/entity/destination/
    DestinationOverview.tsx
    DestinationQuickFacts.tsx
    DestinationTrips.tsx
    DestinationTopPlaces.tsx
    DestinationTopActivities.tsx
    DestinationWhereToStay.tsx

packages/shared/src/
  types/index.ts                 # Add ActivityDetail, DestinationDetail types
```

---

## Image Strategy

All entity pages use real photography sourced from:
1. **Foursquare API** — primary source for place/hotel photos (already integrated)
2. **SerpAPI google_images** — enrichment for suggestions (already integrated)
3. **Unsplash fallbacks** — high-quality travel photography when API images unavailable, using curated category-based URLs (existing pattern in `HotelListView`)

Hero images are `object-fit: cover` in 16:9 containers. Carousel supports 1-10 images with dot indicators and arrow navigation on hover.

---

## States

### Loading
Each page renders a skeleton matching its layout: hero placeholder (gray shimmer, 16:9), action bar placeholders, then type-specific section skeletons (text lines, info grid cells, card placeholders). Use Tailwind `animate-pulse` on `bg-gray-200` blocks.

### Error (404)
If the API returns no data, show a centered empty state: illustration placeholder, "We couldn't find this [place/hotel/activity/destination]" heading, and a "Browse [entity type]" link back to the relevant listing page.

### Error (500 / network)
Show a centered error state with "Something went wrong" and a "Try again" button that refetches.

### Empty optional sections
Sections with no data (tips, accessibility, rooms, amenities, inclusions) are hidden entirely — no empty placeholders.

---

## SEO & Metadata

All four pages use Next.js `generateMetadata` for server-side meta tags:

- `title`: "[Entity Name] - [Location] | Travyl"
- `description`: First 160 chars of description or tagline
- `og:image`: First image from the entity's images array
- `og:type`: "website"
- Canonical URL: the page's own URL

Pages are server components that fetch initial data server-side (via direct API call, not React Query) for SSR. Client-side React Query hydrates from that initial data for interactivity.

---

## Auth

All four pages are **public** — viewable without login. Auth-gated interactions:
- "Add to Trip" button: shows login prompt if unauthenticated
- "Favorite" heart: shows login prompt if unauthenticated
- "Your Trips Here" section on destination page: hidden if unauthenticated

---

## Responsive Behavior

- **Hero:** Full-width at all breakpoints. 16:9 on desktop, 4:3 on mobile for taller image.
- **Quick Info / Details grids:** 2 columns on `md+`, 1 column on mobile.
- **Horizontal scroll sections (NearbySection, Top Places, etc.):** Snap-scroll on mobile, arrow navigation on desktop.
- **EntityActionsBar:** Horizontal row on desktop, stacked or sticky bottom bar on mobile.
- **Section headings and body:** Scale down one step on mobile (h2 from 22px to 20px, body stays 14px).

---

## Nearby / Related Entities

`NearbySection` fetches related entities using a proximity query: `/api/places?lat={lat}&lng={lng}&limit=8&exclude={currentId}`. For hotels and activities, the same pattern applies to their respective APIs. The component accepts a generic `items` prop with `{ id, name, image, type, rating, href }` shape so it works across all entity types.

---

## Image Normalization

Each entity type maps its image fields to a common `EntityHero` prop:

| Entity Type | Primary Image | Image Array | Normalized to |
|-------------|--------------|-------------|---------------|
| PlaceItem | `image` | `images` | `images: [image, ...(images ?? [])]` |
| HotelData | `image_url` | `images` | `images: [image_url, ...(images ?? [])]` |
| ActivityDetail | `imageUrl` | `imageUrls` | `images: [imageUrl, ...(imageUrls ?? [])]` |
| DestinationDetail | `image` | `images` | `images: [image, ...(images ?? [])]` |

Each page normalizes before passing to `EntityHero`. No normalization layer in the shared component itself.

---

## Existing Component Migration

The existing `EntityHero`, `EntityActionsBar`, `EntityBreadcrumb`, `EntitySection`, and `EntityMap` components in `apps/web/components/entity/` were built for the trip hotel detail context and do NOT match this spec. They will be **replaced** with new implementations matching the designs above. Key changes:
- All icons migrated from `lucide-react` to `iconoir-react`
- `EntityHero`: simple carousel -> full-bleed hero with gradient, Lustria title, overline, badges
- `EntityActionsBar`: edit/remove/share -> add-to-trip/favorite/share
- `EntityBreadcrumb`: back link -> hierarchical breadcrumb

---

## Data Source Strategy

### Places (`/api/places/[id]`)
Fetches from existing backend places API by ID. The `/api/places` route already returns `PlaceItem` — the single-entity endpoint filters to one result.

### Hotels (`/api/hotels/[id]`)
Uses Foursquare `venues/{id}` endpoint for single-venue lookup (the integration already exists in `services/lib/foursquare.ts`). Falls back to SerpAPI `google_local` search by name + coordinates if Foursquare has no match. Hotel IDs are Foursquare venue IDs (strings), resolving the `HotelSearchResult.id` number mismatch — the detail page uses Foursquare string IDs as canonical.

### Activities (`/api/activities/[id]`)
Activity IDs are SerpAPI `place_id` values (prefixed `serp-`). The endpoint re-fetches from SerpAPI using `place_id` for stable lookups. Extended fields (meetingPoint, groupSize, languages, inclusions) are populated from SerpAPI structured data when available, with graceful `undefined` fallback for fields not returned.

### Destinations (`/api/destinations/[name]`)
Hardcoded metadata for ~100 popular destinations (matching the existing 99-city lookup table in `/api/places`). For unknown destinations, falls back to Nominatim geocoding for coordinates + basic info, with description set to `null` (the Overview section hides if no description).

---

## Type Definitions

`ActivityDetail` is a standalone interface (not extending `SuggestionCard`) to avoid coupling:

```typescript
interface ActivityDetail {
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
  // Extended fields
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

---

## Destination Slug Normalization

Destination routes use URL-safe slugs: lowercase, hyphens for spaces, no special characters. Example: "New York" -> `/destination/new-york`. The API endpoint normalizes input: `decodeURIComponent(slug).replace(/-/g, ' ')` for lookup. Display name uses the canonical name from the metadata store.

---

## Navigation / Linking

Entities are linked from:
- `/places` browse page cards -> `/place/[id]`
- Trip calendar suggestion cards -> `/activity/[id]` or `/place/[id]`
- Trip hotels tab -> `/hotel/[id]`
- Destination page cross-links -> all entity types
- NearbySection cards -> respective entity detail pages
- Search results (future) -> any entity type
- Shareable URLs for direct access

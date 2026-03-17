# Place Detail Card Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the place detail card with a 3D flip interaction (image front / navy info back), discovery swiping between similar places, auto-crossfading images, and rich Yelp-inspired info sections.

**Architecture:** Extend `PlaceItem` with 12 new fields. Extract the DetailModal card into a `FlipCard` component using `react-native-reanimated` for 3D Y-axis rotation. Add a `SwipeableDeck` wrapper using `react-native-gesture-handler` `PanGestureHandler` for stack-deck swiping. Build three mini-card sections (QuickFacts, GettingThere, Actions) for the card back with staggered entrance animations.

**Tech Stack:** React Native, react-native-reanimated (v4.1.1, already installed), react-native-gesture-handler (check if installed), FontAwesome icons, @travyl/shared types + mock data.

---

## Task 1: Extend PlaceItem Type + Mock Data

**Files:**
- Modify: `packages/shared/src/types/index.ts:283-296`
- Modify: `packages/shared/src/config/mockPlacesData.ts`

**Step 1: Add new fields to PlaceItem interface**

In `packages/shared/src/types/index.ts`, add after `longitude`:

```typescript
export interface PlaceItem {
  id: string;
  name: string;
  image: string;
  images?: string[];
  type: 'destination' | 'attraction' | 'restaurant' | 'experience' | 'event';
  rating: number;
  tagline: string;
  category: string;
  description?: string;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  // Rich detail fields
  priceLevel?: 1 | 2 | 3 | 4;
  hours?: string;
  phone?: string;
  website?: string;
  reviewCount?: number;
  address?: string;
  bestTimeToVisit?: string;
  duration?: string;
  admissionFee?: string;
  tips?: string[];
  accessibility?: string[];
  nearbyPlaces?: string[];
}
```

**Step 2: Add rich data to mock places**

Update every entry in `mockPlacesData.ts` with the new fields. Use realistic data per type:

- **Destinations**: duration "2-3 days", priceLevel 2-3, admissionFee "Free", tips from travel blogs
- **Attractions**: duration "1-3 hours", admissionFee with prices, hours, accessibility
- **Restaurants**: priceLevel 1-4, hours, phone, website, no admissionFee
- **Experiences**: duration "2-6 hours", admissionFee with prices, bestTimeToVisit
- **Events**: duration "1-3 days", admissionFee, bestTimeToVisit as date ranges

Each place needs `nearbyPlaces` pointing to 2-3 other place IDs that are geographically close or thematically related.

**Step 3: Verify build**

Run: `cd /Users/z/Travyl/travyl && npx tsc --noEmit -p packages/shared/tsconfig.json`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts packages/shared/src/config/mockPlacesData.ts
git commit -m "feat: extend PlaceItem with rich detail fields and mock data"
```

---

## Task 2: Check/Install react-native-gesture-handler

**Files:**
- Check: `apps/mobile/package.json`

**Step 1: Verify gesture handler is installed**

Run: `cd /Users/z/Travyl/travyl && grep "react-native-gesture-handler" apps/mobile/package.json`

If not found, install it:
Run: `cd /Users/z/Travyl/travyl/apps/mobile && npx expo install react-native-gesture-handler`

**Step 2: Verify it's wrapped in app layout**

Check `apps/mobile/app/_layout.tsx` for `GestureHandlerRootView`. If not present, wrap the root layout. Reanimated + Gesture Handler need this wrapper for gestures to work.

**Step 3: Commit if changes were made**

```bash
git add apps/mobile/package.json package-lock.json apps/mobile/app/_layout.tsx
git commit -m "chore: ensure react-native-gesture-handler is installed and configured"
```

---

## Task 3: Build FlipCard Component

**Files:**
- Create: `apps/mobile/components/places/FlipCard.tsx`

**Step 1: Create the FlipCard component**

This component handles the 3D Y-axis flip between front and back. It uses `react-native-reanimated` shared values to track rotation from 0° (front) to 180° (back).

Key implementation details:
- `useSharedValue(0)` for rotation progress (0 = front, 1 = back)
- `withSpring` for the flip animation (damping: 15, stiffness: 100)
- `useAnimatedStyle` for front face: `rotateY` interpolated from 0° to 180°, `backfaceVisibility: 'hidden'`
- `useAnimatedStyle` for back face: `rotateY` interpolated from 180° to 360°, `backfaceVisibility: 'hidden'`
- `perspective: 1200` on the container for 3D depth
- Both faces are `position: 'absolute'` inside a container
- Tap handler toggles between 0 and 1

```typescript
interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
  width: number;
  height: number;
}
```

**Step 2: Verify it renders**

Temporarily import into favorites screen, render with a simple colored View for front/back. Confirm the flip animation works on tap.

**Step 3: Commit**

```bash
git add apps/mobile/components/places/FlipCard.tsx
git commit -m "feat: add FlipCard component with 3D Y-axis rotation"
```

---

## Task 4: Build CardFront Component

**Files:**
- Create: `apps/mobile/components/places/CardFront.tsx`

**Step 1: Create CardFront**

Extract the current card front from the DetailModal into its own component. This includes:
- Auto-crossfading images (use `useSharedValue` for opacity, `useEffect` with `setInterval` every 3.5 seconds, `withTiming` crossfade duration 800ms)
- Two `Image` components stacked absolutely, alternating opacity
- Category badge (top-left white pill)
- Heart button (top-right)
- Name + rating badge + location + description at bottom (no gradient, white text with text shadow for readability)
- Subtle "tap to flip" hint: small rotate icon (FontAwesome `refresh` or `repeat`) in bottom-right corner, `rgba(255,255,255,0.4)`, 10px

```typescript
interface CardFrontProps {
  place: PlaceItem;
  isFav: boolean;
  onToggleFav: () => void;
  onFlip: () => void;
  width: number;
  height: number;
}
```

**Step 2: Commit**

```bash
git add apps/mobile/components/places/CardFront.tsx
git commit -m "feat: add CardFront with auto-crossfade images and badges"
```

---

## Task 5: Build CardBack Component

**Files:**
- Create: `apps/mobile/components/places/CardBack.tsx`
- Create: `apps/mobile/components/places/QuickFacts.tsx`
- Create: `apps/mobile/components/places/GettingThere.tsx`
- Create: `apps/mobile/components/places/PlaceActions.tsx`

**Step 1: Create QuickFacts mini-card**

Displays in a translucent card (`rgba(255,255,255,0.08)` bg, `rgba(255,255,255,0.12)` border, rounded 14px):
- Price level: dollar signs ($ to $$$$), active ones white, inactive `rgba(255,255,255,0.2)`
- Duration: clock icon + text
- Hours: clock icon + text (or "Hours not available")
- Rating + review count: star icon + "4.8 (2,340 reviews)"
- Admission: ticket icon + text (or "Free")

Use a 2-column grid layout for compact display. Icon (FontAwesome) + label + value per row.

**Step 2: Create GettingThere mini-card**

Same card style. Collapsible (default collapsed, tap header to expand):
- Address: map-marker icon + full address (tappable → opens maps)
- Phone: phone icon + number (tappable → `Linking.openURL('tel:...')`)
- Website: globe icon + URL (tappable → `Linking.openURL`)
- Best time: sun icon + text
- Accessibility: wheelchair icon + comma-joined list
- Tips: lightbulb icon + scrollable list of short quotes in italic

**Step 3: Create PlaceActions mini-card**

Context-aware buttons based on `place.type`:
- Common: Directions (location-arrow icon), Share (share-alt icon)
- Restaurant: View Menu (book icon), Book a Table (calendar icon)
- Attraction: Buy Tickets (ticket icon), Book (external-link icon)
- Experience: Check Availability (calendar-check-o icon), Book (external-link icon)
- Destination: Plan Trip (map icon), Book (external-link icon)
- Event: Get Tickets (ticket icon), Book (external-link icon)

Buttons use `rgba(125,211,252,0.15)` bg with `#7dd3fc` text for primary, `rgba(255,255,255,0.08)` for secondary.

Coordinates row at bottom (same as current).

"Tap to flip" hint in bottom-right corner.

**Step 4: Create CardBack**

Combines the three mini-cards in a `ScrollView` on a `Navy.DEFAULT` background. Each section enters with a staggered animation:
- Use `FadeInDown` from reanimated with increasing delays: 0ms, 150ms, 300ms
- Or manually: three `useSharedValue(0)` that animate to 1 with staggered `setTimeout` + `withSpring`

```typescript
interface CardBackProps {
  place: PlaceItem;
  isFav: boolean;
  onToggleFav: () => void;
  onFlip: () => void;
  onSearchTag: (tag: string) => void;
  width: number;
  height: number;
}
```

**Step 5: Commit**

```bash
git add apps/mobile/components/places/
git commit -m "feat: add CardBack with QuickFacts, GettingThere, and PlaceActions sections"
```

---

## Task 6: Build SwipeableDeck Component

**Files:**
- Create: `apps/mobile/components/places/SwipeableDeck.tsx`

**Step 1: Create SwipeableDeck**

Uses `react-native-gesture-handler` `PanGestureHandler` (or `Gesture.Pan()` from the newer API) with `react-native-reanimated`.

Key behavior:
- Renders current card + next card behind it (slightly scaled down to 0.95, offset 8px down)
- `PanGestureHandler` tracks horizontal drag on current card
- When drag exceeds threshold (100px), fling card off-screen with `withSpring` (translating X to ±SCREEN_WIDTH * 1.5, rotating ±15°)
- Next card springs up: scale 0.95 → 1.0, translateY 8 → 0
- Counter label: "3 of 12" in a small pill, positioned above the card

```typescript
interface SwipeableDeckProps {
  places: PlaceItem[];
  initialIndex: number;
  renderCard: (place: PlaceItem, index: number) => React.ReactNode;
  onIndexChange: (index: number) => void;
}
```

- Keep a `currentIndex` shared value
- Pre-render only current + next card for performance
- Swipe left = next, swipe right = previous (or both go forward — user preference TBD)

**Step 2: Commit**

```bash
git add apps/mobile/components/places/SwipeableDeck.tsx
git commit -m "feat: add SwipeableDeck with stack-deck fling animation"
```

---

## Task 7: Build getSimilarPlaces Utility

**Files:**
- Create: `packages/shared/src/hooks/useSimilarPlaces.ts`
- Modify: `packages/shared/src/hooks/index.ts` (add export)

**Step 1: Create the hook**

```typescript
export function useSimilarPlaces(place: PlaceItem, allPlaces: PlaceItem[]): PlaceItem[] {
  return useMemo(() => {
    // 1. Same type, same category first
    // 2. Same type, different category second
    // 3. Nearby by coordinates (haversine distance < 50km)
    // Exclude the current place, return up to 12 results
  }, [place.id, allPlaces]);
}
```

Also create a pure `getSimilarPlaces(place, allPlaces)` function for use outside React.

**Step 2: Add export**

Add `export * from './useSimilarPlaces';` to `packages/shared/src/hooks/index.ts`.

**Step 3: Commit**

```bash
git add packages/shared/src/hooks/useSimilarPlaces.ts packages/shared/src/hooks/index.ts
git commit -m "feat: add useSimilarPlaces hook for discovery swiping"
```

---

## Task 8: Integrate into DetailModal

**Files:**
- Modify: `apps/mobile/app/(tabs)/favorites/index.tsx`

**Step 1: Refactor DetailModal**

Replace the current card `Pressable` (lines ~283-461) with the new component stack:

```tsx
// Inside DetailModal's ScrollView, replace the card Pressable with:
const similarPlaces = useSimilarPlaces(place, MOCK_PLACES);
const deckPlaces = [place, ...similarPlaces];
const [deckIndex, setDeckIndex] = useState(0);
const currentPlace = deckPlaces[deckIndex];
const [isFlipped, setIsFlipped] = useState(false);

// Reset flip when swiping to new card
useEffect(() => { setIsFlipped(false); }, [deckIndex]);

<SwipeableDeck
  places={deckPlaces}
  initialIndex={0}
  onIndexChange={(i) => setDeckIndex(i)}
  renderCard={(p, i) => (
    <FlipCard
      front={<CardFront place={p} isFav={...} onToggleFav={...} onFlip={() => setIsFlipped(v => !v)} width={SCREEN_WIDTH - 32} height={380} />}
      back={<CardBack place={p} isFav={...} onToggleFav={...} onFlip={() => setIsFlipped(v => !v)} onSearchTag={onSearchTag} width={SCREEN_WIDTH - 32} height={380} />}
      isFlipped={isFlipped}
      onFlip={() => setIsFlipped(v => !v)}
      width={SCREEN_WIDTH - 32}
      height={380}
    />
  )}
/>

{/* Counter */}
<Text style={{ textAlign: 'center', fontSize: 11, color: Gray[400], marginTop: 8 }}>
  {deckIndex + 1} of {deckPlaces.length}
</Text>
```

**Step 2: Remove old card code**

Delete the old `Pressable` card with navy border, image carousel, text overlay, and showDetails expansion. All of that is now in CardFront/CardBack.

**Step 3: Remove unused imports**

Clean up: remove old `Animated` import from react-native (if no longer used by map animations — check first), remove `Share` if moved to PlaceActions, etc.

**Step 4: Verify app loads**

Run: `cd /Users/z/Travyl/travyl/apps/mobile && npx expo start`
Expected: App loads, tapping a place shows the new flip card in the modal.

**Step 5: Commit**

```bash
git add apps/mobile/app/(tabs)/favorites/index.tsx
git commit -m "feat: integrate FlipCard + SwipeableDeck into DetailModal"
```

---

## Task 9: Update Explore Section for Nearby/Similar Places

**Files:**
- Modify: `apps/mobile/components/home/ExplorePreview.tsx`
- Modify: `apps/mobile/app/(tabs)/favorites/index.tsx`

**Step 1: Add contextual mode to ExplorePreview**

Add an optional `contextPlace` prop to `ExplorePreview`:

```typescript
interface ExplorePreviewProps {
  contextPlace?: PlaceItem;  // When provided, show nearby + similar instead of generic rows
}
```

When `contextPlace` is provided:
- Row 1: "Nearby Places" — filter `MOCK_PLACES` by `nearbyPlaces` IDs from the place
- Row 2: "Similar [type]" — same type, different place
- Keep existing generic rows as fallback when no contextPlace

**Step 2: Pass the selected place from DetailModal**

In the DetailModal, pass `contextPlace={currentPlace}` to `ExplorePreview`.

**Step 3: Commit**

```bash
git add apps/mobile/components/home/ExplorePreview.tsx apps/mobile/app/(tabs)/favorites/index.tsx
git commit -m "feat: ExplorePreview shows nearby/similar places when context place provided"
```

---

## Task 10: Sync Web Detail Card

**Files:**
- Modify: `apps/web/app/(main)/favorites/page.tsx`

**Step 1: Implement web version of flip card**

Use `motion/react` (already installed, v12.0.0) for 3D flip:
- `rotateY` with `perspective: 1200px`
- `motion.div` with `animate={{ rotateY: isFlipped ? 180 : 0 }}`
- `backfaceVisibility: 'hidden'` on both faces
- Same card structure: front (image + badges), back (navy + 3 sections)

**Step 2: Add swipe/arrow navigation for discovery**

Web doesn't have swipe gestures easily, so use:
- Left/right arrow buttons on card edges (chevron icons)
- Optional: keyboard arrow keys for power users
- Same similar places logic from `useSimilarPlaces`

**Step 3: Match mobile styling**

Navy border, same badge positions, same info sections, same action buttons.

**Step 4: Commit**

```bash
git add apps/web/app/(main)/favorites/page.tsx
git commit -m "feat: sync web detail card with mobile flip card design"
```

---

## Task Order & Dependencies

```
Task 1 (types + mock data) ─── no deps
Task 2 (gesture handler)   ─── no deps
         │
         ├──→ Task 3 (FlipCard) ──→ Task 4 (CardFront) ──→ Task 5 (CardBack)
         │                                                        │
         ├──→ Task 6 (SwipeableDeck)                              │
         │                                                        │
         ├──→ Task 7 (useSimilarPlaces)                           │
         │         │                                              │
         └─────────┴──────────────────────→ Task 8 (Integration) ─┘
                                                    │
                                           Task 9 (Explore update)
                                                    │
                                           Task 10 (Web sync)
```

Tasks 1, 2 can run in parallel. Tasks 3, 6, 7 can run in parallel after 1+2. Tasks 4, 5 are sequential after 3. Task 8 requires 3-7. Task 9 after 8. Task 10 after 9.

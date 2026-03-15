# Unified PlaceCard Component Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a single PlaceCard component (one per platform) that replaces all existing card variants across the app, powered by `PlaceItem` data.

**Architecture:** One component with three fixed size presets (`compact`, `standard`, `full`). Card front shows scannable travel info scaled by size. Standard/full sizes support flip-to-reveal with detailed info on the back. Both platforms share the same visual hierarchy and data type, rendered with platform-native code.

**Tech Stack:** React Native + Reanimated (mobile), React + Tailwind + motion/react (web), PlaceItem from @travyl/shared

---

## PlaceCard Sizes

| Size | Dimensions | Flip? | Used in |
|------|-----------|-------|---------|
| `compact` | 150×200 | No | Explore rows, trip detail "More to Explore" |
| `standard` | 280×380 | Yes | Get Inspired, map bottom sheet |
| `full` | parent width × 420 | Yes | Places deck, favorites, modal detail |

## Card Front — Information by Size

| Info | Compact | Standard | Full |
|------|---------|----------|------|
| Image (crossfade) | yes | yes | yes |
| Category badge (top-left) | yes | yes | yes |
| Favorite heart (top-right) | yes | yes | yes |
| Name | yes | yes | yes |
| Type label | yes (small) | yes | yes |
| Rating + stars | — | yes | yes |
| Review count | — | — | yes |
| Price level ($$) | — | restaurants | restaurants |
| Location/tagline | — | yes | yes |
| Description | — | 1 line | 2 lines |
| Duration | — | experiences | yes |
| Hours/Open now | — | — | yes |

## Card Back (Standard & Full only)

Reuses existing component structure:
- **QuickFacts:** hours, price level, duration, best time to visit, admission fee
- **GettingThere:** address, map link
- **PlaceActions:** directions, call, website, share
- **Tips:** traveler tips
- **Accessibility:** accessibility info

## Type-Driven Variations

The `place.type` field drives subtle visual differences:
- **Restaurants:** show priceLevel as $$$$ next to rating
- **Experiences/Activities:** show duration badge
- **Events:** show date (future enhancement)
- All types: standard rating + location layout

## Props Interface

```typescript
interface PlaceCardProps {
  place: PlaceItem;
  size: 'compact' | 'standard' | 'full';
  isFav: boolean;
  onToggleFav: () => void;
  onPress?: () => void;       // mobile
  onClick?: () => void;       // web
  imageIndex?: number;         // controlled crossfade
  width?: number;              // override for 'full' size
  height?: number;             // override for 'full' size
}
```

## Data Migration

- Retire `ExploreItem` type — replace with `PlaceItem` everywhere
- Update `useExploreRows` hook to return `PlaceItem[]` per row
- Expand `MOCK_PLACES` to ~30 entries covering all Explore categories
- Remove `ExploreItem` and `ExploreRow` types from shared types
- Create new `ExplorePlaceRow` type: `{ title: string; items: PlaceItem[] }`

## Platform Components

**Mobile** (`apps/mobile/components/PlaceCard.tsx`):
- Refactors existing CardFront + CardBack + FlipCard into one clean component
- Size presets with fixed dimensions
- Compact: no flip, onPress callback only
- Standard/Full: flip on tap via Reanimated rotateY

**Web** (`apps/web/components/PlaceCard.tsx`):
- Port of same layout using Tailwind + motion/react
- CSS transform rotateY for flip
- Three size presets matching mobile

## Integration Points

| Location | Size | Behavior |
|----------|------|----------|
| Homepage Explore rows | compact | onPress opens modal |
| Get Inspired section | standard | flip on tap |
| Places/Favorites page (deck) | full | flip on tap |
| Trip detail "More to Explore" | compact | onPress opens modal |
| Map bottom sheet | standard | flip on tap |

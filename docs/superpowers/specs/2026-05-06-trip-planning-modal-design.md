# Trip Planning Modal Design

**Date:** 2026-05-06
**Feature:** "Plan this trip" buttons on UseCases section → modal/drawer with preference carousel

## Overview

When a user clicks "Plan this trip" on any of the three use-case cards (Solo adventure / Group getaway / Family vacation), a modal opens instead of immediately submitting to the AI planner. The modal shows a destination preview followed by an optional multi-step preference carousel, then submits the enriched prompt to the existing AI trip planning flow.

## TRIP_CASES Data Structure

Each case in the `TRIP_CASES` array already has: `title`, `tagline`, `prompt`, `image` (hero image URL), and `location` (display string). For the planning modal, structured location data is needed:

```ts
const TRIP_CASES = [
  {
    title: "Solo adventure",
    tagline: "Your pace, your rules",
    prompt: "Plan a solo trip",
    image: "https://images.pexels.com/...",
    location: "Swiss Alps",
    // NEW fields for modal context:
    context: { city: "Interlaken", country: "Switzerland" },
  },
  {
    title: "Group getaway",
    tagline: "Shared moments, zero stress",
    prompt: "Plan a group trip",
    image: "https://images.pexels.com/...",
    location: "Ibiza, Spain",
    context: { city: "Ibiza", country: "Spain" },
  },
  {
    title: "Family vacation",
    tagline: "Memories to last a lifetime",
    prompt: "Plan a family vacation",
    image: "https://images.pexels.com/...",
    location: "Maui, Hawaii",
    context: { city: "Maui", country: "United States" },
  },
];
```

## Modal/Drawer Shell

- **Desktop:** Centered modal, `max-w-lg`, `rounded-2xl`, white/off-white background, shadow-xl with backdrop blur overlay
- **Mobile:** Bottom sheet that slides up with a spring animation, drag-to-dismiss handle at top, rounded top corners, full screen width
- **Shared anatomy from top to bottom:**
  - Destination hero image (full width, ~200px tall, gradient overlay for text legibility)
  - Step content area (current micro-step with its question and options)
  - Progress dots indicator (shows position in the flow)
  - Pinned "Plan this trip" CTA button at the bottom
  - Close button (X) at top-right

### Open/Close Behavior

- **Open:** Clicking a use-case card sets `open=true` on `PlanTripModal` via local state in `UseCases`
- **Close:** Tapping the X button, clicking the backdrop, or (on mobile) dragging the sheet down sets `open=false`
- **On plan submit:** `onPlanTrip` callback triggers `setOpen(false)` before the takeoff overlay appears

## Step Flow (Carousel Micro-Steps)

All steps are optional — a "Skip" link is shown at the top-right of each step content area. Selected chips get a navy (`#1e3a5f`) fill; unselected are outlined.

| # | Step | Question | Options | Selection type |
|---|------|----------|---------|----------------|
| 0 | Destination Preview | — | Hero image + location name overlay + trip type tagline + location name (large) | Auto-advance or tap to continue |
| 1 | Duration | "How long?" | 3 days, 5 days, 7 days, 14 days | Single |
| 2 | Travelers | "Who's coming?" | Just me, Couple, Family, Friends | Single |
| 3 | Interests | "Interests?" | Food, Adventure, Culture, Nature, Nightlife, Shopping, Wellness | Multi-select |
| 4 | Budget | "Budget?" | Budget-friendly, Moderate, Luxury, No preference | Single |
| 5 | Pace | "Pace?" | Relaxed, Moderate, Packed it in | Single |

Transitions between steps use a subtle horizontal slide animation (next slides in from right, previous slides out to left).

### CollectedPreferences Type

```ts
interface CollectedPreferences {
  duration?: string;    // "3 days" | "5 days" | "7 days" | "14 days"
  travelers?: string;   // "Just me" | "Couple" | "Family" | "Friends"
  interests?: string[]; // e.g. ["Food", "Adventure"]
  budget?: string;      // "Budget-friendly" | "Moderate" | "Luxury" | "No preference"
  pace?: string;        // "Relaxed" | "Moderate" | "Packed it in"
}
```

## Data Flow

### Planner State Integration (Key Design Decision)

The `UseCases` component and the homepage (`page.tsx`) each have their own `useTripPlanner()` instance, making their planner states independent. To bridge them, the homepage passes an `onPlanTrip` callback down to `UseCases` (via import or prop). This callback closes the modal and submits the enriched prompt to the homepage's planner, which owns the takeoff overlay and the full extract→plan→save→redirect flow.

```
page.tsx (owns planner + takeoff overlay)
  └── UseCases
        │  (receives onPlanTrip callback)
        └── PlanTripModal
              │  (collects preferences)
              └── calls onPlanTrip(enrichedPrompt, context)
                     → page.tsx closes modal, submits to its own planner
                     → takeoff animation plays
                     → extract → (clarify) → plan → save → redirect
```

No `router.push("/")` is needed — the modal closes and the existing takeoff overlay appears on the same page.

### Prompt Construction

When the user clicks "Plan my trip":
1. Collect selected preferences (with defaults for skipped steps)
2. Build an enriched prompt that appends preferences to the base prompt:
   - Format: `"{base_prompt} to {location}, {preferences_comma_separated}"`
   - Example: `"Plan a solo trip to the Swiss Alps, 5 days, interested in food and nature, moderate budget, relaxed pace"`
3. Call `onPlanTrip(enrichedPrompt, { city, country })` using the `context` field from TRIP_CASES
4. Close the modal/drawer
5. The homepage's planner takes over with its existing takeoff → extract → (clarify) → plan → save → redirect flow

Default values for skipped preferences:
- Duration → no duration specified (AI picks)
- Travelers → no travelers specified
- Interests → omitted
- Budget → omitted
- Pace → omitted

## Component Architecture

```
page.tsx
  └── UseCases
        │  (receives onPlanTrip callback from page)
        └── PlanTripModal.tsx      ← orchestrates modal state, collects preferences
              ├── ModalShell.tsx   ← responsive shell: centered modal (desktop) / bottom sheet (mobile)
              └── PreferenceCarousel.tsx ← manages micro-step flow and transitions
```

### Integration Points

- **page.tsx** instantiates `useTripPlanner()` and passes an `onPlanTrip` callback into `UseCases`
- **UseCases** accepts `onPlanTrip` as a prop and passes it to `PlanTripModal`
- **UseCases** no longer calls `router.push("/")` — the modal closes and the takeoff overlay handles the transition
- **UseCases** no longer creates its own `useTripPlanner()` instance

### Key Props

**UseCases (new prop):**
- `onPlanTrip: (prompt: string, context: { city?: string; country?: string }) => void`

**PlanTripModal:**
- `open: boolean`
- `onClose: () => void`
- `tripCase: { title, tagline, prompt, image, location, context: { city: string; country: string } }` — the TRIP_CASES entry with structured location data
- `onPlan: (prompt: string, context: { city?: string; country?: string }) => void` — submit to planner

**ModalShell:**
- `open: boolean`
- `onClose: () => void`
- `children: React.ReactNode`

**PreferenceCarousel:**
- `tripCase: { title, tagline, image, location }`
- `onSubmit: (preferences: CollectedPreferences) => void`

## Error States

- If the AI planner returns an error, the existing error handling on the homepage applies (loading error message displayed in the takeoff overlay)
- If the modal fails to render, the use-case cards remain functional with their existing onClick behavior
- Preference validation: none needed — everything is optional with sensible defaults

## Edge Cases

- **User closes modal mid-flow:** Preferences are discarded, no side effects
- **User selects nothing / skips all:** The prompt becomes the base prompt from TRIP_CASES (e.g., "Plan a solo trip to the Swiss Alps")
- **Rapid clicking:** Debounce the "Plan my trip" button to prevent double submission
- **Mobile keyboard:** Bottom sheet adjusts to avoid keyboard overlap if any step adds text input

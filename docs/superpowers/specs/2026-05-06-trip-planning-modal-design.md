# Trip Planning Modal Design

**Date:** 2026-05-06
**Feature:** "Plan this trip" buttons on UseCases section → modal/drawer with preference carousel

## Overview

When a user clicks "Plan this trip" on any of the three use-case cards (Solo adventure / Group getaway / Family vacation), a modal opens instead of immediately submitting to the AI planner. The modal shows a destination preview followed by an optional multi-step preference carousel, then submits the enriched prompt to the existing AI trip planning flow.

## Modal/Drawer Shell

- **Desktop:** Centered modal, `max-w-lg`, `rounded-2xl`, white/off-white background, shadow-xl with backdrop blur overlay
- **Mobile:** Bottom sheet that slides up with a spring animation, drag-to-dismiss handle at top, rounded top corners, full screen width
- **Shared anatomy from top to bottom:**
  - Destination hero image (full width, ~200px tall, gradient overlay for text legibility)
  - Step content area (current micro-step with its question and options)
  - Progress dots indicator (shows position in the flow)
  - Pinned "Plan this trip" CTA button at the bottom
  - Close button (X) at top-right

## Step Flow (Carousel Micro-Steps)

All steps are optional — a "Skip" link is shown at the top-right of each step content area. Selected chips get a navy (`#1e3a5f`) fill; unselected are outlined.

| # | Step | Question | Options | Selection type |
|---|------|----------|---------|----------------|
| 0 | Destination Preview | — | Hero image + location name overlay + trip type tagline + short AI blurb | Auto-advance or tap to continue |
| 1 | Duration | "How long?" | 3 days, 5 days, 7 days, 14 days | Single |
| 2 | Travelers | "Who's coming?" | Just me, Couple, Family, Friends | Single |
| 3 | Interests | "Interests?" | Food, Adventure, Culture, Nature, Nightlife, Shopping, Wellness | Multi-select |
| 4 | Budget | "Budget?" | Budget-friendly, Moderate, Luxury, No preference | Single |
| 5 | Pace | "Pace?" | Relaxed, Moderate, Packed it in | Single |

Transitions between steps use a subtle horizontal slide animation (next slides in from right, previous slides out to left).

## Data Flow

1. User selects preferences (or skips all)
2. On "Plan my trip to [location]" click, build a rich prompt:
   - Format: `"Plan a {duration} {trip_type} trip to {location}{interests}{budget}{pace}"`
   - Example: `"Plan a 5-day solo adventure trip to the Swiss Alps, interested in food and nature, moderate budget, relaxed pace"`
3. Call the existing `useTripPlanner().submitPrompt(prompt, { city, country })` with location context
4. Close the modal/drawer
5. The homepage's existing takeoff → extract → (clarify) → plan → save → redirect flow proceeds

## Component Architecture

```
UseCases.tsx
  └── PlanTripModal.tsx           ← orchestrates modal state, collects preferences
        ├── ModalShell.tsx        ← responsive shell: centered modal (desktop) / bottom sheet (mobile)
        └── PreferenceCarousel.tsx ← manages micro-step flow and transitions
```

### Key Props

**PlanTripModal:**
- `open: boolean`
- `onClose: () => void`
- `tripCase: { title, tagline, prompt, image, location }` — the TRIP_CASES entry
- `onPlan: (prompt: string, context: { city?: string; country?: string }) => void` — submit to planner

**ModalShell:**
- `open: boolean`
- `onClose: () => void`
- `children: React.ReactNode`

**PreferenceCarousel:**
- `tripCase: { title, tagline, image, location }`
- `onSubmit: (preferences: CollectedPreferences) => void`

## Error States

- If the AI planner returns an error, the existing error handling on the homepage applies (loading error message displayed)
- If the modal fails to render, the use-case cards fall back to their current behavior (safe no-op)
- Preference validation: none needed — everything is optional with sensible defaults

## Edge Cases

- **User closes modal mid-flow:** Preferences are discarded, no side effects
- **User selects nothing / skips all:** The prompt becomes the base prompt from TRIP_CASES (e.g., "Plan a solo trip to the Swiss Alps")
- **Rapid clicking:** Debounce the "Plan my trip" button to prevent double submission
- **Mobile keyboard:** Bottom sheet adjusts to avoid keyboard overlap if any step adds text input

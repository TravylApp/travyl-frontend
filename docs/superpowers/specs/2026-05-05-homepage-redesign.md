# Homepage Redesign — Value Communication & Product Demo

**Date:** 2026-05-05
**Branch:** `feature/ui-homogenization`
**Status:** Design spec

## Problem

The current homepage doesn't communicate what Travyl does in the first viewport. It leads with "Explore the world from one place" — a generic travel tagline — and offers two unlabeled CTA buttons ("Refine" with a sparkle icon and "Send" with a paper plane), creating ambiguity about what action the user should take. The page shows no product screenshots or UI mockups anywhere; it relies entirely on stock destination photography and marketing copy. Compared to Instagram (which immediately shows its feed — the product IS the content) and Pinterest (which immediately shows pins — the product IS the content), Travyl's homepage asks users to imagine what the product does without showing it.

## Proposed Changes

### 1. Hero Messaging Rewrite

**Before:**
```
Explore the world from one place.
[cycling subtitle]
[search bar with Refine (sparkles) + Send (paper plane) buttons]
```

**After:**
```
Plan your trip with AI.
Plan it with friends.

[cycling subtitle: "From idea to itinerary in seconds"]

[search bar with single button: "Plan Trip"]
```

- Headline split into two lines covering both USPs: AI-powered planning + collaborative (the two things that differentiate Travyl from Google Trips, Kayak, etc.)
- Remove the Refine button entirely. One search bar, one labeled CTA.
- Keep the cycling placeholder text ("7 days in Paris with my partner...")
- Keep the trending destination pills below the search bar
- Keep the hero background slideshow as-is

### 2. Section Reorder

**Before:**
```
Hero → Live Stats → How It Works → Quote Divider → Get Inspired → Tag Us → Ocean Wave → Footer
```

**After:**
```
Hero → How It Works → Product Demo (NEW) → Live Stats → Get Inspired → Quote Divider → Footer
```

- **How It Works moves up** (position 2) — immediately tells the user what's happening after the hero hooks them
- **Product Demo (NEW) added** (position 3) — shows the actual product interface for the first time
- **Live Stats repositions** (position 4) — social proof after understanding what the product is
- **Get Inspired repositions** (position 5) — browse content after value is established
- **Quote Divider shortened** (30vh instead of 50vh) — palette cleanser, not a major section
- **Tag Us removed** as standalone section — social CTA merged into Footer
- **Ocean Wave removed** — decorative only

### 3. Product Demo Section (New Component)

A scroll-driven, auto-playing product mockup that shows the Travyl app in action. Built entirely in code (Tailwind + Motion) — no external screenshots or assets needed.

**Format:** Browser chrome mockup frame (macOS window controls) containing a simulated app interface. The content inside transitions through 4 states as the user scrolls:

| State | Visual | Label |
|-------|--------|-------|
| 1 | Search bar with "5 days in Tokyo with friends" typed | "Describe your trip" |
| 2 | Trip card appears: Tokyo · Mar 15-20 · Planning status | "AI builds your plan" |
| 3 | Simplified day-by-day calendar with activities loaded | "Daily itinerary ready" |
| 4 | User avatars + cursor indicators appear | "Collaborate in real-time" |

**Technical approach:**
- New file: `apps/web/components/home/ProductDemo.tsx`
- Uses `useScroll` + `useTransform` from Motion (same pattern as HowItWorks)
- Dark navy background (`#0f1d30`) — visually distinct from surrounding sections
- All UI elements simulated with CSS gradients, text, and colored shapes — no image assets
- Scroll progress indicator at the bottom of the frame
- Transitions use `useMotionValueEvent` to flip between states at scroll thresholds

### 4. File Changes Summary

| File | Change |
|------|--------|
| `apps/web/app/(main)/page.tsx` | Rewrite hero headline, remove Refine button, reorder sections, add ProductDemo, remove TagUs/OceanWave imports |
| `apps/web/components/home/ProductDemo.tsx` | NEW — scroll-driven product mockup component |
| `apps/web/components/home/TagUs.tsx` | REMOVED (standalone section) — merge social links into Footer |
| `apps/web/components/home/Footer.tsx` | Add social "Tag us" row (reduced version of removed section) |
| `apps/web/components/home/ParallaxQuoteDivider.tsx` | Reduce height to 30vh |

### 5. What's Not Changing

- HowItWorks component (stays as-is, just repositions)
- GetInspired component (stays as-is, just repositions)
- LiveStats component (stays as-is, just repositions)
- GlobalNavbar (no changes)
- Color palette, typography, design tokens (no changes)

## Rationale

**Why remove TagUs:** Asking users to tag the product on Instagram before they've seen what the product does is premature for conversion. The social CTA belongs in the footer as a retention touchpoint, not a mid-page section.

**Why remove Ocean Wave:** Decorative sections add scroll fatigue on a page where every section should earn its keep. The wave contributes atmosphere but doesn't communicate value.

**Why keep Quote Divider (shorter):** Emotional connection has a place in travel products. Shortening it to 30vh keeps the sentiment without dominating the scroll experience.

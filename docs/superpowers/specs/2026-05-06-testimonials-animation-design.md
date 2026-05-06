# Testimonials Section — Hybrid Grid/Carousel Animation

**Date:** 2026-05-06
**Component:** `apps/web/components/home/Testimonials.tsx`

## Overview

Add a responsive hybrid animation to the Testimonials section: a 2-column grid with staggered fade-in on desktop, collapsing to a single-card fading carousel with auto-advance on mobile.

## Behavior

### Desktop (Tailwind `md:` breakpoint, 768px+)
- Keep the existing 2-column grid layout
- Each card fades in on scroll using `motion`'s `whileInView` with staggered delays
- Enhanced from current: add subtle `scale: 0.95` → `scale: 1` alongside opacity/y for a more polished entrance
- Full expand/collapse quote feature preserved on each card

### Mobile (< 768px)
- Show one testimonial at a time as a single card (centered, full-width)
- Crossfade transition between cards: current card fades out while next card fades in
- Auto-advance every 5 seconds
- Pause auto-advance on touch/hover
- Dot indicators below the card showing current position
- Optional arrow controls (prev/next)
- Expand/collapse still interactive per card

## Implementation Details

### State
- `currentIndex: number` — tracks which testimonial is visible on mobile
- `direction: 1 | -1` — tracks forward/backward for exit animation direction
- `isPaused: boolean` — pauses auto-advance on interaction

### Animations (motion/react)
- Desktop: `initial={{ opacity: 0, y: 24, scale: 0.95 }}` → `whileInView={{ opacity: 1, y: 0, scale: 1 }}` with `delay: i * 0.1`
- Mobile: `AnimatePresence` mode `"wait"` with variants:
  - Enter: `opacity: 0, x: 40` → `opacity: 1, x: 0`
  - Exit: `opacity: 1, x: 0` → `opacity: 0, x: -40`

### Auto-advance
- `useEffect` with `setInterval(5000)` on mobile only
- Clears when `isPaused` is true or component unmounts
- Resets interval when user manually navigates

### Controls
- Dot indicators: flex row centered below card, active dot uses `bg-magazine-accent`
- Prev/Next arrows: `ChevronLeft`/`ChevronRight` from `lucide-react`
- Touch: `onTouchStart`/`onTouchEnd` swipe detection (optional, can use arrow buttons as fallback)

### Responsive Structure
```tsx
// Mobile carousel wrapper — only rendered below md
<div className="md:hidden">
  <AnimatePresence mode="wait">
    <motion.div key={currentIndex} ...>
      <TestimonialCard t={TESTIMONIALS[currentIndex]} />
    </motion.div>
  </AnimatePresence>
  {/* Dot indicators + arrows */}
</div>

// Desktop grid — hidden below md
<div className="hidden md:grid md:grid-cols-2 gap-5">
  {TESTIMONIALS.map((t, i) => (
    <motion.div ...>
      <TestimonialCard t={t} i={i} />
    </motion.div>
  ))}
</div>
```

## Dependencies
- `motion/react` — already imported, provides `AnimatePresence`
- `lucide-react` — already imported, just need `ChevronLeft`/`ChevronRight`
- No new dependencies

## Edge Cases
- **Single testimonial:** No carousel behavior, just show the card
- **Slow network / dynamic load:** Carousel doesn't start until component mounts
- **Screen resize:** Switching between mobile and desktop resets the carousel index
- **Accessibility:** Dot indicators have `aria-label`, carousel uses `role="region"` with `aria-roledescription="carousel"`

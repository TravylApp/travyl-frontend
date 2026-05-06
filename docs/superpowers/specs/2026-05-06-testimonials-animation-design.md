# Testimonials Section — Hybrid Grid/Carousel Animation

**Date:** 2026-05-06
**Component:** `apps/web/components/home/Testimonials.tsx`

## Overview

Add a responsive hybrid animation to the Testimonials section: a 2-column grid with staggered fade-in on desktop, collapsing to a single-card fading carousel with auto-advance on mobile.

Follows the established carousel pattern from `GetInspired.tsx` (`mode="popLayout"`, direction-aware variants using `custom={direction}`, `EASE_OUT_EXPO` easing).

## Behavior

### Desktop (Tailwind `md:` breakpoint, 768px+)
- Keep the existing 2-column grid layout
- Each card fades in on scroll using `motion`'s `whileInView` with staggered delays
- Enhanced from current: add subtle `scale: 0.95` → `scale: 1` alongside opacity/y for a more polished entrance
- Full expand/collapse quote feature preserved on each card

### Mobile (< 768px)
- Show one testimonial at a time as a single card (centered, full-width)
- Crossfade-style transition between cards using `AnimatePresence mode="popLayout"` (same as `GetInspired.tsx`) — this allows simultaneous enter/exit so there's no blank gap
- Direction-aware slide: forward enters from right/exits left, backward enters from left/exits right
- Auto-advance every 5 seconds
- Pause auto-advance on touch/hover
- Dot indicators below the card showing current position
- Arrow controls (prev/next)
- Expand/collapse still interactive per card

## Implementation Details

### State
- `currentIndex: number` — tracks which testimonial is visible on mobile
- `direction: 1 | -1` — tracks forward/backward for exit animation direction (0 on mount to skip initial animation)
- `isPaused: boolean` — pauses auto-advance on interaction

### TestimonialCard Changes
The existing `TestimonialCard` has its own `initial`/`whileInView`/`transition` props. When used inside the carousel, these would conflict with the parent `AnimatePresence` animations.

**Fix:** Accept an optional `carousel` boolean prop. When `true`, strip the scroll-triggered motion props (`initial`, `whileInView`, `viewport`, `transition`) from the wrapping `<motion.div>`, rendering it as a plain `<div>` instead (or a motion.div with no animation props).

### Animations (motion/react)

**Desktop** (`TestimonialCard` with `carousel={false}`):
```tsx
initial={{ opacity: 0, y: 24, scale: 0.95 }}
whileInView={{ opacity: 1, y: 0, scale: 1 }}
viewport={{ once: true, margin: "-60px" }}
transition={{ duration: 0.5, delay: i * 0.08, ease: EASE_OUT_EXPO }}
```

**Mobile** — direction-aware variants (matching the `GetInspired.tsx` pattern):
```tsx
const variants = {
  enter: (d: number) => ({
    x: d > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (d: number) => ({
    x: d > 0 ? -60 : 60,
    opacity: 0,
  }),
};

// Usage:
<AnimatePresence mode="popLayout" custom={direction}>
  <motion.div
    key={currentIndex}
    custom={direction}
    variants={variants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
  >
    <TestimonialCard t={TESTIMONIALS[currentIndex]} carousel />
  </motion.div>
</AnimatePresence>
```

On mount, `direction` should be `0` so the first card appears without slide animation. A `useEffect` after mount sets it to `1`.

### Auto-advance
- `useEffect` with `setInterval(5000)` on mobile only
- Interval ref tracked via `useRef` — clears when `isPaused` becomes true
- Restarting: `useEffect` with `[isPaused, currentIndex]` resets the interval when `isPaused` returns to `false` or user manually navigates
- Cleanup on unmount

### Controls

**Dots:**
```tsx
<div className="flex items-center justify-center gap-2 mt-6">
  {TESTIMONIALS.map((_, i) => (
    <button
      key={i}
      onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
      className={`w-2 h-2 rounded-full transition-all duration-300 ${
        i === currentIndex
          ? "bg-magazine-accent w-5"
          : "bg-magazine-text/20 hover:bg-magazine-text/40"
      }`}
      aria-label={`Go to testimonial ${i + 1}`}
    />
  ))}
</div>
```

**Prev/Next arrows:** `ChevronLeft`/`ChevronRight` from `lucide-react` (already used by `GetInspired.tsx`).

### Responsive Structure
```tsx
// Mobile carousel wrapper — only rendered below md
<div className="md:hidden">
  <AnimatePresence mode="popLayout" custom={direction}>
    <motion.div key={currentIndex} custom={direction} variants={variants}
      initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}>
      <TestimonialCard t={TESTIMONIALS[currentIndex]} carousel />
    </motion.div>
  </AnimatePresence>
  {/* Dot indicators + arrows */}
</div>

// Desktop grid — hidden below md
<div className="hidden md:grid md:grid-cols-2 gap-5">
  {TESTIMONIALS.map((t, i) => (
    <TestimonialCard key={t.name} t={t} i={i} />
  ))}
</div>
```

### Screen Resize Handling
Use `window.matchMedia('(min-width: 768px)')` with a `MediaQueryListEvent` listener that resets `currentIndex` to 0 when crossing the boundary in either direction. Clean up listener on unmount.

### Single Testimonial Edge Case
When `TESTIMONIALS.length <= 1`, render a static card without carousel controls (no dots, no arrows, no auto-advance).

## Dependencies
- `motion/react` — already imported, provides `AnimatePresence`
- `lucide-react` + `ChevronLeft`/`ChevronRight` — already used by `GetInspired.tsx`
- No new dependencies

## Accessibility
WAI-ARIA carousel pattern:
- `role="region"` with `aria-roledescription="carousel"` on the carousel container
- `role="group"` with `aria-label="Testimonial X of Y"` on each slide
- `aria-live="polite"` on the slide container for screen reader announcements
- Dot indicators have `aria-label="Go to testimonial X"` with `aria-current` on active dot
- Arrow buttons have `aria-label="Previous testimonial"` / `aria-label="Next testimonial"`

## Edge Cases
- **Single testimonial:** Static card with no controls or auto-advance
- **Screen resize:** `matchMedia` listener resets index to 0 at the `md` boundary
- **Auto-advance pause/resume:** `useRef` interval with `useEffect` dependency on `[isPaused, currentIndex]`
- **Initial mount:** `direction` starts at 0 so first card appears without slide

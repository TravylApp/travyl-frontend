# Testimonials Hybrid Grid/Carousel Animation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add responsive hybrid animation to the Testimonials section — staggered fade-up grid on desktop, fading carousel on mobile.

**Architecture:** Single file modification to `apps/web/components/home/Testimonials.tsx`. Add `carousel` prop to `TestimonialCard` to suppress scroll animations inside carousel. Add mobile carousel wrapper with `AnimatePresence`, direction-aware variants, auto-advance interval, dot indicators, and arrow controls. Follow existing patterns from `GetInspired.tsx`.

**Tech Stack:** Next.js 16, React 19, `motion/react`, `lucide-react`, `@travyl/shared` (EASE_OUT_EXPO)

---

## Chunk 1: TestimonialCard Carousel Prop + Desktop Enhancement

**Spec ref:** `docs/superpowers/specs/2026-05-06-testimonials-animation-design.md` — TestimonialCard Changes, Desktop Animations

**Files:**
- Modify: `apps/web/components/home/Testimonials.tsx`

### Task 1: Add `carousel` prop to TestimonialCard

- [ ] **Step 1: Read the current component**

Read `apps/web/components/home/Testimonials.tsx` to confirm current state.

- [ ] **Step 2: Update TestimonialCard to accept `carousel` prop**

Change the function signature and conditionally render motion props:

```tsx
function TestimonialCard({ t, i, carousel }: { t: Testimonial; i: number; carousel?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (carousel) {
    return (
      <div className="group rounded-2xl bg-white/70 dark:bg-magazine-surface/80 backdrop-blur-sm border border-[#c4a882]/30 dark:border-white/[0.08] p-6 sm:p-8 hover:bg-white/90 dark:hover:bg-magazine-surface hover:shadow-lg hover:shadow-[#c4a882]/10 dark:hover:shadow-black/20 transition-all duration-300">
        {/* same children - Stars, quote, author */}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: i * 0.08, ease: EASE_OUT_EXPO }}
      className="group rounded-2xl bg-white/70 dark:bg-magazine-surface/80 backdrop-blur-sm border border-[#c4a882]/30 dark:border-white/[0.08] p-6 sm:p-8 hover:bg-white/90 dark:hover:bg-magazine-surface hover:shadow-lg hover:shadow-[#c4a882]/10 dark:hover:shadow-black/20 transition-all duration-300"
    >
      {/* same children */}
    </motion.div>
  );
}
```

Key changes:
- Accept optional `carousel` prop
- When `carousel` is true, render a plain `<div>` with no motion/animation props
- When false (default), use enhanced `initial` with `scale: 0.95` → `scale: 1`
- Keep the children (Stars, quote, author section) identical in both branches to avoid duplication

- [ ] **Step 3: Verify the existing grid renders correctly**

The desktop grid already passes no `carousel` prop, so it continues using the enhanced motion animation.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/home/Testimonials.tsx
git commit -m "feat: add carousel prop to TestimonialCard"
```

---

## Chunk 2: Mobile Carousel Implementation

**Spec ref:** Mobile Behavior, Animations, State, Controls

**Files:**
- Modify: `apps/web/components/home/Testimonials.tsx`

### Task 2: Add carousel state and imports

- [ ] **Step 1: Add new imports**

Add to existing imports:
```tsx
import { AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
```

- [ ] **Step 2: Add carousel state variables inside `Testimonials` component**

```tsx
export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rest of existing component...
}
```

Add `useRef` and `useEffect` to the React imports (`useCallback` is already imported):
```tsx
import { useState, useCallback, useRef, useEffect } from "react";
```

- [ ] **Step 3: Add direction-aware carousel variants**

```tsx
const carouselVariants = {
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
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/home/Testimonials.tsx
git commit -m "feat: add carousel state and animation variants"
```

### Task 3: Add auto-advance logic

- [ ] **Step 1: Add auto-advance useEffect**

```tsx
// Auto-advance on mobile
useEffect(() => {
  if (isPaused || TESTIMONIALS.length <= 1) return;

  intervalRef.current = setInterval(() => {
    setDirection(1);
    setCurrentIndex((i) => (i + 1) % TESTIMONIALS.length);
  }, 5000);

  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
}, [isPaused, currentIndex]);
```

- [ ] **Step 2: Add navigation handlers**

```tsx
const goNext = useCallback(() => {
  setDirection(1);
  setCurrentIndex((i) => (i + 1) % TESTIMONIALS.length);
}, []);

const goPrev = useCallback(() => {
  setDirection(-1);
  setCurrentIndex((i) => (i === 0 ? TESTIMONIALS.length - 1 : i - 1));
}, []);
```

Note: `useCallback` is already imported from React — no changes needed to the import line.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/home/Testimonials.tsx
git commit -m "feat: add auto-advance and navigation handlers"
```

### Task 4: Add responsive carousel wrapper + controls

- [ ] **Step 1: Replace the grid wrapper with responsive structure**

Current:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
  {TESTIMONIALS.map((t, i) => (
    <TestimonialCard key={t.name} t={t} i={i} />
  ))}
</div>
```

Replace with:
```tsx
{/* Mobile carousel — only below md */}
{TESTIMONIALS.length > 1 ? (
  <div className="md:hidden">
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Testimonials carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={carouselVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          role="group"
          aria-label={`Testimonial ${currentIndex + 1} of ${TESTIMONIALS.length}`}
          aria-live="polite"
        >
          <TestimonialCard t={TESTIMONIALS[currentIndex]} i={currentIndex} carousel />
        </motion.div>
      </AnimatePresence>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-6" role="tablist" aria-label="Testimonial navigation">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? "bg-magazine-accent w-5"
                : "bg-magazine-text/20 hover:bg-magazine-text/40"
            }`}
            role="tab"
            aria-selected={i === currentIndex}
            aria-current={i === currentIndex ? "true" : undefined}
            aria-label={`Go to testimonial ${i + 1}`}
          />
        ))}
      </div>

      {/* Arrow controls */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={goPrev}
          className="w-9 h-9 rounded-full border border-magazine-border flex items-center justify-center text-magazine-text hover:bg-magazine-surface/80 transition-colors"
          aria-label="Previous testimonial"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-xs text-magazine-text/60 tabular-nums">
          {currentIndex + 1} / {TESTIMONIALS.length}
        </span>
        <button
          onClick={goNext}
          className="w-9 h-9 rounded-full border border-magazine-border flex items-center justify-center text-magazine-text hover:bg-magazine-surface/80 transition-colors"
          aria-label="Next testimonial"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  </div>
) : (
  /* Single testimonial — no carousel controls */
  <div className="md:hidden">
    <TestimonialCard t={TESTIMONIALS[0]} i={0} />
  </div>
)}

{/* Desktop grid — hidden below md */}
<div className="hidden md:grid md:grid-cols-2 gap-5">
  {TESTIMONIALS.map((t, i) => (
    <TestimonialCard key={t.name} t={t} i={i} />
  ))}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/home/Testimonials.tsx
git commit -m "feat: add mobile carousel with dots, arrows, and accessibility"
```

---

## Chunk 3: Screen Resize Handling

**Spec ref:** Screen Resize Handling

**Files:**
- Modify: `apps/web/components/home/Testimonials.tsx`

### Task 5: Add resize listener

- [ ] **Step 1: Add matchMedia useEffect inside `Testimonials`**

```tsx
// Reset index when crossing desktop/mobile boundary
useEffect(() => {
  const mq = window.matchMedia('(min-width: 768px)');
  const handler = () => setCurrentIndex(0);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

Place this after the auto-advance useEffect.

- [ ] **Step 2: Add direction mount guard**

On mount, set direction to 0 so first card appears without slide:
```tsx
// After initial mount, enable direction animations
useEffect(() => {
  const timer = setTimeout(() => setDirection(1), 50);
  return () => clearTimeout(timer);
}, []);
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/home/Testimonials.tsx
git commit -m "feat: add screen resize handling for carousel index reset"
```

---

## Chunk 4: Verification

### Task 6: Verify build

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 2: Build check (includes TypeScript type checking)**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds with no type errors

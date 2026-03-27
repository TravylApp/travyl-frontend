# Trip Overview Redesign v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the trip overview page with dual-theme visual polish (warm editorial light / cinematic luxury dark), combined content sections, parallax scroll effects, and seamless page transitions.

**Architecture:** Theme-aware CSS variables switch the overview's entire palette between light (cream/gold/warm gray) and dark (midnight/gold/ivory). Lustria serif loaded via Google Fonts for overview headings only. IntersectionObserver drives reveal animations; hero parallax uses a scroll handler with rAF. White flash fixed by delaying background swap until Framer Motion exit completes.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, Framer Motion (`motion/react`), Google Fonts (Lustria), IntersectionObserver API

---

## Task 1: Add Overview CSS Variables + Lustria Font

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/layout.tsx`

### Step 1: Add overview-specific CSS variables to globals.css

In `apps/web/app/globals.css`, replace the current `--magazine-*` variables in `:root` and `.dark` with overview-specific variables that respond to the dark class. The light-mode values are the warm editorial palette; dark-mode values are the cinematic luxury palette.

```css
:root {
  --background: #FFFFFF;
  --foreground: #111827;
  --primary: #003594;
  --accent: #FFC72C;
  --muted: #F3F4F6;
  --muted-foreground: #6B7280;
  --border: #E5E7EB;

  /* Overview page — Warm Editorial (light) */
  --magazine-bg: #FAF8F5;
  --magazine-surface: #f5f1eb;
  --magazine-text: #4a4540;
  --magazine-heading: #1a1a1a;
  --magazine-accent: #b8953e;
  --magazine-border: rgba(184,149,62,0.15);
  --magazine-success: #34d399;
}

.dark {
  --background: #0c1117;
  --foreground: #e5e7eb;
  --primary: #60a5fa;
  --accent: #c8a96a;
  --muted: #1a2230;
  --muted-foreground: #9ca3af;
  --border: rgba(255, 255, 255, 0.08);

  /* Overview page — Cinematic Luxury (dark) */
  --magazine-bg: #0c1117;
  --magazine-surface: #151d28;
  --magazine-text: #b8b0a4;
  --magazine-heading: #e8e4df;
  --magazine-accent: #c8a96a;
  --magazine-border: rgba(255,255,255,0.06);
  --magazine-success: #34d399;
}
```

Also add to the `@theme inline` block:
```css
  --color-magazine-surface: var(--magazine-surface);
  --color-magazine-text: var(--magazine-text);
  --color-magazine-heading: var(--magazine-heading);
  --color-magazine-border: var(--magazine-border);
```

### Step 2: Add Lustria Google Font

In `apps/web/app/layout.tsx`, import Lustria from `next/font/google` and add its CSS variable:

```tsx
import { Geist_Mono, Sora, Lustria } from "next/font/google";

const lustria = Lustria({
  variable: "--font-lustria",
  subsets: ["latin"],
  weight: "400",
});
```

Add `${lustria.variable}` to the body `className`:
```tsx
className={`${geistMono.variable} ${sora.variable} ${lustria.variable} antialiased`}
```

### Step 3: Update font-serif in globals.css

In the `@theme inline` block, change `--font-serif` to use Lustria:
```css
  --font-serif: var(--font-lustria), Georgia, "Times New Roman", serif;
```

This way, all existing `font-serif` classes in the overview (already on headings) will pick up Lustria automatically.

### Step 4: Verify build compiles

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20`

Expected: Build succeeds (or only unrelated warnings).

### Step 5: Commit

```bash
git add apps/web/app/globals.css apps/web/app/layout.tsx
git commit -m "feat: add dual-theme overview CSS variables and Lustria serif font"
```

---

## Task 2: Rewrite Overview Page — Visual Design + Light/Dark Theming

**Files:**
- Modify: `apps/web/app/(main)/trip/[id]/page.tsx`

The overview page currently hardcodes dark-only styling (`text-white/90`, `bg-gradient-to-t from-[var(--magazine-bg)]`). Rewrite all color references to use the new CSS variables so the page works in both light and dark mode.

### Step 1: Update the cover section

Replace hardcoded dark colors with variable-based ones. The cover gradient should blend into `--magazine-bg` in both themes.

In the cover section, change:
- `text-white` headings → `text-[var(--magazine-heading)]` (but keep white for text overlaid on the hero image since the image is always dark)
- The gradient overlay: keep `from-[var(--magazine-bg)]` (this already works since the variable changes per theme)
- Accent text: already uses `var(--magazine-accent)` — good
- Date/traveler text: change `text-white/30` → use a variable or keep subtle opacity on heading color

The cover image always has a dark gradient overlay, so text on the image should stay white. Below the image, text should use the theme variables.

```tsx
{/* Cover text stays white because it's over the image */}
<h1 className="text-5xl sm:text-6xl md:text-[5rem] font-bold text-white leading-[0.9] font-serif"
  style={{ letterSpacing: '0.03em', textShadow: '0 4px 40px rgba(0,0,0,0.5)' }}>
  {cityName.toUpperCase()}
</h1>
```

### Step 2: Update the lede + forecast section

Change text colors from `text-white/45` to use CSS variables:

```tsx
<p className="text-[17px] sm:text-[20px] leading-[1.6] max-w-2xl mb-5 font-serif"
  style={{ color: 'var(--magazine-text)' }}>
  Paris never reveals itself all at once...
</p>
```

Forecast items:
```tsx
<span className="font-semibold" style={{ color: 'var(--magazine-heading)', opacity: 0.5 }}>{d.day}</span>
```

### Step 3: Update SectionHeader component

Change `text-white/90` to use heading variable:
```tsx
<h2 className="text-2xl sm:text-3xl font-bold font-serif" style={{ color: 'var(--magazine-heading)' }}>{title}</h2>
```

### Step 4: Update CarouselNav and CarouselDots

Replace `text-white/20`, `border-white/10` etc with theme-aware values:
```tsx
{/* CarouselNav */}
<span className="text-[11px] tabular-nums" style={{ color: 'var(--magazine-text)', opacity: 0.3 }}>
  {active + 1} / {count}
</span>
<button ... className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-default"
  style={{ border: '1px solid var(--magazine-border)' }}>
  <ChevronLeft size={14} style={{ color: 'var(--magazine-text)', opacity: 0.5 }} />
</button>
```

### Step 5: Update AddToTripButton

Already uses CSS variables — no changes needed.

### Step 6: Update EssentialsFooter

Change `text-white/*` references to use `--magazine-heading` and `--magazine-text`:
```tsx
<h2 className="text-2xl sm:text-3xl font-bold mb-6 font-serif" style={{ color: 'var(--magazine-heading)' }}>Before You Go</h2>
```

Replace all `text-white/70`, `text-white/20`, `text-white/15` etc with styled equivalents using the variables and appropriate opacity.

### Step 7: Update quote divider

```tsx
<p className="text-[16px] sm:text-[18px] italic text-center font-serif" style={{ color: 'var(--magazine-text)', opacity: 0.4 }}>
```

### Step 8: Verify build compiles

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20`

### Step 9: Commit

```bash
git add apps/web/app/\(main\)/trip/\[id\]/page.tsx
git commit -m "feat: theme-aware overview page with light/dark editorial styling"
```

---

## Task 3: Combined Explore + Events Section

**Files:**
- Modify: `apps/web/app/(main)/trip/[id]/page.tsx`

Replace the two separate full-width carousel sections (ExploreSection, WhatsOnSection) with a single side-by-side section. Each half is a scrollable list within a fixed-height box.

### Step 1: Create the DiscoverSection component

Replace `ExploreSection` and `WhatsOnSection` with a single `DiscoverSection`:

```tsx
function DiscoverSection({ addedItems, onToggleAdd, news }: {
  addedItems: Set<string>;
  onToggleAdd: (id: string) => void;
  news: NewsItem[];
}) {
  return (
    <section className="mt-10 px-6 sm:px-10">
      {/* Section header */}
      <div className="mb-5">
        <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1"
          style={{ color: 'var(--magazine-accent)' }}>Discover</p>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif"
          style={{ color: 'var(--magazine-heading)' }}>Discover &amp; What&apos;s On</h2>
      </div>

      {/* Side-by-side layout */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: Things to Do */}
        <div className="flex-1 rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--magazine-surface)', border: '1px solid var(--magazine-border)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--magazine-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--magazine-heading)' }}>Things to Do</h3>
          </div>
          <div className="overflow-y-auto max-h-[520px] p-3 flex flex-col gap-3 scrollbar-hide">
            {EXPLORE_ITEMS.map((item) => (
              <div key={item.id} className="rounded-xl overflow-hidden group cursor-pointer"
                style={{ backgroundColor: 'var(--magazine-bg)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="relative h-36 overflow-hidden">
                  <img src={item.image} alt={item.title} loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(200,169,106,0.2)', color: 'var(--magazine-accent)' }}>
                      {item.category}
                    </span>
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  <h4 className="text-sm font-bold font-serif" style={{ color: 'var(--magazine-heading)' }}>{item.title}</h4>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--magazine-text)', opacity: 0.7 }}>
                    {item.description}
                  </p>
                  <div className="mt-2">
                    <AddToTripButton isAdded={addedItems.has(item.id)} onToggle={() => onToggleAdd(item.id)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Events & News */}
        <div className="flex-1 rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--magazine-surface)', border: '1px solid var(--magazine-border)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--magazine-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--magazine-heading)' }}>What&apos;s On</h3>
          </div>
          <div className="overflow-y-auto max-h-[520px] p-3 flex flex-col gap-3 scrollbar-hide">
            {news.map((item, i) => {
              const addable = item.category === 'event' || item.category === 'tip';
              return (
                <div key={item.id} className="rounded-xl p-4"
                  style={{ background: NEWS_GRADIENTS[i % NEWS_GRADIENTS.length] }}>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold block mb-2"
                    style={{ color: 'var(--magazine-accent)' }}>
                    {item.category}
                    {item.source && <span className="ml-2 opacity-30">· {item.source}</span>}
                  </span>
                  <h4 className="text-base font-bold leading-tight mb-2 font-serif text-white/90">
                    {item.title}
                  </h4>
                  <p className="text-xs text-white/40 leading-relaxed mb-3 line-clamp-3">{item.snippet}</p>
                  {addable && (
                    <AddToTripButton isAdded={addedItems.has(item.id)} onToggle={() => onToggleAdd(item.id)} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
```

### Step 2: Update TripOverview to use DiscoverSection

In the main `TripOverview` component, replace:
```tsx
<ExploreSection addedItems={addedItems} onToggleAdd={toggleAdd} />

{/* ── QUOTE DIVIDER ── */}
...

<WhatsOnSection addedItems={addedItems} onToggleAdd={toggleAdd} news={news} />
```

With:
```tsx
<DiscoverSection addedItems={addedItems} onToggleAdd={toggleAdd} news={news} />

{/* ── QUOTE DIVIDER ── */}
<div className="px-6 sm:px-10 my-8 flex justify-center">
  <p className="text-[16px] sm:text-[18px] italic text-center font-serif"
    style={{ color: 'var(--magazine-text)', opacity: 0.4 }}>
    &ldquo;Paris is always a good idea.&rdquo; <span style={{ opacity: 0.5 }} className="not-italic">— Audrey Hepburn</span>
  </p>
</div>
```

### Step 3: Remove old ExploreSection, WhatsOnSection, SnapContainer, CarouselNav, CarouselDots, useSnapCarousel

Delete these components and the `useSnapCarousel` hook since they're no longer needed.

### Step 4: Verify build compiles

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20`

### Step 5: Commit

```bash
git add apps/web/app/\(main\)/trip/\[id\]/page.tsx
git commit -m "feat: combined side-by-side Discover & What's On section"
```

---

## Task 4: Parallax Scroll + Reveal Animations

**Files:**
- Modify: `apps/web/app/(main)/trip/[id]/page.tsx`

### Step 1: Add the useRevealOnScroll hook

Create a custom hook that uses IntersectionObserver to add a CSS class when elements enter the viewport:

```tsx
import { useEffect, useRef } from 'react';

function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const children = el.querySelectorAll('.reveal-on-scroll');
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  return ref;
}
```

### Step 2: Add reveal CSS classes to globals.css

Add to `apps/web/app/globals.css`:

```css
/* Reveal animations for overview page */
.reveal-on-scroll {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.reveal-on-scroll.revealed {
  opacity: 1;
  transform: translateY(0);
}

/* Staggered reveal for children */
.reveal-on-scroll:nth-child(2) { transition-delay: 0.1s; }
.reveal-on-scroll:nth-child(3) { transition-delay: 0.2s; }
.reveal-on-scroll:nth-child(4) { transition-delay: 0.3s; }

/* Quote scale reveal */
.reveal-scale {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.reveal-scale.revealed {
  opacity: 1;
  transform: scale(1);
}
```

### Step 3: Add hero parallax

Add a scroll-driven parallax effect to the cover image. The image moves at 0.5x scroll speed:

```tsx
const [parallaxOffset, setParallaxOffset] = useState(0);
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  let ticking = false;
  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        setParallaxOffset(window.scrollY * 0.5);
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

Apply to the cover image:
```tsx
<img src={coverImage} alt={destination}
  className="absolute inset-0 w-full h-full object-cover"
  style={{ transform: `translateY(${parallaxOffset}px)`, willChange: 'transform' }} />
```

### Step 4: Wrap sections with reveal classes

Add `reveal-on-scroll` class to each section in the TripOverview component:

```tsx
<div ref={revealRef}>
  {/* Lede */}
  <div className="reveal-on-scroll px-6 sm:px-10 mt-6 mb-6">...</div>

  {/* Discover section */}
  <div className="reveal-on-scroll">
    <DiscoverSection ... />
  </div>

  {/* Quote */}
  <div className="reveal-scale reveal-on-scroll px-6 sm:px-10 my-8 flex justify-center">...</div>

  {/* Essentials */}
  <div className="reveal-on-scroll">
    <EssentialsFooter />
  </div>
</div>
```

### Step 5: Verify build compiles

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20`

### Step 6: Commit

```bash
git add apps/web/app/globals.css apps/web/app/\(main\)/trip/\[id\]/page.tsx
git commit -m "feat: parallax hero and scroll-reveal animations on overview"
```

---

## Task 5: Fix White Flash on Page Transition

**Files:**
- Modify: `apps/web/app/(main)/trip/[id]/trip-layout-inner.tsx`
- Modify: `apps/web/app/(main)/layout.tsx`

### Step 1: Understand the root cause

In `trip-layout-inner.tsx` line 309:
```tsx
className={isOverview ? 'bg-[var(--magazine-bg)] -mt-16' : 'bg-white'}
```

When navigating from overview to another tab, `isOverview` flips to `false` immediately, setting `bg-white` while Framer Motion's exit animation is still running with the old (dark/cream) content. This causes a flash.

### Step 2: Delay background swap until exit completes

Track whether an exit animation is in progress. Keep the previous background until the exit finishes:

```tsx
const [exitingSegment, setExitingSegment] = useState<string | null>(null);
const wasOverviewRef = useRef(isOverview);

// When segment changes, remember the old state
useEffect(() => {
  if (wasOverviewRef.current !== isOverview) {
    if (wasOverviewRef.current) {
      setExitingSegment('overview');
    }
    wasOverviewRef.current = isOverview;
  }
}, [isOverview]);

const handleExitComplete = () => {
  setExitingSegment(null);
};

// Use overview background if we're on overview OR if overview is still exiting
const useOverviewBg = isOverview || exitingSegment === 'overview';
```

Update the container className:
```tsx
<div
  className={useOverviewBg ? 'bg-[var(--magazine-bg)] -mt-16' : 'bg-white dark:bg-[var(--background)]'}
  style={{ transition: 'background-color 0.5s ease' }}
>
```

Also add the non-overview dark mode bg: when not on overview, use `bg-white` in light mode and `bg-[var(--background)]` in dark mode.

### Step 3: Wire up onExitComplete

Add `onExitComplete` to the `AnimatePresence`:
```tsx
<AnimatePresence mode="popLayout" initial={false} onExitComplete={handleExitComplete}>
```

### Step 4: Add transition-colors to main layout

In `apps/web/app/(main)/layout.tsx`, ensure the main element has smooth background transitions:

```tsx
<main className="pt-16 bg-background text-foreground transition-colors duration-500">{children}</main>
```

(Change `duration-300` to `duration-500`)

### Step 5: Fix ContentHeader for dark mode

The `ContentHeader` in `trip-layout-inner.tsx` uses hardcoded `bg-white` and `text-gray-*`. Add dark mode variants:

```tsx
<div className="shrink-0 bg-white dark:bg-[var(--background)] border-b border-gray-100 dark:border-white/[0.06] px-5 pt-4 pb-3 sticky top-0 z-20">
```

### Step 6: Verify build compiles

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -20`

### Step 7: Commit

```bash
git add apps/web/app/\(main\)/trip/\[id\]/trip-layout-inner.tsx apps/web/app/\(main\)/layout.tsx
git commit -m "fix: eliminate white flash on overview-to-tab page transitions"
```

---

## Success Criteria

- [ ] Light mode overview: warm cream bg (`#FAF8F5`), gold accents, Lustria headings
- [ ] Dark mode overview: deep midnight bg (`#0c1117`), muted gold, Lustria headings
- [ ] Lustria serif on all overview headings, Satoshi everywhere else
- [ ] Things to Do + Events side-by-side in one section, stacks on mobile
- [ ] Parallax depth on hero image (0.5x scroll speed)
- [ ] Scroll-reveal animations on sections (fade in + translate up)
- [ ] No white flash when navigating between overview and other trip pages
- [ ] Dark mode toggle in navbar works seamlessly with overview theming

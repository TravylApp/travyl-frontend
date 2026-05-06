# Homepage Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite homepage hero messaging, consolidate CTA to single action, add product demo section, and reorder sections.

**Architecture:** Modify existing `page.tsx` to use new headline/CTA, create new `ProductDemo.tsx` component as scroll-driven mockup, remove two unused section imports (`TagUs`, `OceanWave`), shorten `ParallaxQuoteDivider`, add social row to `Footer`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Motion (framer-motion), TypeScript

**Spec:** `docs/superpowers/specs/2026-05-05-homepage-redesign.md`

---

## Chunk 1: Hero Messaging + Single CTA

### Task 1.1: Rewrite hero headline and subtitle

**Files:**
- Modify: `apps/web/app/(main)/page.tsx:633-648`

- [ ] **Step 1: Replace the hero headline**

Change the `motion.h1` text from:
```
{heroConfig?.title ?? "Explore the world from one place."}
```
to a two-line headline:
```tsx
<motion.h1 ...>
  Plan your trip with AI.<br />
  <span className="italic">Plan it with friends.</span>
</motion.h1>
```

The structure: first line is bold/straight, second line is italic serif for contrast. This lets the headline read quickly: "Plan with AI. Plan together."

- [ ] **Step 2: Update the subtitle**

Replace:
```tsx
{heroConfig?.subtitle ? (
  <TypeWriter text={heroConfig.subtitle} delay={600} speed={35} />
) : (
  <CyclingSubtitle />
)}
```
Keep the same logic/structure — just update the cycling phrases array if needed (the existing `SUBTITLE_PHRASES` array already has good ones like "From idea to itinerary in seconds").

- [ ] **Step 3: Remove the Refine button**

Find and remove the Refine button block (lines ~729-737):
```tsx
<button
  onClick={onRefine}
  disabled={isExtracting || isPlanning || !tripQuery.trim()}
  className="text-[#1e3a5f]/70 hover:text-[#1e3a5f] ..."
  title="Answer a few questions for a more personalized trip"
>
  <Sparkles size={14} />
  <span className="hidden sm:inline">Refine</span>
</button>
```

- [ ] **Step 4: Clean up unused imports**

Remove `Sparkles` from the lucide-react import line (line 6). Also check if `onRefine` and `onSelectDestination` are still needed — `onRefine` becomes unused, and `onSelectDestination` is only used in the `HeroSearchInput` props interface (keep that).

Remove the `onRefine` function definition (lines ~501-509), and clean up the function reference.

- [ ] **Step 5: Verify the build**

Run:
```bash
cd apps/web && npm run typecheck
```
Expected: No TypeScript errors.

---

## Chunk 2: ProductDemo Component

### Task 2.1: Create the ProductDemo component

**Files:**
- Create: `apps/web/components/home/ProductDemo.tsx`
- Modify: `apps/web/app/(main)/page.tsx` (import + render)

- [ ] **Step 1: Create `apps/web/components/home/ProductDemo.tsx`**

This is a scroll-driven product mockup component. It shows a browser frame with 4 states that transition as the user scrolls through the section.

```tsx
"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { Check, MapPin, Users, CalendarDays } from "lucide-react";

const DEMO_STATES = [
  {
    id: 0,
    label: "Describe your trip",
    description: "Tell Travyl where you want to go, when, and with whom — in plain English.",
  },
  {
    id: 1,
    label: "AI builds your plan",
    description: "Our AI extracts destinations, dates, and travelers to create a complete trip outline.",
  },
  {
    id: 2,
    label: "Daily itinerary ready",
    description: "A full day-by-day calendar appears with activities, restaurants, and sightseeing.",
  },
  {
    id: 3,
    label: "Collaborate in real-time",
    description: "Share with travel companions. Everyone can edit, comment, and plan together live.",
  },
];

const STEP_LABELS = ["Describe", "AI Plans", "Itinerary", "Collaborate"];

function MockSearchBar({ typed }: { typed: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/15">
      <MapPin size={14} className="text-white/40 shrink-0" />
      <div className="h-3 flex-1 rounded bg-white/20" style={{ width: `${typed.length}ch`, maxWidth: "70%" }} />
    </div>
  );
}

function MockTripCard({ visible }: { visible: boolean }) {
  return (
    <div
      className="rounded-xl bg-white/10 border border-white/15 overflow-hidden transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.96)",
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="h-4 w-32 rounded bg-white/20 mb-1.5" />
            <div className="h-3 w-24 rounded bg-white/10" />
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20">
            Planning
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            Mar 15 – Mar 20
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} />
            3 travelers
          </span>
        </div>
      </div>
    </div>
  );
}

function MockCalendar({ visible }: { visible: boolean }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const activities = [
    { time: "09:00", text: "Tsukiji Market" },
    { time: "12:00", text: "Senso-ji Temple" },
    { time: "18:00", text: "Shibuya Dinner" },
  ];
  return (
    <div
      className="rounded-xl bg-white/10 border border-white/15 overflow-hidden transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="grid grid-cols-5 border-b border-white/10">
        {days.map((d) => (
          <div key={d} className="text-center text-[10px] text-white/40 py-2 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="p-3 space-y-2">
        {activities.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-emerald-500/30 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Check size={8} className="text-emerald-300" />
            </div>
            <span className="text-white/50 w-10 shrink-0">{a.time}</span>
            <span className="text-white/80">{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockCollaboration({ visible }: { visible: boolean }) {
  const avatars = [
    { initial: "J", color: "bg-blue-500" },
    { initial: "S", color: "bg-emerald-500" },
    { initial: "M", color: "bg-amber-500" },
  ];
  return (
    <div
      className="flex items-center gap-3 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="flex -space-x-2">
        {avatars.map((a, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full ${a.color} border-2 border-[#0f1d30] flex items-center justify-center text-white text-[10px] font-bold`}
          >
            {a.initial}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-white/60">Sarah is viewing Day 2</span>
      </div>
    </div>
  );
}

export function ProductDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeState, setActiveState] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    let state = 0;
    if (v > 0.75) state = 3;
    else if (v > 0.5) state = 2;
    else if (v > 0.25) state = 1;
    if (state !== activeState) {
      setActiveState(state);
    }
  });

  return (
    <section ref={containerRef} className="py-20 px-6 bg-[#0f1d30]">
      <div className="max-w-5xl mx-auto text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-serif font-normal text-white mb-2 tracking-wide">
          See It <span className="italic">In Action</span>
        </h2>
        <p className="text-white/50 text-sm max-w-md mx-auto">
          Watch Travyl turn a trip idea into a complete itinerary in seconds.
        </p>
      </div>

      {/* Step indicators — compact row above the mockup */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-center gap-1">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-500 ${
                  i <= activeState
                    ? "bg-white/20 text-white"
                    : "text-white/30"
                }`}
              >
                {label}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className="w-4 h-[1px] bg-white/10" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Browser mockup frame */}
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl overflow-hidden bg-[#1a2a40] shadow-2xl shadow-black/30 border border-white/10">
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 bg-[#0d1a2e] border-b border-white/5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <div className="mx-auto text-[10px] text-white/30 font-medium">travyl.app</div>
          </div>

          {/* Mockup content area */}
          <div className="p-6 min-h-[300px] relative">
            {/* State 1: Search */}
            <div className="space-y-4">
              <div
                className="transition-all duration-700"
                style={{
                  opacity: activeState >= 0 ? 1 : 0,
                  transform: activeState >= 0 ? "translateY(0)" : "translateY(8px)",
                }}
              >
                <p className="text-xs text-white/40 mb-2 font-medium">Search</p>
                <MockSearchBar typed="5 days in Tokyo with friends" />
              </div>

              <MockTripCard visible={activeState >= 1} />
              <MockCalendar visible={activeState >= 2} />
              <MockCollaboration visible={activeState >= 3} />
            </div>

            {/* Floating state label — top right */}
            <div className="absolute top-6 right-6">
              <div className="bg-white/10 rounded-lg px-3 py-1.5 border border-white/10">
                <p className="text-white font-semibold text-xs">{DEMO_STATES[activeState].label}</p>
                <p className="text-white/40 text-[10px] mt-0.5 max-w-[200px]">{DEMO_STATES[activeState].description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll progress bar */}
      <div className="max-w-2xl mx-auto mt-6 h-[2px] rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className="h-full bg-white/30 origin-left rounded-full"
          style={{ scaleX: scrollYProgress }}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add dynamic import to `page.tsx`**

Add to the dynamic imports block (after the existing imports):
```tsx
const ProductDemo = dynamic(
  () => import("@/components/home/ProductDemo").then((m) => ({ default: m.ProductDemo })),
  { ssr: false }
);
```

---

## Chunk 3: Section Reorder + Remove TagUs/OceanWave

### Task 3.1: Reorder sections in page.tsx

**Files:**
- Modify: `apps/web/app/(main)/page.tsx:838-854`

- [ ] **Step 1: Replace the section render area**

**Before (lines ~838-854):**
```tsx
<LiveStats />
<HowItWorks onCtaPress={() => router.push("/trips")} />
<ParallaxQuoteDivider bgY={dividerBgY} trendingDestinations={trendingDestinations} />
<GetInspired />
<TagUs />
<OceanWave />
<Footer />
```

**After:**
```tsx
<HowItWorks onCtaPress={() => router.push("/trips")} />
<ProductDemo />
<LiveStats />
<GetInspired />
<ParallaxQuoteDivider bgY={dividerBgY} trendingDestinations={trendingDestinations} />
<Footer />
```

- [ ] **Step 2: Remove TagUs and OceanWave dynamic imports**

Remove these two dynamic import blocks:
```tsx
const TagUs = dynamic(
  () => import("@/components/home/TagUs").then((m) => ({ default: m.TagUs })),
  { ssr: false }
);
const OceanWave = dynamic(
  () => import("@/components/home/OceanWave").then((m) => ({ default: m.OceanWave })),
  { ssr: false }
);
```

- [ ] **Step 3: Verify the build**

```bash
cd apps/web && npm run typecheck
```
Expected: No TypeScript errors.

---

## Chunk 4: Shorten Quote Divider + Update Footer

### Task 4.1: Reduce Quote Divider height

**Files:**
- Modify: `apps/web/components/home/ParallaxQuoteDivider.tsx:105`

- [ ] **Step 1: Change height from 50vh to 30vh**

```diff
- <section ref={ref} className="relative h-[50vh] overflow-hidden">
+ <section ref={ref} className="relative h-[40vh] overflow-hidden">
```

40vh is a good middle ground — shorter than current but still substantial enough for the parallax effect and quote text to land.

### Task 4.2: Add social tag row to Footer

**Files:**
- Modify: `apps/web/components/home/Footer.tsx`

- [ ] **Step 1: Add "Tag us" row between the grid and copyright sections

After the grid columns (`</div>` at line 250 closing the grid), before the copyright row (`mt-8` div at line 253), add a social tag row:

```tsx
        {/* Tag us — social CTA */}
        <div className="mt-10 mb-6 text-center">
          <p className="text-sm font-medium text-[#2a1f17] dark:text-[var(--magazine-heading)] mb-2">
            Tag us on your next trip
          </p>
          <div className="flex items-center justify-center gap-4">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[#d4bc94] hover:bg-[#c4a882] dark:bg-white/10 dark:hover:bg-white/20"
                title={link.platform}
              >
                <SocialIcon platform={link.platform} size={16} className="text-[#2a1f17] dark:text-[var(--magazine-text)]" />
              </a>
            ))}
          </div>
          <p className="text-xs text-[#5c4a3a] dark:text-[var(--magazine-text)] mt-2">
            {SOCIAL_HASHTAGS?.join(" ") ?? "#Travyl"}
          </p>
        </div>
```

Place this right before:
```tsx
        {/* Copyright + Theme toggle */}
        <div className="mt-8 pt-6 ...">
```

- [ ] **Step 2: Ensure `SOCIAL_HASHTAGS` is imported**

Check the existing import line — if `SOCIAL_HASHTAGS` isn't in the import from `@travyl/shared`, add it:
```tsx
import { FOOTER_COLUMNS, SOCIAL_LINKS, SOCIAL_HASHTAGS } from "@travyl/shared";
```

---

## Chunk 5: Final verification

### Task 5.1: Full verification pass

- [ ] **Step 1: TypeScript check**

```bash
npm run typecheck
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Dev server visual check**

```bash
npm run web
```

Manually verify:
- Hero shows "Plan your trip with AI. Plan it with friends."
- Only one button in the search bar (no Refine)
- How It Works appears first after hero (not after stats)
- Product Demo section appears after How It Works with 4 scroll states
- Live Stats appears after Product Demo
- Get Inspired card carousel works
- Quote Divider is shorter
- No TagUs standalone section
- No Ocean Wave section
- Footer has social tag row at the bottom

- [ ] **Step 4: Commit all changes**

```bash
git add apps/web/app/\(main\)/page.tsx apps/web/components/home/ProductDemo.tsx apps/web/components/home/Footer.tsx apps/web/components/home/ParallaxQuoteDivider.tsx docs/superpowers/
git commit -m "feat: redesign homepage — value prop, product demo, section reorder"
```

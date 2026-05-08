# Itinerary Overview — Day Slide Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty-shell-heavy "At a Glance" view with a slide-style, one-day-at-a-time horizontal card. Left = AI-generated narrative + clickable moment list (links into the calendar). Right = a big representative image. Auto-syncs with calendar changes.

**Architecture:** Three phases. **Phase 1** ships the new UI with a templated (non-AI) story payload so the visual change is visible immediately. **Phase 2** swaps the templated payload for a real Bedrock-backed Lambda (Claude Haiku 4.5). **Phase 3** is polish: prefetch, image fallback chain, e2e. Branch is `develop` per user direction. Spec: `docs/superpowers/specs/2026-05-07-itinerary-overview-day-slide-design.md`.

**Tech Stack:** Next.js 16 App Router · React 19.2 · Tailwind CSS 4 · React Query v5 · Yjs (existing) · SST v3 (Ion) · AWS Bedrock (Claude Haiku 4.5) · DynamoDB cache · Vitest + RTL · Playwright.

---

## Pre-flight (one-time, do not commit)

- [ ] **Step P1: Confirm dev server runs**

  Run: `npm run web`
  Expected: Next.js dev server starts on `:3000`. Open `/trip/<any-trip-id>` and confirm the existing "At a Glance" view renders. Leave the dev server running in a separate terminal for the rest of the plan.

- [ ] **Step P2: Confirm typecheck baseline**

  Run: `npm run typecheck`
  Expected: passes (or fails only on pre-existing develop WIP). Note any pre-existing errors so we don't blame them on later steps.

---

## Phase 1 — UI ships with templated story

Goal: by the end of Phase 1, the new visual is live on `/trip/[id]`. The story is a plain function of activities (no Bedrock yet); image uses the existing `useDayImages` fallback.

### Task 1: Shared types

**Files:**
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1.1: Add DayStory + DayStoryRequest types**

  Append to `packages/shared/src/types/index.ts`:

  ```typescript
  /** Editorial summary for one day in the At-a-Glance slide. */
  export interface DayStory {
    /** Short serif headline. May contain `<em>...</em>` around the last 1–2 words. */
    headline: string;
    /** 1–2 sentence narrative intro (plain text). */
    narrative: string;
    /** Optional URL of the image to feature for the day. */
    featuredImageUrl?: string;
    /** Index into the day's flattened activity list — the "starring" moment. */
    featuredActivityIndex?: number;
    /** Whether this story was AI-generated or a templated fallback. */
    source: 'bedrock' | 'template';
  }

  /** Input contract for /api/day-story. */
  export interface DayStoryRequest {
    tripId: string;
    dayIndex: number;
    destination: string;
    dateLabel: string;
    isFirstDay: boolean;
    isLastDay: boolean;
    activities: Array<{
      name: string;
      type: string;
      startHour: number;
      image?: string;
    }>;
  }
  ```

- [ ] **Step 1.2: Run typecheck**

  Run: `npm run typecheck -w @travyl/shared`
  Expected: PASS.

- [ ] **Step 1.3: Commit**

  ```bash
  git add packages/shared/src/types/index.ts
  git commit -m "Day slide: Add DayStory and DayStoryRequest types"
  ```

---

### Task 2: Templated story builder (pure function, TDD)

This is the Phase-1 fallback that runs entirely in the API route — no Bedrock yet. Same shape as the eventual Bedrock output, so swapping later is a one-line change.

**Files:**
- Create: `packages/shared/src/utils/buildTemplatedDayStory.ts`
- Test:   `packages/shared/src/utils/__tests__/buildTemplatedDayStory.test.ts`

- [ ] **Step 2.1: Write the failing test**

  Create `packages/shared/src/utils/__tests__/buildTemplatedDayStory.test.ts`:

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { buildTemplatedDayStory } from '../buildTemplatedDayStory';
  import type { DayStoryRequest } from '../../types';

  const base: DayStoryRequest = {
    tripId: 't1', dayIndex: 0, destination: 'Ibiza',
    dateLabel: 'Mon, Jun 1', isFirstDay: true, isLastDay: false,
    activities: [],
  };

  describe('buildTemplatedDayStory', () => {
    it('returns a Suggestion-style story when the day is empty', () => {
      const s = buildTemplatedDayStory(base);
      expect(s.source).toBe('template');
      expect(s.headline).toMatch(/<em>.+<\/em>/);
      expect(s.narrative.length).toBeGreaterThan(20);
    });

    it('uses the first activity name in the headline when present', () => {
      const s = buildTemplatedDayStory({
        ...base,
        activities: [{ name: 'Dalt Vila walk', type: 'sightseeing', startHour: 9 }],
      });
      expect(s.headline.toLowerCase()).toContain('dalt vila');
      expect(s.featuredActivityIndex).toBe(0);
    });

    it('marks isLastDay narratives as "departure"-flavored', () => {
      const s = buildTemplatedDayStory({ ...base, isFirstDay: false, isLastDay: true });
      expect(s.narrative.toLowerCase()).toMatch(/last|farewell|home|depart/);
    });
  });
  ```

- [ ] **Step 2.2: Run the test to verify it fails**

  Run: `cd packages/shared && npm test -- buildTemplatedDayStory`
  Expected: FAIL with "Cannot find module '../buildTemplatedDayStory'".

- [ ] **Step 2.3: Implement buildTemplatedDayStory**

  Create `packages/shared/src/utils/buildTemplatedDayStory.ts`:

  ```typescript
  import type { DayStory, DayStoryRequest } from '../types';

  /**
   * Pure, deterministic templated DayStory. Used as both a fallback when
   * Bedrock is unavailable and as the Phase-1 stand-in before Bedrock ships.
   */
  export function buildTemplatedDayStory(req: DayStoryRequest): DayStory {
    const dest = req.destination || 'your trip';
    const acts = req.activities;

    // Empty days → suggestion-flavor
    if (acts.length === 0) {
      return {
        headline: `A blank page worth <em>filling</em>`,
        narrative: req.isFirstDay
          ? `Day one in ${dest} — nothing planned yet, and that's fine. Pick a starting moment and we'll build out from there.`
          : req.isLastDay
            ? `Your last full day in ${dest} — still room to slow down or sneak in something memorable before the trip home.`
            : `Nothing on the books for this day yet. Most travelers spend it nearby — want a starting point?`,
        source: 'template',
      };
    }

    const first = acts[0];
    const featuredIdx = pickFeaturedIndex(acts);
    const featured = acts[featuredIdx];

    let headline: string;
    let narrative: string;

    if (req.isFirstDay) {
      headline = `A soft landing in <em>${dest}</em>`;
      narrative = `Wheels touching down and your first plate of something local. ${featured.name} anchors the day.`;
    } else if (req.isLastDay) {
      narrative = `One last lap before home. Don't rush ${featured.name}.`;
      headline = `One last <em>lap</em>`;
    } else {
      const lead = first.name;
      const tail = featured.name === first.name ? '' : ` — and later, ${featured.name}.`;
      headline = `Today: ${first.name.split(' ').slice(0, 3).join(' ')} <em>and beyond</em>`;
      narrative = `Begin with ${lead}${tail}`;
    }

    return {
      headline,
      narrative,
      featuredActivityIndex: featuredIdx,
      featuredImageUrl: featured.image,
      source: 'template',
    };
  }

  /**
   * Pick the most visually-interesting moment to feature. Heuristic:
   * prefer activities that have an image, then the first non-transport,
   * else fall back to the first.
   */
  function pickFeaturedIndex(acts: DayStoryRequest['activities']): number {
    const withImage = acts.findIndex((a) => !!a.image);
    if (withImage >= 0) return withImage;
    const nonTransport = acts.findIndex((a) => a.type !== 'transport' && a.type !== 'flight');
    if (nonTransport >= 0) return nonTransport;
    return 0;
  }
  ```

- [ ] **Step 2.4: Add export to shared barrel**

  In `packages/shared/src/index.ts`, add:

  ```typescript
  export { buildTemplatedDayStory } from './utils/buildTemplatedDayStory';
  ```

- [ ] **Step 2.5: Run tests**

  Run: `cd packages/shared && npm test -- buildTemplatedDayStory`
  Expected: 3 tests PASS.

- [ ] **Step 2.6: Commit**

  ```bash
  git add packages/shared/src/utils/buildTemplatedDayStory.ts \
          packages/shared/src/utils/__tests__/buildTemplatedDayStory.test.ts \
          packages/shared/src/index.ts
  git commit -m "Day slide: Add templated DayStory builder + tests"
  ```

---

### Task 3: Next.js API route (templated only — Phase 1)

**Files:**
- Create: `apps/web/app/api/day-story/route.ts`

- [ ] **Step 3.1: Implement the route**

  Create `apps/web/app/api/day-story/route.ts`:

  ```typescript
  import { NextResponse } from 'next/server';
  import { buildTemplatedDayStory } from '@travyl/shared';
  import type { DayStoryRequest } from '@travyl/shared';

  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';

  export async function POST(request: Request) {
    let body: DayStoryRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body?.tripId || typeof body.dayIndex !== 'number') {
      return NextResponse.json({ error: 'tripId and dayIndex required' }, { status: 400 });
    }

    // Phase 1: templated only. Phase 2 will branch to Bedrock here.
    const story = buildTemplatedDayStory(body);
    return NextResponse.json(story, {
      headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
    });
  }
  ```

- [ ] **Step 3.2: Smoke test the route**

  In a new terminal (dev server running):

  ```bash
  curl -sS -X POST http://localhost:3000/api/day-story \
    -H 'Content-Type: application/json' \
    -d '{"tripId":"t1","dayIndex":0,"destination":"Ibiza","dateLabel":"Mon, Jun 1","isFirstDay":true,"isLastDay":false,"activities":[]}' | jq
  ```

  Expected: a JSON `{ headline, narrative, source: "template" }`.

- [ ] **Step 3.3: Commit**

  ```bash
  git add apps/web/app/api/day-story/route.ts
  git commit -m "Day slide: Add /api/day-story route (Phase 1 templated)"
  ```

---

### Task 4: Service wrapper

**Files:**
- Create: `packages/shared/src/services/dayStory.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 4.1: Implement fetcher**

  Create `packages/shared/src/services/dayStory.ts`:

  ```typescript
  import type { DayStory, DayStoryRequest } from '../types';

  export async function fetchDayStory(req: DayStoryRequest): Promise<DayStory> {
    const res = await fetch('/api/day-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`day-story ${res.status}`);
    return res.json();
  }
  ```

- [ ] **Step 4.2: Export from barrel**

  Add to `packages/shared/src/index.ts`:

  ```typescript
  export { fetchDayStory } from './services/dayStory';
  ```

- [ ] **Step 4.3: Commit**

  ```bash
  git add packages/shared/src/services/dayStory.ts packages/shared/src/index.ts
  git commit -m "Day slide: Add fetchDayStory service wrapper"
  ```

---

### Task 5: useDayStory hook

**Files:**
- Create: `packages/shared/src/hooks/useDayStory.ts`
- Modify: `packages/shared/src/hooks/index.ts` (or wherever the hook barrel lives — verify with `grep "export.*useTrip" packages/shared/src/hooks/index.ts`)

- [ ] **Step 5.1: Implement the hook**

  Create `packages/shared/src/hooks/useDayStory.ts`:

  ```typescript
  import { useQuery } from '@tanstack/react-query';
  import { fetchDayStory } from '../services/dayStory';
  import type { DayStory, DayStoryRequest } from '../types';

  /**
   * Stable cache key — only changes when activities for this day change.
   * Reorders within the same day still re-key (intentional: the story narrates
   * the order of moments, so reorders should regenerate).
   */
  function hashActivities(req: DayStoryRequest): string {
    return req.activities
      .map((a) => `${a.name}|${a.type}|${a.startHour}`)
      .join('::');
  }

  export function useDayStory(req: DayStoryRequest | null) {
    const enabled = !!req && !!req.tripId;
    const hash = enabled ? hashActivities(req!) : '';

    return useQuery<DayStory>({
      queryKey: ['day-story', req?.tripId, req?.dayIndex, hash],
      queryFn: () => fetchDayStory(req!),
      enabled,
      staleTime: Infinity,        // story stays valid until activities change
      gcTime: 30 * 60_000,        // keep cached for 30 min after unmount
      retry: 1,
    });
  }
  ```

- [ ] **Step 5.2: Export from hook barrel**

  Add in `packages/shared/src/hooks/index.ts`:

  ```typescript
  export { useDayStory } from './useDayStory';
  ```

  Also re-export from the package root if that's how other hooks are exposed (`grep "useTrip\b" packages/shared/src/index.ts` to confirm).

- [ ] **Step 5.3: Run typecheck**

  Run: `npm run typecheck -w @travyl/shared`
  Expected: PASS.

- [ ] **Step 5.4: Commit**

  ```bash
  git add packages/shared/src/hooks/useDayStory.ts packages/shared/src/hooks/index.ts packages/shared/src/index.ts
  git commit -m "Day slide: Add useDayStory hook"
  ```

---

### Task 6: Glance design tokens

**Files:**
- Create: `apps/web/components/itinerary/glance/glance.tokens.ts`

- [ ] **Step 6.1: Add tokens**

  Create the file:

  ```typescript
  /** Spacing/typography constants for the At-a-Glance Day Slide. */
  export const GLANCE_TOKENS = {
    slide: {
      maxWidth: 1480,
      minHeight: 580,
      gridCols: '1fr 1.25fr',
      stackBreakpoint: 1024,
    },
    panel: {
      paddingDesktop: '48px 52px 44px',
      paddingMobile: '36px 32px',
    },
    moment: {
      gridCols: '110px 1fr auto',
      gapDesktop: 16,
    },
    pip: {
      heightDefault: 5,
      heightActive: 7,
      minWidth: 14,
      maxWidth: 60,
    },
  } as const;
  ```

- [ ] **Step 6.2: Commit**

  ```bash
  git add apps/web/components/itinerary/glance/glance.tokens.ts
  git commit -m "Day slide: Add glance design tokens"
  ```

---

### Task 7: DayMomentRow component (TDD)

**Files:**
- Create: `apps/web/components/itinerary/glance/DayMomentRow.tsx`
- Test:   `apps/web/components/itinerary/glance/__tests__/DayMomentRow.test.tsx`

- [ ] **Step 7.1: Write the failing test**

  Create the test file:

  ```tsx
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { DayMomentRow } from '../DayMomentRow';

  describe('DayMomentRow', () => {
    it('renders a calendar deep-link to the activity when an id is provided', () => {
      render(
        <DayMomentRow
          tripId="t1"
          when="2:30 PM"
          title="Arrive IBZ"
          activityId="a1"
        />
      );
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toBe('/trip/t1/calendar?activity=a1');
    });

    it('renders an empty-slot link when no activityId, with day+slot params', () => {
      render(
        <DayMomentRow
          tripId="t1"
          when="Evening"
          title="+ Add sunset & dinner"
          empty
          dayIndex={0}
          slot="evening"
        />
      );
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toBe('/trip/t1/calendar?day=0&slot=evening');
    });
  });
  ```

- [ ] **Step 7.2: Run the test to verify it fails**

  Run: `cd apps/web && npx vitest run components/itinerary/glance`
  Expected: FAIL — module not found.

- [ ] **Step 7.3: Implement the component**

  Create `apps/web/components/itinerary/glance/DayMomentRow.tsx`:

  ```tsx
  'use client';

  import Link from 'next/link';

  type Props = {
    tripId: string;
    when: string;
    title: string;
    activityId?: string;
    empty?: boolean;
    dayIndex?: number;
    slot?: 'morning' | 'afternoon' | 'evening' | 'latenight';
  };

  export function DayMomentRow({ tripId, when, title, activityId, empty, dayIndex, slot }: Props) {
    const href = activityId
      ? `/trip/${tripId}/calendar?activity=${activityId}`
      : `/trip/${tripId}/calendar?day=${dayIndex ?? 0}&slot=${slot ?? 'morning'}`;

    return (
      <Link
        href={href}
        className={[
          'grid grid-cols-[110px_1fr_auto] items-center gap-4 py-3.5',
          'border-b border-gray-200 dark:border-white/10 last:border-b-0',
          'transition-[padding,color] duration-200 hover:pl-1.5 group/row',
          empty ? 'cursor-pointer' : '',
        ].join(' ')}
      >
        <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-gray-500 dark:text-white/50 tabular-nums">
          {when}
        </span>
        <span
          className={[
            'font-serif text-[18px] leading-tight',
            empty
              ? 'italic text-amber-700 dark:text-amber-400 group-hover/row:text-gray-900 dark:group-hover/row:text-white'
              : 'text-gray-900 dark:text-white',
          ].join(' ')}
        >
          {title}
        </span>
        <span className="text-base text-gray-300 dark:text-white/30 transition-all duration-200 group-hover/row:translate-x-1 group-hover/row:text-blue-700 dark:group-hover/row:text-blue-400">
          →
        </span>
      </Link>
    );
  }
  ```

- [ ] **Step 7.4: Run the tests**

  Run: `cd apps/web && npx vitest run components/itinerary/glance`
  Expected: 2 PASS.

- [ ] **Step 7.5: Commit**

  ```bash
  git add apps/web/components/itinerary/glance/DayMomentRow.tsx \
          apps/web/components/itinerary/glance/__tests__/DayMomentRow.test.tsx
  git commit -m "Day slide: Add DayMomentRow component + tests"
  ```

---

### Task 8: DayPipPager component (TDD)

**Files:**
- Create: `apps/web/components/itinerary/glance/DayPipPager.tsx`
- Test:   `apps/web/components/itinerary/glance/__tests__/DayPipPager.test.tsx`

- [ ] **Step 8.1: Write the failing test**

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { DayPipPager } from '../DayPipPager';

  describe('DayPipPager', () => {
    it('marks the active pip and lights up days that have activities', () => {
      render(
        <DayPipPager
          activeIndex={1}
          activityCounts={[2, 0, 4, 0, 0]}
          onSelect={() => {}}
        />
      );
      const pips = screen.getAllByRole('button');
      expect(pips).toHaveLength(5);
      expect(pips[1]).toHaveAttribute('aria-current', 'true');
      expect(pips[0].className).toMatch(/has-data/);
      expect(pips[2].className).toMatch(/has-data/);
    });

    it('calls onSelect with the clicked index', async () => {
      const onSelect = vi.fn();
      render(<DayPipPager activeIndex={0} activityCounts={[0,0,0]} onSelect={onSelect} />);
      const pips = screen.getAllByRole('button');
      await userEvent.click(pips[2]);
      expect(onSelect).toHaveBeenCalledWith(2);
    });
  });
  ```

- [ ] **Step 8.2: Run tests, verify failure**

  Run: `cd apps/web && npx vitest run components/itinerary/glance/__tests__/DayPipPager`
  Expected: FAIL — module not found.

- [ ] **Step 8.3: Implement the component**

  Create `apps/web/components/itinerary/glance/DayPipPager.tsx`:

  ```tsx
  'use client';

  type Props = {
    activeIndex: number;
    activityCounts: number[];
    onSelect: (index: number) => void;
  };

  export function DayPipPager({ activeIndex, activityCounts, onSelect }: Props) {
    return (
      <div className="flex gap-1 items-center flex-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activityCounts.map((count, i) => {
          const isActive = i === activeIndex;
          const hasData = count > 0;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Go to day ${i + 1}`}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => onSelect(i)}
              className={[
                'flex-1 min-w-[14px] max-w-[60px] rounded-full transition-all duration-200 cursor-pointer',
                isActive
                  ? 'h-[7px] bg-gray-900 dark:bg-white'
                  : hasData
                    ? 'h-[5px] bg-gray-300 dark:bg-white/30 hover:bg-gray-400 has-data'
                    : 'h-[5px] bg-gray-200 dark:bg-white/15 hover:bg-gray-300',
              ].join(' ')}
            />
          );
        })}
      </div>
    );
  }
  ```

- [ ] **Step 8.4: Run tests**

  Run: `cd apps/web && npx vitest run components/itinerary/glance/__tests__/DayPipPager`
  Expected: 2 PASS.

- [ ] **Step 8.5: Commit**

  ```bash
  git add apps/web/components/itinerary/glance/DayPipPager.tsx \
          apps/web/components/itinerary/glance/__tests__/DayPipPager.test.tsx
  git commit -m "Day slide: Add DayPipPager component + tests"
  ```

---

### Task 9: DaySlideTextPanel

**Files:**
- Create: `apps/web/components/itinerary/glance/DaySlideTextPanel.tsx`

- [ ] **Step 9.1: Implement the panel**

  ```tsx
  'use client';

  import type { DayStory, ItineraryDayViewModel } from '@travyl/shared';
  import { DayMomentRow } from './DayMomentRow';

  type Props = {
    tripId: string;
    day: ItineraryDayViewModel;
    dayIndex: number;
    story: DayStory | undefined;
    isLoading: boolean;
  };

  export function DaySlideTextPanel({ tripId, day, dayIndex, story, isLoading }: Props) {
    return (
      <div className="px-8 sm:px-13 py-12 sm:py-12 flex flex-col gap-7 min-w-0">
        {/* Day header */}
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-[28px] font-medium text-gray-900 dark:text-white tracking-tight">
            {day.dayLabel}
          </span>
          <span className="text-[12px] tracking-[0.24em] uppercase font-semibold text-gray-500 dark:text-white/50">
            {day.dateLabel}
          </span>
        </div>

        {/* Narrative — AI or templated */}
        <div className="flex-1 flex flex-col justify-center">
          <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.24em] uppercase font-bold text-amber-600 dark:text-amber-400 mb-3.5">
            ✦ {story?.source === 'bedrock' ? 'Story' : 'Your day'}
          </span>
          {isLoading || !story ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-12 w-3/4 bg-gray-200 dark:bg-white/10 rounded" />
              <div className="h-4 w-full bg-gray-200 dark:bg-white/10 rounded" />
              <div className="h-4 w-5/6 bg-gray-200 dark:bg-white/10 rounded" />
            </div>
          ) : (
            <>
              <h2
                className="font-serif font-normal text-[44px] sm:text-[48px] leading-[1.04] tracking-tight text-gray-900 dark:text-white mb-3.5 max-w-[14ch]"
                dangerouslySetInnerHTML={{ __html: story.headline }}
              />
              <p className="font-serif italic text-[16px] leading-[1.55] text-gray-700 dark:text-white/70 max-w-[44ch]">
                {story.narrative}
              </p>
            </>
          )}
        </div>

        {/* Moments */}
        <div className="border-t border-gray-200 dark:border-white/10 pt-2 mt-auto">
          {day.timeGroups.flatMap((g) =>
            g.activities.map((a) => (
              <DayMomentRow
                key={a.id}
                tripId={tripId}
                when={formatWhen(a.startHour)}
                title={a.name}
                activityId={a.id}
              />
            ))
          )}
          {/* Empty-slot affordance: if a TOD has no activities, render one + Add row */}
          {(['morning', 'afternoon', 'evening', 'latenight'] as const)
            .filter((tod) => !day.timeGroups.find((g) => g.timeOfDay === tod && g.activities.length))
            .slice(0, 1) // only show one empty row to avoid clutter
            .map((tod) => (
              <DayMomentRow
                key={`empty-${tod}`}
                tripId={tripId}
                when={tod === 'latenight' ? 'Late' : tod[0].toUpperCase() + tod.slice(1)}
                title={`+ Add ${EMPTY_LABEL[tod]}`}
                empty
                dayIndex={dayIndex}
                slot={tod}
              />
            ))}
        </div>
      </div>
    );
  }

  const EMPTY_LABEL = {
    morning: 'a morning moment',
    afternoon: 'an afternoon plan',
    evening: 'sunset and dinner',
    latenight: 'a late-night spot',
  } as const;

  function formatWhen(hour: number): string {
    if (hour < 5) return 'Late';
    if (hour < 12) {
      const h = hour === 0 ? 12 : hour;
      return `${h}:00 AM`;
    }
    const h = hour === 12 ? 12 : hour - 12;
    return `${h}:00 PM`;
  }
  ```

- [ ] **Step 9.2: Run typecheck**

  Run: `cd apps/web && npx tsc --noEmit`
  Expected: PASS (or only pre-existing errors).

- [ ] **Step 9.3: Commit**

  ```bash
  git add apps/web/components/itinerary/glance/DaySlideTextPanel.tsx
  git commit -m "Day slide: Add DaySlideTextPanel"
  ```

---

### Task 10: DaySlideImagePanel

**Files:**
- Create: `apps/web/components/itinerary/glance/DaySlideImagePanel.tsx`

- [ ] **Step 10.1: Implement**

  ```tsx
  'use client';

  type Props = {
    imageUrl: string | null;
    weatherLabel?: string | null;  // e.g. "☀ 78°"
  };

  export function DaySlideImagePanel({ imageUrl, weatherLabel }: Props) {
    return (
      <div className="relative overflow-hidden bg-gray-900 min-h-[320px]">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover/slide:scale-[1.03]"
          />
        )}
        {/* Bottom gradient for legibility headroom */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/45" />
        {weatherLabel && (
          <div className="absolute top-6 right-6 z-10 bg-white/95 backdrop-blur-md text-gray-900 px-3.5 py-2 rounded-full text-[13px] font-semibold">
            {weatherLabel}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 10.2: Commit**

  ```bash
  git add apps/web/components/itinerary/glance/DaySlideImagePanel.tsx
  git commit -m "Day slide: Add DaySlideImagePanel"
  ```

---

### Task 11: DaySlide (composes panels + side nav)

**Files:**
- Create: `apps/web/components/itinerary/glance/DaySlide.tsx`

- [ ] **Step 11.1: Implement**

  ```tsx
  'use client';

  import { useEffect } from 'react';
  import type { DayStory, ItineraryDayViewModel } from '@travyl/shared';
  import { DaySlideTextPanel } from './DaySlideTextPanel';
  import { DaySlideImagePanel } from './DaySlideImagePanel';

  type Props = {
    tripId: string;
    day: ItineraryDayViewModel;
    dayIndex: number;
    totalDays: number;
    story: DayStory | undefined;
    isLoading: boolean;
    imageUrl: string | null;
    weatherLabel?: string | null;
    onPrev: () => void;
    onNext: () => void;
  };

  export function DaySlide({
    tripId, day, dayIndex, totalDays, story, isLoading, imageUrl, weatherLabel, onPrev, onNext,
  }: Props) {
    // ← / → arrow keys
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft' && dayIndex > 0) onPrev();
        else if (e.key === 'ArrowRight' && dayIndex < totalDays - 1) onNext();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [dayIndex, totalDays, onPrev, onNext]);

    const showArrows = totalDays > 1;
    const isFirst = dayIndex === 0;
    const isLast = dayIndex === totalDays - 1;

    return (
      <div className="relative">
        {showArrows && (
          <>
            <button
              type="button"
              aria-label="Previous day"
              onClick={onPrev}
              disabled={isFirst}
              className="hidden lg:flex absolute -left-6 top-1/2 -translate-y-1/2 w-[52px] h-[52px] rounded-full bg-white border border-gray-200 dark:bg-gray-900 dark:border-white/10 items-center justify-center z-10 shadow-lg text-gray-900 dark:text-white text-2xl transition-all hover:scale-105 hover:border-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next day"
              onClick={onNext}
              disabled={isLast}
              className="hidden lg:flex absolute -right-6 top-1/2 -translate-y-1/2 w-[52px] h-[52px] rounded-full bg-white border border-gray-200 dark:bg-gray-900 dark:border-white/10 items-center justify-center z-10 shadow-lg text-gray-900 dark:text-white text-2xl transition-all hover:scale-105 hover:border-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </>
        )}

        <article className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] bg-white dark:bg-[#0f1f33] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl min-h-[580px] group/slide">
          <DaySlideTextPanel
            tripId={tripId}
            day={day}
            dayIndex={dayIndex}
            story={story}
            isLoading={isLoading}
          />
          <DaySlideImagePanel imageUrl={imageUrl} weatherLabel={weatherLabel} />
        </article>
      </div>
    );
  }
  ```

- [ ] **Step 11.2: Commit**

  ```bash
  git add apps/web/components/itinerary/glance/DaySlide.tsx
  git commit -m "Day slide: Add DaySlide composition + keyboard nav"
  ```

---

### Task 12: New GlanceView (drop-in replacement)

This replaces the inline `GlanceView` defined in `ItinerarySection.tsx` (L159–~960).

**Files:**
- Create: `apps/web/components/itinerary/GlanceView.tsx`

- [ ] **Step 12.1: Implement**

  ```tsx
  'use client';

  import { useMemo } from 'react';
  import { useDayStory, useDestinationImage } from '@travyl/shared';
  import type { ItineraryDayViewModel } from '@travyl/shared';
  import { DaySlide } from './glance/DaySlide';
  import { DayPipPager } from './glance/DayPipPager';

  type Props = {
    tripId: string;
    days: ItineraryDayViewModel[];
    selectedDayIndex: number;
    onSelectDay: (i: number) => void;
    destination?: string;
    heroImages?: string[];
  };

  export function GlanceView({
    tripId, days, selectedDayIndex, onSelectDay, destination, heroImages,
  }: Props) {
    const day = days[selectedDayIndex];

    const storyReq = useMemo(() => {
      if (!day) return null;
      return {
        tripId,
        dayIndex: selectedDayIndex,
        destination: destination ?? '',
        dateLabel: day.dateLabel,
        isFirstDay: selectedDayIndex === 0,
        isLastDay: selectedDayIndex === days.length - 1,
        activities: day.timeGroups.flatMap((g) =>
          g.activities.map((a) => ({
            name: a.name,
            type: a.category,
            startHour: a.startHour,
            image: undefined as string | undefined, // TODO: thread through ItineraryDayViewModel if available
          })),
        ),
      };
    }, [day, days.length, destination, selectedDayIndex, tripId]);

    const { data: story, isLoading } = useDayStory(storyReq);

    // Image: featured-activity image → destination fallback
    const { data: destImage } = useDestinationImage(destination ?? '');
    const imageUrl =
      story?.featuredImageUrl ??
      destImage?.url ??
      heroImages?.[selectedDayIndex % Math.max(heroImages.length, 1)] ??
      null;

    if (!day) return null;

    const activityCounts = days.map((d) => d.activityCount);

    return (
      <div data-no-page-swipe>
        <DaySlide
          tripId={tripId}
          day={day}
          dayIndex={selectedDayIndex}
          totalDays={days.length}
          story={story}
          isLoading={isLoading}
          imageUrl={imageUrl}
          weatherLabel={null /* TODO: wire weather in Phase 3 */}
          onPrev={() => onSelectDay(Math.max(0, selectedDayIndex - 1))}
          onNext={() => onSelectDay(Math.min(days.length - 1, selectedDayIndex + 1))}
        />

        <div className="mt-7 flex items-center gap-4">
          <DayPipPager
            activeIndex={selectedDayIndex}
            activityCounts={activityCounts}
            onSelect={onSelectDay}
          />
        </div>

        <div className="mt-5 flex items-center justify-center gap-2.5 text-[12px] text-blue-900 dark:text-blue-200 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
          Story & moments regenerate when activities change · ← → to navigate
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 12.2: Commit**

  ```bash
  git add apps/web/components/itinerary/GlanceView.tsx
  git commit -m "Day slide: Add new GlanceView wrapper"
  ```

---

### Task 13: Wire the new GlanceView into ItinerarySection

**Files:**
- Modify: `apps/web/components/itinerary/ItinerarySection.tsx`

- [ ] **Step 13.1: Replace the inline GlanceView import**

  Open `apps/web/components/itinerary/ItinerarySection.tsx`. At the top of the file, alongside other imports (after L42 area):

  ```typescript
  import { GlanceView as NewGlanceView } from './GlanceView';
  ```

- [ ] **Step 13.2: Update the call site**

  Find the call site (around L1312):

  ```tsx
  <GlanceView
    days={days}
    selectedDayIndex={selectedDayIndex}
    onSelectDay={setSelectedDayIndex}
    arrivalFlight={arrivalFlight}
    ...
  />
  ```

  Replace with:

  ```tsx
  <NewGlanceView
    tripId={tripId}
    days={days}
    selectedDayIndex={selectedDayIndex}
    onSelectDay={setSelectedDayIndex}
    destination={trip?.destination?.split(',')[0]?.trim()}
    heroImages={trip?.trip_context?.hero_images}
  />
  ```

- [ ] **Step 13.3: Delete the inline GlanceView**

  Remove the entire `function GlanceView(...) { ... }` block (currently L159 through to its closing brace at ~L960). Run `grep -n "^function GlanceView\|^}" apps/web/components/itinerary/ItinerarySection.tsx` to confirm boundaries before deleting.

  Also remove anything that becomes unused after deletion (the imports list will likely have redundant entries — let TypeScript surface them).

- [ ] **Step 13.4: Typecheck and dev-server smoke test**

  ```bash
  npm run typecheck -w @travyl/web
  ```

  Expected: PASS (or only pre-existing errors).

  Then in the browser, navigate to `/trip/<existing-trip-id>`:

  - The "At a Glance" section now renders the new horizontal slide.
  - Side arrows + keyboard ←/→ navigate days.
  - Pip pager shows one pip per day; clicking jumps.
  - Empty days show the "+ Add ..." row.
  - Clicking a moment row navigates to `/trip/<id>/calendar?activity=<id>` (the calendar will not yet scroll/highlight — that's Task 14).

- [ ] **Step 13.5: Commit**

  ```bash
  git add apps/web/components/itinerary/ItinerarySection.tsx
  git commit -m "Day slide: Replace inline GlanceView with new horizontal slide"
  ```

---

### Task 14: Calendar deep-link handling

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/calendar/page.tsx`

- [ ] **Step 14.1: Survey the existing page**

  Read the file. Confirm where activities are rendered and where day-state is set. Note the existing search-param handling (if any) so we extend rather than duplicate.

- [ ] **Step 14.2: Add query-param effect**

  At the top of the page component, add:

  ```tsx
  import { useSearchParams } from 'next/navigation';
  // ...
  const searchParams = useSearchParams();

  useEffect(() => {
    const activity = searchParams.get('activity');
    const day = searchParams.get('day');
    const slot = searchParams.get('slot');

    if (activity) {
      // Defer until activities are loaded
      const el = document.querySelector<HTMLElement>(`[data-activity-id="${activity}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('day-slide-flash');
        setTimeout(() => el.classList.remove('day-slide-flash'), 1800);
      }
    } else if (day !== null && slot) {
      // Open create-activity dialog at this day + slot — reuse existing flow
      // (the calendar's existing "click empty slot" handler dispatches a custom event;
      //  if not, set local state to open the picker at that slot)
      window.dispatchEvent(new CustomEvent('calendar:open-create', {
        detail: { dayIndex: Number(day), slot },
      }));
    }
  }, [searchParams]);
  ```

- [ ] **Step 14.3: Add `data-activity-id` to the existing event card**

  Open whichever calendar event component renders an activity (likely `apps/web/components/calendar/EventCard.tsx`). Add `data-activity-id={activity.id}` to its root.

- [ ] **Step 14.4: Add the flash CSS**

  In `apps/web/app/globals.css`:

  ```css
  @keyframes day-slide-flash {
    0%   { box-shadow: 0 0 0 0 rgba(30, 58, 95, 0.6); }
    50%  { box-shadow: 0 0 0 6px rgba(30, 58, 95, 0.2); }
    100% { box-shadow: 0 0 0 0 rgba(30, 58, 95, 0); }
  }
  .day-slide-flash {
    animation: day-slide-flash 1.6s ease-out;
  }
  ```

- [ ] **Step 14.5: Smoke test**

  In the browser:
  - From `/trip/<id>`, click any moment row.
  - Calendar opens, scrolls the activity into view, and pulses a soft ring.
  - Click an "+ Add ..." empty row.
  - Calendar opens at the right day; create dialog opens at the right slot (if the existing flow supports that custom event — if not, fall back to just scrolling to the day).

- [ ] **Step 14.6: Commit**

  ```bash
  git add apps/web/app/\(dashboard\)/trip/\[id\]/calendar/page.tsx \
          apps/web/components/calendar/EventCard.tsx \
          apps/web/app/globals.css
  git commit -m "Day slide: Calendar deep-links from At-a-Glance moment rows"
  ```

---

### Task 15: Phase-1 e2e smoke

**Files:**
- Create: `e2e/day-slide.spec.ts`

- [ ] **Step 15.1: Add Playwright spec**

  Use whichever trip ID is available in the seed data — `grep -r "playwright" e2e/` for the existing helper, or copy the pattern from another `e2e/*.spec.ts`.

  ```typescript
  import { test, expect } from '@playwright/test';

  test('At-a-Glance day slide renders and paginates', async ({ page }) => {
    await page.goto('/trip/SEED_TRIP_ID'); // replace with seeded id
    await page.locator('h2', { hasText: 'At a Glance' }).waitFor();

    // Slide is present
    const slide = page.locator('article').first();
    await expect(slide).toBeVisible();

    // Keyboard ArrowRight advances day
    await page.keyboard.press('ArrowRight');
    // Pip pager active should now be index 1
    const pips = page.locator('button[aria-label^="Go to day"]');
    await expect(pips.nth(1)).toHaveAttribute('aria-current', 'true');

    // Clicking a moment row navigates to calendar
    const firstRow = page.locator('a[href*="/calendar?activity="]').first();
    if (await firstRow.count() > 0) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/calendar\?activity=/);
    }
  });
  ```

- [ ] **Step 15.2: Run e2e**

  Run: `npx playwright test e2e/day-slide.spec.ts`
  Expected: PASS.

- [ ] **Step 15.3: Commit**

  ```bash
  git add e2e/day-slide.spec.ts
  git commit -m "Day slide: Add Playwright smoke for slide pagination + deep link"
  ```

---

**Phase 1 done.** UI ships. Story is templated. Now layer in Bedrock.

---

## Phase 2 — Bedrock-backed story

Goal: swap the templated payload for a real, AI-generated headline + narrative, with caching + auth + fallback. Branch decision: per spec, default to **Option A** — proxy through SST Lambda. Direct-from-Next-API-route Bedrock is rejected for plan simplicity (avoids new credential surface).

### Task 16: SST Lambda — `services/day-story.ts` (TDD where useful)

**Files:**
- Create: `services/day-story.ts`
- Create: `services/lib/dayStoryPrompt.ts`
- Create: `services/__tests__/day-story.test.ts` (or alongside `services/day-story.test.ts` — match existing pattern by `ls services/*.test.ts`)

- [ ] **Step 16.1: Write the failing prompt-builder test**

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { buildDayStoryPrompt, parseDayStoryResponse } from '../lib/dayStoryPrompt';

  describe('buildDayStoryPrompt', () => {
    it('embeds destination, day index, and activities', () => {
      const prompt = buildDayStoryPrompt({
        tripId: 't', dayIndex: 1, destination: 'Ibiza', dateLabel: 'Tue, Jun 2',
        isFirstDay: false, isLastDay: false,
        activities: [{ name: 'Dalt Vila walk', type: 'sightseeing', startHour: 9 }],
      });
      expect(prompt).toContain('Ibiza');
      expect(prompt).toContain('Dalt Vila');
      expect(prompt).toContain('Day 2');
    });
  });

  describe('parseDayStoryResponse', () => {
    it('extracts headline + narrative from the JSON-fenced response', () => {
      const raw = '```json\n{"headline":"Old stone, <em>new water</em>","narrative":"Climb early."}\n```';
      const out = parseDayStoryResponse(raw);
      expect(out.headline).toContain('<em>');
      expect(out.narrative).toBe('Climb early.');
    });

    it('returns null on malformed responses', () => {
      expect(parseDayStoryResponse('not json')).toBeNull();
    });
  });
  ```

- [ ] **Step 16.2: Run + watch fail**

  Run: `cd services && npx vitest run __tests__/day-story` (or wherever your test file lives)
  Expected: FAIL — module not found.

- [ ] **Step 16.3: Implement the prompt + parser**

  Create `services/lib/dayStoryPrompt.ts`:

  ```typescript
  import type { DayStoryRequest } from '@travyl/shared';

  export function buildDayStoryPrompt(req: DayStoryRequest): string {
    const acts = req.activities.length === 0
      ? '(no activities planned yet)'
      : req.activities.map((a, i) => `${i + 1}. ${a.name} (${a.type}, starts at ${a.startHour}:00)`).join('\n');

    return [
      `You are a travel-magazine editor. Write a short, emotionally-grounded summary for one day of a trip to ${req.destination}.`,
      ``,
      `Day ${req.dayIndex + 1} (${req.dateLabel})${req.isFirstDay ? ' — arrival day' : req.isLastDay ? ' — departure day' : ''}.`,
      ``,
      `Activities:`,
      acts,
      ``,
      `Respond with strict JSON in a fenced \`\`\`json block:`,
      `- "headline": <= 8 words, second person, present tense. Wrap the last 1–2 words in <em>...</em>.`,
      `- "narrative": 1–2 sentences. Literary but never purple. Anchor at least one concrete moment from the list above (or, if empty, gently nudge toward planning).`,
      `- "featuredActivityIndex": integer index (0-based) of the activity to feature visually. Pick the most photogenic moment. If no activities, omit.`,
      ``,
      `Do not include other text outside the JSON block.`,
    ].join('\n');
  }

  export function parseDayStoryResponse(raw: string): { headline: string; narrative: string; featuredActivityIndex?: number } | null {
    const match = raw.match(/```json\s*([\s\S]*?)```/);
    const body = match ? match[1] : raw;
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed.headline === 'string' && typeof parsed.narrative === 'string') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }
  ```

- [ ] **Step 16.4: Run tests, expect PASS**

  Run: `cd services && npx vitest run dayStoryPrompt`
  Expected: 3 PASS.

- [ ] **Step 16.5: Implement the Lambda handler**

  Create `services/day-story.ts`. Use `services/parse-intent.ts` and `services/plan.ts` as patterns for Bedrock invocation. Pseudocode here — adapt to whichever client the existing services use (e.g., `BedrockRuntimeClient`):

  ```typescript
  import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
  import { Resource } from 'sst';
  import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
  import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
  import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
  import { validateAuth } from './lib/auth';
  import { buildDayStoryPrompt, parseDayStoryResponse } from './lib/dayStoryPrompt';
  import { buildTemplatedDayStory } from '@travyl/shared';
  import type { DayStoryRequest, DayStory } from '@travyl/shared';

  const bedrock = new BedrockRuntimeClient({});
  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const MODEL_ID = 'anthropic.claude-haiku-4-5-20251001-v1:0';
  const TTL_SECONDS = 60 * 60 * 24; // 24h

  function cacheKey(req: DayStoryRequest): string {
    const hash = req.activities.map((a) => `${a.name}|${a.type}|${a.startHour}`).join('::');
    return `day-story:${req.tripId}:${req.dayIndex}:${hash}`;
  }

  export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
      await validateAuth(event.headers.authorization);
      const req = JSON.parse(event.body ?? '{}') as DayStoryRequest;
      if (!req.tripId || typeof req.dayIndex !== 'number') {
        return { statusCode: 400, body: JSON.stringify({ error: 'Bad request' }) };
      }

      const key = cacheKey(req);

      // Cache check
      const cached = await dynamo.send(new GetCommand({
        TableName: Resource.RecommendationCache.name,
        Key: { pk: key },
      }));
      if (cached.Item?.story) {
        return { statusCode: 200, body: JSON.stringify(cached.Item.story) };
      }

      // Bedrock call
      const prompt = buildDayStoryPrompt(req);
      const result = await bedrock.send(new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 240,
          messages: [{ role: 'user', content: prompt }],
        }),
      }));

      const decoded = new TextDecoder().decode(result.body);
      const parsed = JSON.parse(decoded) as { content?: Array<{ text?: string }> };
      const text = parsed.content?.[0]?.text ?? '';
      const ai = parseDayStoryResponse(text);

      const story: DayStory = ai
        ? { ...ai, source: 'bedrock' }
        : buildTemplatedDayStory(req); // graceful degrade

      // Cache only successful Bedrock results (templates regenerate cheaply)
      if (ai) {
        await dynamo.send(new PutCommand({
          TableName: Resource.RecommendationCache.name,
          Item: { pk: key, story, ttl: Math.floor(Date.now() / 1000) + TTL_SECONDS },
        }));
      }

      return { statusCode: 200, body: JSON.stringify(story) };
    } catch (e) {
      // Never fail the UI on a story — fall back to template
      try {
        const req = JSON.parse(event.body ?? '{}') as DayStoryRequest;
        return { statusCode: 200, body: JSON.stringify(buildTemplatedDayStory(req)) };
      } catch {
        return { statusCode: 500, body: JSON.stringify({ error: 'unavailable' }) };
      }
    }
  };
  ```

  **Verify** the bedrock client + model id by reading one of `services/parse-intent.ts` or `services/plan.ts`. If those use a different client wrapper, mirror it exactly. Cache table name `Resource.RecommendationCache.name` should match the existing wiring in `services/day-intelligence.ts`; confirm by searching for that string in the codebase.

- [ ] **Step 16.6: Run lambda-side tests**

  Run: `cd services && npx vitest run dayStoryPrompt day-story`
  Expected: PASS.

- [ ] **Step 16.7: Commit**

  ```bash
  git add services/day-story.ts services/lib/dayStoryPrompt.ts services/__tests__/day-story.test.ts
  git commit -m "Day slide: Add Bedrock-backed day-story Lambda"
  ```

---

### Task 17: Wire the new Lambda into SST infra

**Files:**
- Modify: `infra/api.ts`

- [ ] **Step 17.1: Add the route**

  Open `infra/api.ts`. Find the existing `api.route('GET /day-intelligence', ...)` block. Right after it, add:

  ```typescript
  api.route('POST /day-story', {
    handler: 'services/day-story.handler',
    link: [cacheTable, supabaseSecretKey, supabaseUrl],
    permissions: [
      {
        actions: ['bedrock:InvokeModel'],
        resources: ['arn:aws:bedrock:*:*:foundation-model/anthropic.claude-haiku-4-5-*'],
      },
    ],
  });
  ```

  Confirm the `permissions` syntax against existing Bedrock-using routes (search `infra/api.ts` for `bedrock:`).

- [ ] **Step 17.2: Deploy to production**

  Per CLAUDE.md (production-only deploys):

  ```bash
  AWS_PROFILE=525610233002_AdministratorAccess npx sst deploy --stage production
  ```

  Expected: deploy succeeds; new `POST /day-story` endpoint is live at the production API gateway.

- [ ] **Step 17.3: Smoke the endpoint**

  Get a Supabase JWT for a real trip-owning user (browser DevTools → Application → Local Storage → `sb-...`). Then:

  ```bash
  curl -sS -X POST https://yqtl1xdcea.execute-api.us-east-1.amazonaws.com/day-story \
    -H "Authorization: Bearer $JWT" \
    -H 'Content-Type: application/json' \
    -d '{"tripId":"<real-id>","dayIndex":0,"destination":"Ibiza","dateLabel":"Mon, Jun 1","isFirstDay":true,"isLastDay":false,"activities":[{"name":"Dalt Vila walk","type":"sightseeing","startHour":9}]}' | jq
  ```

  Expected: `{ headline, narrative, source: "bedrock" }`. Watch CloudWatch logs if it fails.

- [ ] **Step 17.4: Commit**

  ```bash
  git add infra/api.ts
  git commit -m "Day slide: Wire day-story Lambda into SST API"
  ```

---

### Task 18: Switch `/api/day-story` (Next.js) to proxy the Lambda

**Files:**
- Modify: `apps/web/app/api/day-story/route.ts`

- [ ] **Step 18.1: Update route to proxy + fall back to template**

  Replace the file body with:

  ```typescript
  import { NextResponse } from 'next/server';
  import { buildTemplatedDayStory } from '@travyl/shared';
  import type { DayStoryRequest } from '@travyl/shared';
  import { cookies } from 'next/headers';
  import { createServerClient } from '@supabase/ssr';

  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE
    ?? 'https://yqtl1xdcea.execute-api.us-east-1.amazonaws.com';

  export async function POST(request: Request) {
    let body: DayStoryRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body?.tripId || typeof body.dayIndex !== 'number') {
      return NextResponse.json({ error: 'tripId and dayIndex required' }, { status: 400 });
    }

    // Get the user's JWT to forward to the Lambda
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll: () => cookies().getAll(), setAll: () => {} } }
    );
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      // Unauthenticated → templated only
      return NextResponse.json(buildTemplatedDayStory(body));
    }

    try {
      const res = await fetch(`${API_BASE}/day-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        // Bedrock can take 2-5s; allow up to 10s
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const story = await res.json();
      return NextResponse.json(story);
    } catch {
      // Graceful degrade: templated story so the UI never breaks
      return NextResponse.json(buildTemplatedDayStory(body));
    }
  }
  ```

  **Verify** the Supabase server client pattern in another `/api/*` route (likely `/api/trips/route.ts` or similar) and mirror it exactly — env var names and cookie wiring must match.

- [ ] **Step 18.2: Manual smoke**

  In the browser:
  - Open `/trip/<id>`. Watch DevTools Network for `POST /api/day-story`.
  - Response includes `"source":"bedrock"` for at least one of the days.
  - Refresh — the cached response comes back instantly (DynamoDB cache hit).
  - Add an activity in the calendar. Return to overview. The story for that day regenerates (`source` may be bedrock again on first regeneration; subsequent reloads cache hit).

- [ ] **Step 18.3: Commit**

  ```bash
  git add apps/web/app/api/day-story/route.ts
  git commit -m "Day slide: Proxy /api/day-story to SST Bedrock Lambda"
  ```

---

**Phase 2 done.** Real AI stories live behind cache. UI degrades to templated story on failure.

---

## Phase 3 — Polish

### Task 19: Image fallback chain

**Files:**
- Modify: `apps/web/components/itinerary/GlanceView.tsx`

- [ ] **Step 19.1: Pull the featured-activity image through ItineraryDayViewModel**

  Read `packages/shared/src/viewmodels/itineraryViewModel.ts` (or wherever the view-model is built — `grep -r "ItineraryDayViewModel" packages/shared/src`). Confirm whether the activity entries already carry an `image` field. If they do, thread it into the `storyReq.activities[].image` mapping in `GlanceView.tsx` (currently `undefined`). If not, look up the activity's `activity_data.image` from the trip activities query.

- [ ] **Step 19.2: Use it as the first fallback**

  Update the `imageUrl` resolution in `GlanceView.tsx`:

  ```tsx
  const featuredAct = story?.featuredActivityIndex !== undefined
    ? day?.timeGroups.flatMap((g) => g.activities)[story.featuredActivityIndex]
    : undefined;

  const imageUrl =
    story?.featuredImageUrl
    ?? featuredAct?.image
    ?? destImage?.url
    ?? heroImages?.[selectedDayIndex % Math.max(heroImages?.length ?? 1, 1)]
    ?? null;
  ```

- [ ] **Step 19.3: Commit**

  ```bash
  git add apps/web/components/itinerary/GlanceView.tsx packages/shared/src/viewmodels/itineraryViewModel.ts
  git commit -m "Day slide: Image fallback chain — featured activity → destination → hero"
  ```

---

### Task 20: Weather chip

**Files:**
- Modify: `apps/web/components/itinerary/GlanceView.tsx`

- [ ] **Step 20.1: Use existing useWeather hook**

  Confirm via `grep useWeather packages/shared/src` and an existing call site (the trip page already uses it — see `apps/web/app/(dashboard)/trip/[id]/page.tsx`). Pull the day's weather and format as `☀ 78°` / `⛅ 81°` etc. (small icon mapping on weatherCode).

- [ ] **Step 20.2: Pass to DaySlide → DaySlideImagePanel as `weatherLabel`**

- [ ] **Step 20.3: Commit**

  ```bash
  git add apps/web/components/itinerary/GlanceView.tsx
  git commit -m "Day slide: Show day weather chip on image panel"
  ```

---

### Task 21: Prefetch ±1 day

**Files:**
- Modify: `apps/web/components/itinerary/GlanceView.tsx`

- [ ] **Step 21.1: Use React Query's prefetchQuery for adjacent days**

  ```tsx
  const queryClient = useQueryClient();
  useEffect(() => {
    [selectedDayIndex - 1, selectedDayIndex + 1]
      .filter((i) => i >= 0 && i < days.length)
      .forEach((i) => {
        const adjReq = /* build same as storyReq but for index i */;
        if (!adjReq) return;
        queryClient.prefetchQuery({
          queryKey: ['day-story', adjReq.tripId, adjReq.dayIndex, hashActivities(adjReq)],
          queryFn: () => fetchDayStory(adjReq),
          staleTime: Infinity,
        });
      });
  }, [selectedDayIndex, days.length, /* deps */]);
  ```

  Refactor the request-builder + hashing into a shared helper (`packages/shared/src/utils/dayStoryRequest.ts`) to avoid duplication.

- [ ] **Step 21.2: Commit**

  ```bash
  git add apps/web/components/itinerary/GlanceView.tsx packages/shared/src/utils/dayStoryRequest.ts
  git commit -m "Day slide: Prefetch story + image for adjacent days"
  ```

---

### Task 22: Final manual QA pass

- [ ] **Step 22.1: Cross-cut checklist**

  Open the dev server and walk through every state. Mark each PASS / FAIL:

  - [ ] Trip with 14 days, varied content — slide renders, pagination smooth
  - [ ] Trip with 1 day — no arrows, no pip pager
  - [ ] Trip with 30 days — pip pager scrolls horizontally; active pip auto-scrolls into view
  - [ ] Empty day — "+ Add ..." row appears; "Suggestion" eyebrow if Bedrock returned suggestion-flavored text
  - [ ] First day — narrative reads as arrival
  - [ ] Last day — narrative reads as departure
  - [ ] Click moment row → calendar opens, activity scrolls into view, ring pulses
  - [ ] Click "+ Add ..." → calendar opens, create dialog at the right slot
  - [ ] Add activity in calendar → return to overview → story for that day regenerates within ~2s
  - [ ] Dark mode — all states render correctly
  - [ ] < 1024px viewport — slide stacks (text → image), arrows collapse inside edges
  - [ ] Bedrock is offline (block /api/day-story in DevTools) — UI shows templated story, no error toast

- [ ] **Step 22.2: Fix any failures, re-commit**

  If a check fails, treat it as a small task: minimal change + tests + commit.

- [ ] **Step 22.3: Push**

  ```bash
  git push origin develop
  ```

---

## Cleanup

- [ ] **Step C1: Confirm no dead code remains in ItinerarySection.tsx**

  Run: `grep -n "GlanceView\|TOD_START_HOURS\|QUICK_FILL_CATEGORIES" apps/web/components/itinerary/ItinerarySection.tsx`
  Expected: only the new `NewGlanceView` import + call site. Any leftover constants used solely by the old inline GlanceView should be deleted.

- [ ] **Step C2: Delete the brainstorm mockups**

  ```bash
  rm -rf .superpowers/brainstorm/139119-1778159964
  git add -A .superpowers/
  git commit -m "Day slide: Clean up brainstorm mockups"
  ```

  (Or keep — they're git-ignored. Skip if `.superpowers/` is in `.gitignore`.)

---

## Done criteria

- New `GlanceView` is the only "At a Glance" implementation; old inline `GlanceView` is deleted.
- `/api/day-story` returns a Bedrock-generated story (cached) for trips with activities; templated fallback otherwise.
- Moment rows deep-link the calendar; calendar scrolls/highlights the activity.
- Pip pager + ←/→ keys + side arrows all paginate days.
- Dark mode, mobile-stack, empty-day states all render.
- Story auto-regenerates within ~2s of an activity change.
- Production deploy is clean; CloudWatch shows healthy invocations.

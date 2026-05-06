# Trip Nav Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `apps/web/components/trip-tabs.tsx` (56px icon-only floating spine, 11 tabs, drag handle, inline customize popover) with a modern 220px always-on left rail. Labels visible at all times, three groups (Plan / Book / Explore), subtle active state, trip context header at top, mobile collapses to 5-tab bottom bar + More sheet.

**Architecture:** Single-file rewrite of `trip-tabs.tsx` → `trip-rail.tsx` (renamed for clarity, two import sites updated). Pure presentation refactor — keeps `useTripTheme` integration, route-based active detection, and the `getTabMeta` named export contract. Removes drag/customize/dark-magazine code paths. Settings page already has tab color editing via `ThemePicker`, so no new settings UI is needed — just delete the inline popover. Calendar page's hover-reveal pattern is preserved by passing `variant="dark"` to the new component.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS, Lucide icons, motion/react, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-06-trip-nav-redesign-design.md`

**Branch:** `feature/trip-nav-rail` (will be renamed to `feature/TRA-XXX` once Linear is unblocked)

---

## File Map

### Files created
- `apps/web/components/trip-rail.tsx` — new rail component (replaces `trip-tabs.tsx`)
- `apps/web/components/__tests__/trip-rail.test.tsx` — vitest tests for grouping + active route + render

### Files modified
- `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx` — import path; padding `md:pl-[100px]` → `md:pl-[240px]` (4 sites in this file); drop `position`/`dark` props on standard layout; calendar block keeps `dark` (renamed `variant="dark"`); remove the now-unused `padding around the rail` logic
- `apps/web/components/dashboard/TripTabBar.tsx` — import path for `getTabMeta`
- `apps/web/components/trip/CompactTripHeader.tsx` — `pl-[100px]` → `pl-[240px]` (1 site, line 125)
- `apps/web/components/trip/TripHistoryPanel.tsx` — export the internal `HistoryPanel` component so the rail can render it directly (the `TripHistoryToggle` icon-variant is no longer used; the pill variant is still used on the itinerary page so keep it)

### Files deleted
- `apps/web/components/trip-tabs.tsx` — replaced by `trip-rail.tsx`

### Files NOT touched (deliberately)
- `apps/web/app/(dashboard)/trip/[id]/settings/page.tsx` — already has tab color editing via `ThemePicker` (lines 602-614). No work needed here. The spec mentioned adding a section; the codebase already has it. Skip.
- All per-tab pages (`hotels/page.tsx`, `flights/page.tsx`, etc.) — none of them hardcode `pl-[100px]`. The padding lives in `trip-layout-inner.tsx` and `CompactTripHeader.tsx` only. Confirmed via grep.
- `apps/web/components/trip/TripThemeContext.tsx` — no changes; the rail consumes it as-is.

---

## Pre-flight (one-time)

- [ ] **Step 0.1: Confirm branch + clean tree**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git status
git branch --show-current
```

Expected: branch `feature/trip-nav-rail`, clean working tree (the spec commit `4a3387a9` is the latest).

- [ ] **Step 0.2: Verify `pl-[100px]` callsites match what the plan expects**

```bash
grep -rn "pl-\[100px\]" apps/web --include="*.tsx" --include="*.ts"
```

Expected: 4 hits — three in `trip-layout-inner.tsx` (lines 71, 290, 596) and one in `CompactTripHeader.tsx` (line 125). If any new hits appeared, update the plan before continuing.

- [ ] **Step 0.3: Verify the shared imports the rail will use**

The rail will import `useItineraryScreen` from `@travyl/shared` and consume `theme`, `theme.base`, `theme.tabColors`, `tabColorOverrides` from `useTripTheme()`. Confirm the names and paths exist before writing code:

```bash
grep -rn "export.*useItineraryScreen" packages/shared/src --include="*.ts" --include="*.tsx"
grep -n "tabColors\|tabColorOverrides\|theme.base\|TripThemeContextValue" apps/web/components/trip/TripThemeContext.tsx
```

Expected: `useItineraryScreen` is exported from a path re-exported through `@travyl/shared`'s root index; `tabColors` is a property on the resolved `theme` object; `tabColorOverrides` is on the context value. If any name doesn't match, update the imports/destructuring in Step 2.8 before authoring the component.

---

## Task 1: Export `HistoryPanel` so the rail can render it directly

**Files:**
- Modify: `apps/web/components/trip/TripHistoryPanel.tsx`

The current `TripHistoryPanel.tsx` defines `HistoryPanel` as a private component and only exports `TripHistoryToggle`. The rail needs to control its own open/close state and render the panel directly, without the toggle button wrapper.

- [ ] **Step 1.1: Read current export shape**

```bash
grep -n "^export\|^function\|^const " apps/web/components/trip/TripHistoryPanel.tsx | head -20
```

Confirm `HistoryPanel` is currently a top-level (but unexported) `function` declaration in the file. If not, locate it before editing.

- [ ] **Step 1.2: Add `export` to the `HistoryPanel` declaration**

In `apps/web/components/trip/TripHistoryPanel.tsx`, change:

```typescript
function HistoryPanel({ tripId, isOpen, onClose }: HistoryPanelProps) {
```

to:

```typescript
export function HistoryPanel({ tripId, isOpen, onClose }: HistoryPanelProps) {
```

If the props type isn't already named/exported, also export it so the rail can type its props correctly:

```typescript
export interface HistoryPanelProps { tripId: string; isOpen: boolean; onClose: () => void; }
```

(Use the props shape that already exists — don't invent new props.)

- [ ] **Step 1.3: Typecheck**

```bash
npm run typecheck --workspace=@travyl/web 2>&1 | tail -20
```

Expected: no new errors. (The repo may have pre-existing typecheck noise — only fail if your change *adds* errors.)

- [ ] **Step 1.4: Commit**

```bash
git add apps/web/components/trip/TripHistoryPanel.tsx
git commit -m "Export HistoryPanel from TripHistoryPanel module"
```

---

## Task 2: Write the `trip-rail.tsx` component (TDD)

**Files:**
- Create: `apps/web/components/trip-rail.tsx`
- Create: `apps/web/components/__tests__/trip-rail.test.tsx`

This is the largest task. We build the rail in slices: tab config + grouping logic first (testable), then the visual component, then the dark variant, then the mobile bottom bar + More sheet.

### Slice A — Tab config + grouping (pure logic, fully tested)

- [ ] **Step 2.1: Write the failing test for `TAB_GROUPS` shape**

Create `apps/web/components/__tests__/trip-rail.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { TAB_GROUPS, ALL_TABS, getTabMeta } from '../trip-rail';

describe('TAB_GROUPS', () => {
  it('has three groups in order: plan, book, explore', () => {
    expect(TAB_GROUPS.map(g => g.id)).toEqual(['plan', 'book', 'explore']);
  });

  it('plan group contains overview, itinerary, calendar', () => {
    expect(TAB_GROUPS[0].segments).toEqual(['', 'itinerary', 'calendar']);
  });

  it('book group contains hotels, flights, cars', () => {
    expect(TAB_GROUPS[1].segments).toEqual(['hotels', 'flights', 'cars']);
  });

  it('explore group contains activities, packing, budget, favorites', () => {
    expect(TAB_GROUPS[2].segments).toEqual(['activities', 'packing', 'budget', 'favorites']);
  });

  it('every grouped segment exists in ALL_TABS', () => {
    const allSegments = new Set(ALL_TABS.map(t => t.segment));
    for (const group of TAB_GROUPS) {
      for (const seg of group.segments) {
        expect(allSegments.has(seg)).toBe(true);
      }
    }
  });

  it('settings + history are NOT in any group (they live in the footer)', () => {
    const grouped = new Set(TAB_GROUPS.flatMap(g => g.segments));
    expect(grouped.has('settings')).toBe(false);
    expect(grouped.has('history')).toBe(false);
  });
});

describe('getTabMeta', () => {
  it('returns the matching tab def for a known segment', () => {
    expect(getTabMeta('hotels')?.label).toBe('Hotels');
  });

  it('returns the overview tab for the empty segment', () => {
    expect(getTabMeta('')?.label).toBe('Overview');
  });

  it('returns undefined for an unknown segment', () => {
    expect(getTabMeta('nonsense')).toBeUndefined();
  });
});
```

- [ ] **Step 2.2: Run the test to verify it fails**

```bash
cd apps/web && npx vitest run components/__tests__/trip-rail.test.tsx
```

Expected: fails with module-not-found error (`trip-rail` doesn't exist yet).

- [ ] **Step 2.3: Create `trip-rail.tsx` with just the config + `getTabMeta`**

Create `apps/web/components/trip-rail.tsx`:

```typescript
'use client';

import {
  Home, Calendar, CalendarDays, Plane, Building2, Compass,
  Luggage, PieChart, Heart, Car, Settings, History,
  type LucideIcon,
} from 'lucide-react';

export interface TabDef {
  segment: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
}

const DEFAULT_COLOR = '#1e3a5f';

export const ALL_TABS: TabDef[] = [
  { segment: '',           label: 'Overview',   subtitle: 'Trip overview & info',           icon: Home },
  { segment: 'itinerary',  label: 'Itinerary',  subtitle: 'Your day-by-day travel plan',    icon: Calendar },
  { segment: 'calendar',   label: 'Calendar',   subtitle: 'Visual calendar & For You',      icon: CalendarDays },
  { segment: 'hotels',     label: 'Hotels',     subtitle: 'Accommodation & stays',          icon: Building2 },
  { segment: 'flights',    label: 'Flights',    subtitle: 'Flight bookings & details',      icon: Plane },
  { segment: 'cars',       label: 'Cars',       subtitle: 'Vehicle rentals & transport',    icon: Car },
  { segment: 'activities', label: 'Explore',    subtitle: 'Restaurants, activities & more', icon: Compass },
  { segment: 'packing',    label: 'Packing',    subtitle: 'What to bring',                  icon: Luggage },
  { segment: 'budget',     label: 'Budget',     subtitle: 'Trip expenses & spending',       icon: PieChart },
  { segment: 'favorites',  label: 'Favorites',  subtitle: 'Saved places & activities',      icon: Heart },
  { segment: 'settings',   label: 'Settings',   subtitle: 'Trip preferences & theme',       icon: Settings },
];

export interface TabGroup {
  id: 'plan' | 'book' | 'explore';
  segments: string[];
}

export const TAB_GROUPS: TabGroup[] = [
  { id: 'plan',    segments: ['', 'itinerary', 'calendar'] },
  { id: 'book',    segments: ['hotels', 'flights', 'cars'] },
  { id: 'explore', segments: ['activities', 'packing', 'budget', 'favorites'] },
];

export function getTabMeta(segment: string): TabDef | undefined {
  return ALL_TABS.find((t) => t.segment === segment);
}

// Default export added in Slice B once the visual component exists.
// Keep this slice import-only for unit tests.
```

The History tab is intentionally NOT in `ALL_TABS` — it's not a route, it's a panel toggle. The footer renders it as a special row in Slice B.

- [ ] **Step 2.4: Run tests — they should pass**

```bash
cd apps/web && npx vitest run components/__tests__/trip-rail.test.tsx
```

Expected: all 9 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add apps/web/components/trip-rail.tsx apps/web/components/__tests__/trip-rail.test.tsx
git commit -m "Add trip-rail tab config and grouping logic with tests"
```

### Slice B — The visual rail component (light/dark variants)

- [ ] **Step 2.6: Add a render smoke test**

Append to `apps/web/components/__tests__/trip-rail.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import TripRail from '../trip-rail';
import { TripThemeProvider } from '../trip/TripThemeContext';

// Mock next/navigation since we don't render inside the App Router here
vi.mock('next/navigation', () => ({
  usePathname: () => '/trip/abc123/hotels',
}));

// Provide a minimal trip object the theme provider expects
const fakeTrip = {
  id: 'abc123',
  destination: 'Lisbon, Portugal',
  start_date: '2026-05-14',
  end_date: '2026-05-22',
  travelers: { adults: 2, children: 2, infants: 0, child_ages: [] },
  theme: 'navy',
} as any;

describe('<TripRail>', () => {
  it('renders all 11 tabs with their labels visible', () => {
    render(
      <TripThemeProvider trip={fakeTrip}>
        <TripRail tripId="abc123" />
      </TripThemeProvider>
    );
    for (const tab of ALL_TABS) {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    }
  });

  it('marks the hotels row as active (matches pathname)', () => {
    render(
      <TripThemeProvider trip={fakeTrip}>
        <TripRail tripId="abc123" />
      </TripThemeProvider>
    );
    const hotelsLink = screen.getByText('Hotels').closest('a');
    expect(hotelsLink?.getAttribute('aria-current')).toBe('page');
  });

  it('renders the Trip History footer row', () => {
    render(
      <TripThemeProvider trip={fakeTrip}>
        <TripRail tripId="abc123" />
      </TripThemeProvider>
    );
    expect(screen.getByText('Trip History')).toBeInTheDocument();
  });

  it('renders destination and date range in the header', () => {
    render(
      <TripThemeProvider trip={fakeTrip}>
        <TripRail tripId="abc123" />
      </TripThemeProvider>
    );
    expect(screen.getByText(/Lisbon/)).toBeInTheDocument();
    // Match either "May 14 – May 22" or whatever the date util produces
    expect(screen.getByText(/May.*14.*May.*22/)).toBeInTheDocument();
  });
});
```

Make sure the imports at the top of the file include:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
```

Check whether `@testing-library/react` is already a dev dep:

```bash
grep -E '"@testing-library/react"|"@testing-library/jest-dom"' apps/web/package.json
```

If missing, install:

```bash
npm install --save-dev --workspace=@travyl/web @testing-library/react @testing-library/jest-dom
```

Also ensure vitest is configured for jsdom and JSX. Check `apps/web/vitest.config.ts` (or equivalent). If no jsdom env, add it:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
});
```

(Skip the install/config step if the test infra is already there.)

- [ ] **Step 2.7: Run the new tests — they fail**

```bash
cd apps/web && npx vitest run components/__tests__/trip-rail.test.tsx
```

Expected: smoke tests fail because there's no default export yet.

- [ ] **Step 2.8: Implement the visual rail**

Append to `apps/web/components/trip-rail.tsx`:

```typescript
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTripTheme } from '@/components/trip/TripThemeContext';
import { useItineraryScreen } from '@travyl/shared';
import { HistoryPanel } from '@/components/trip/TripHistoryPanel';

export type RailVariant = 'light' | 'dark';

interface TripRailProps {
  tripId: string;
  variant?: RailVariant;
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return '';
  // Use the same locale-aware short-month format the rest of the trip page uses.
  // If a shared util exists in @travyl/shared, prefer it. Otherwise inline this:
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}

function travelerCount(t: { adults?: number; children?: number; infants?: number } | null | undefined): number {
  if (!t) return 1;
  return (t.adults ?? 0) + (t.children ?? 0) + (t.infants ?? 0);
}

export default function TripRail({ tripId, variant = 'light' }: TripRailProps) {
  const pathname = usePathname();
  const basePath = `/trip/${tripId}`;
  const { theme, tabColorOverrides } = useTripTheme();
  const { trip } = useItineraryScreen(tripId);
  const [historyOpen, setHistoryOpen] = useState(false);

  const dark = variant === 'dark';

  const isActive = (segment: string) => {
    if (segment === '') return pathname === basePath;
    return pathname === `${basePath}/${segment}` || pathname.startsWith(`${basePath}/${segment}/`);
  };

  const tabColorFor = (segment: string) => {
    const key = segment || 'index';
    return tabColorOverrides[key] ?? theme.tabColors[key] ?? theme.base;
  };

  // Mobile sees a different render — handled in Slice C below.
  return (
    <>
      <RailDesktop
        basePath={basePath}
        isActive={isActive}
        tabColorFor={tabColorFor}
        themeBase={theme.base}
        dark={dark}
        trip={trip}
        onOpenHistory={() => setHistoryOpen(true)}
      />
      <HistoryPanel tripId={tripId} isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
      {/* Mobile bar mounted in Slice C */}
    </>
  );
}

function RailDesktop({
  basePath, isActive, tabColorFor, themeBase, dark, trip, onOpenHistory,
}: {
  basePath: string;
  isActive: (s: string) => boolean;
  tabColorFor: (s: string) => string;
  themeBase: string;
  dark: boolean;
  trip: { destination?: string; start_date?: string | null; end_date?: string | null; travelers?: any } | null | undefined;
  onOpenHistory: () => void;
}) {
  const surface = dark
    ? 'bg-black/85 backdrop-blur-xl border-white/10'
    : 'bg-white border-gray-200';

  const headingColor = dark ? 'text-white' : 'text-[var(--trip-base)]';
  const metaColor = dark ? 'text-white/50' : 'text-gray-400';

  const count = travelerCount(trip?.travelers);

  return (
    <aside
      className={`hidden md:flex flex-col fixed top-12 bottom-0 left-0 w-[220px] border-r ${surface} z-30`}
      aria-label="Trip navigation"
    >
      {/* Trip context header */}
      <div className={`px-4 pt-4 pb-3 ${dark ? 'border-white/10' : 'border-[#f0eee9]'} border-b`}>
        {trip ? (
          <>
            <div className={`font-serif text-[16px] leading-tight ${headingColor}`}>
              {trip.destination ?? 'Trip'}
            </div>
            <div className={`text-[11px] mt-1 ${metaColor}`}>
              {formatDateRange(trip.start_date, trip.end_date)}
              {count > 0 && (
                <>
                  <span className="mx-1.5">·</span>
                  {count} {count === 1 ? 'traveler' : 'travelers'}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={`h-4 w-32 rounded ${dark ? 'bg-white/10' : 'bg-gray-100'} animate-pulse`} />
            <div className={`h-3 w-24 rounded mt-2 ${dark ? 'bg-white/10' : 'bg-gray-100'} animate-pulse`} />
          </>
        )}
      </div>

      {/* Groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-2">
        {TAB_GROUPS.map((group, idx) => (
          <div key={group.id}>
            {idx > 0 && <div className={`h-px my-1.5 mx-3 ${dark ? 'bg-white/[0.06]' : 'bg-[#f0eee9]'}`} />}
            {group.segments.map((seg) => {
              const tab = getTabMeta(seg);
              if (!tab) return null;
              return (
                <RailRow
                  key={seg}
                  href={seg ? `${basePath}/${seg}` : basePath}
                  label={tab.label}
                  Icon={tab.icon}
                  active={isActive(seg)}
                  tabColor={tabColorFor(seg)}
                  themeBase={themeBase}
                  dark={dark}
                />
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: Settings + History */}
      <div className={`px-2.5 pt-1.5 pb-3 border-t ${dark ? 'border-white/10' : 'border-[#f0eee9]'}`}>
        <RailRow
          href={`${basePath}/settings`}
          label="Settings"
          Icon={getTabMeta('settings')!.icon}
          active={isActive('settings')}
          tabColor={tabColorFor('settings')}
          themeBase={themeBase}
          dark={dark}
        />
        <RailRowButton
          label="Trip History"
          Icon={History}
          onClick={onOpenHistory}
          dark={dark}
        />
      </div>
    </aside>
  );
}

function rowClasses(active: boolean, dark: boolean) {
  const base = 'relative flex items-center gap-[11px] h-8 px-2.5 rounded-[7px] my-px text-[13px] transition-colors';
  if (active) {
    const text = dark ? 'text-white font-semibold' : 'text-[var(--trip-base)] font-semibold';
    return `${base} ${text}`;
  }
  const text = dark ? 'text-white/70 font-medium' : 'text-gray-600 font-medium';
  const hover = dark ? 'hover:bg-white/10' : 'hover:bg-[#f5f3ee]';
  return `${base} ${text} ${hover}`;
}

function RailRow({
  href, label, Icon, active, tabColor, themeBase, dark,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  tabColor: string;
  themeBase: string;
  dark: boolean;
}) {
  // Active background = theme color at 8% (light) / 18% (dark) opacity
  const activeBg = active
    ? (dark ? `${tabColor}2E` : `${tabColor}14`)
    : undefined;

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={rowClasses(active, dark)}
      style={active ? { backgroundColor: activeBg } : undefined}
    >
      {active && (
        <span
          aria-hidden
          className="absolute -left-[10px] top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r"
          style={{ backgroundColor: tabColor }}
        />
      )}
      <Icon size={16} strokeWidth={1.8} style={active ? { color: tabColor } : undefined} />
      <span>{label}</span>
    </Link>
  );
}

function RailRowButton({
  label, Icon, onClick, dark,
}: {
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
  dark: boolean;
}) {
  return (
    <button onClick={onClick} className={rowClasses(false, dark) + ' w-full text-left'}>
      <Icon size={16} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  );
}
```

Notes on the implementation:
- `rowClasses` and `RailRow`/`RailRowButton` are kept inline. If `trip-rail.tsx` grows past ~400 lines after Slice C, split them into `apps/web/components/trip-rail/RailRow.tsx`. Don't pre-split.
- Hex+alpha (`tabColor + '14'`) requires `tabColor` to be a 6-digit hex. The shared `resolveTheme` util (used by `useTripTheme`) returns hex, so this is safe. If the format ever changes, the rail will need a `hexAlpha` helper — flag during code review.
- `aria-current="page"` on the active link covers a11y for screen readers.

- [ ] **Step 2.9: Run tests — should pass**

```bash
cd apps/web && npx vitest run components/__tests__/trip-rail.test.tsx
```

Expected: all tests pass (config tests + smoke render tests).

- [ ] **Step 2.10: Commit**

```bash
git add apps/web/components/trip-rail.tsx apps/web/components/__tests__/trip-rail.test.tsx
git commit -m "Add TripRail desktop component (light + dark variants)"
```

### Slice C — Mobile bottom bar + More sheet

- [ ] **Step 2.11: Append the mobile components**

Append to `apps/web/components/trip-rail.tsx`:

```typescript
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, X } from 'lucide-react';

const MOBILE_PRIMARY: string[] = ['', 'itinerary', 'hotels', 'flights', 'activities'];

function RailMobile({
  basePath, isActive, tabColorFor, themeBase, onOpenHistory,
}: {
  basePath: string;
  isActive: (s: string) => boolean;
  tabColorFor: (s: string) => string;
  themeBase: string;
  onOpenHistory: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryTabs = MOBILE_PRIMARY.map(seg => getTabMeta(seg)).filter(Boolean) as TabDef[];
  const overflowTabs = ALL_TABS.filter(t => !MOBILE_PRIMARY.includes(t.segment) && t.segment !== 'settings');
  const overflowSettings = getTabMeta('settings')!;

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/92 dark:bg-black/85 backdrop-blur-xl border-t border-gray-200 dark:border-white/10">
        <div className="flex items-stretch h-12">
          {primaryTabs.map((tab) => {
            const active = isActive(tab.segment);
            const color = tabColorFor(tab.segment);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.segment}
                href={tab.segment ? `${basePath}/${tab.segment}` : basePath}
                aria-current={active ? 'page' : undefined}
                className="flex-1 flex flex-col items-center justify-center gap-0.5"
                style={active ? { color } : undefined}
              >
                <Icon size={18} strokeWidth={1.8} className={active ? '' : 'text-gray-400'} />
                <span className={`text-[10px] ${active ? 'font-semibold' : 'text-gray-400 font-medium'}`}>{tab.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400"
            aria-label="More tabs"
          >
            <MoreHorizontal size={18} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="more-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden fixed inset-0 bg-black/40 z-50"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              key="more-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-h-[60vh] bg-white dark:bg-[var(--background)] rounded-t-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <span className="text-[14px] font-semibold text-gray-900 dark:text-white">More</span>
                <button onClick={() => setMoreOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
              <div className="px-2 pb-4">
                {overflowTabs.map((tab) => {
                  const active = isActive(tab.segment);
                  const color = tabColorFor(tab.segment);
                  const Icon = tab.icon;
                  return (
                    <Link
                      key={tab.segment}
                      href={tab.segment ? `${basePath}/${tab.segment}` : basePath}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 px-3 h-11 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-[14px] text-gray-700 dark:text-gray-200"
                      style={active ? { color, backgroundColor: `${color}14`, fontWeight: 600 } : undefined}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      <span>{tab.label}</span>
                    </Link>
                  );
                })}
                <div className="h-px bg-gray-100 dark:bg-white/10 my-1.5 mx-3" />
                <Link
                  href={`${basePath}/settings`}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 h-11 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-[14px] text-gray-700 dark:text-gray-200"
                >
                  <overflowSettings.icon size={18} strokeWidth={1.8} />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={() => { setMoreOpen(false); onOpenHistory(); }}
                  className="flex items-center gap-3 px-3 h-11 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-[14px] text-gray-700 dark:text-gray-200 w-full text-left"
                >
                  <History size={18} strokeWidth={1.8} />
                  <span>Trip History</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

Then update the `TripRail` default export to render both desktop and mobile, and pass through `onOpenHistory`:

```typescript
return (
  <>
    <RailDesktop ... />
    <RailMobile
      basePath={basePath}
      isActive={isActive}
      tabColorFor={tabColorFor}
      themeBase={theme.base}
      onOpenHistory={() => setHistoryOpen(true)}
    />
    <HistoryPanel tripId={tripId} isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
  </>
);
```

- [ ] **Step 2.12: Add a mobile-mode test**

Add to `apps/web/components/__tests__/trip-rail.test.tsx`:

```typescript
it('renders the mobile bottom bar with primary tabs + More button', () => {
  render(
    <TripThemeProvider trip={fakeTrip}>
      <TripRail tripId="abc123" />
    </TripThemeProvider>
  );
  // The mobile bar exists in the DOM regardless of viewport (Tailwind hides it via media query).
  // We can assert the More button is present.
  expect(screen.getByLabelText('More tabs')).toBeInTheDocument();
});
```

- [ ] **Step 2.13: Run all rail tests**

```bash
cd apps/web && npx vitest run components/__tests__/trip-rail.test.tsx
```

Expected: all tests pass.

- [ ] **Step 2.14: Commit**

```bash
git add apps/web/components/trip-rail.tsx apps/web/components/__tests__/trip-rail.test.tsx
git commit -m "Add TripRail mobile bottom bar with More sheet"
```

---

## Task 3: Wire the new rail into `trip-layout-inner.tsx`

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx`

This is a careful in-place swap. Three changes: import path, prop names on the standard layout, prop names on the calendar hover-reveal.

- [ ] **Step 3.1: Update the import**

In `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx` line 9:

```typescript
// before
import TripTabs, { getTabMeta } from '@/components/trip-tabs';

// after
import TripRail, { getTabMeta } from '@/components/trip-rail';
```

- [ ] **Step 3.2: Update the standard-layout TripTabs call (line ~570)**

```typescript
// before
<TripTabs tripId={tripId} position="left" dark={isMagazine} />

// after
<TripRail tripId={tripId} variant={isMagazine ? 'dark' : 'light'} />
```

- [ ] **Step 3.3: Update the calendar hover-reveal TripTabs call (line ~553)**

```typescript
// before
<TripTabs tripId={tripId} position="left" dark />

// after
<TripRail tripId={tripId} variant="dark" />
```

- [ ] **Step 3.4: Update padding values (4 edits in this file)**

Three `md:pl-[100px]` sites and one `md:pl-[120px]` site (the magazine variant on the same line as the third 100px hit). Run grep to confirm the current state:

```bash
grep -n "md:pl-\[100px\]\|md:pl-\[120px\]" apps/web/app/\(dashboard\)/trip/\[id\]/trip-layout-inner.tsx
```

Expected hits: lines 71, 290, 596 with `md:pl-[100px]` and line 596 with `md:pl-[120px]` (the ternary's truthy branch). Replace:
- All three `md:pl-[100px]` → `md:pl-[240px]`
- The one `md:pl-[120px]` → `md:pl-[260px]` (magazine's wider gutter to match the new 220px rail)

Verify after:

```bash
grep -n "md:pl-\[100px\]\|md:pl-\[120px\]" apps/web/app/\(dashboard\)/trip/\[id\]/trip-layout-inner.tsx
```

Expected: empty.

- [ ] **Step 3.5: Typecheck + run web app dev**

```bash
npm run typecheck --workspace=@travyl/web 2>&1 | tail -20
```

```bash
npm run web
```

Open `http://localhost:3001/trip/<a-real-trip-id>/settings` in the browser. Verify visually:
- Rail is 220px wide on the left, white background, hairline border.
- Trip destination + dates show at the top of the rail.
- All 11 tabs render with labels.
- Settings row has the active state (8% theme tint + 3px accent bar + bold).
- Hover any other row — softer cream hover bg.
- Click Trip History — panel opens.
- Footer has Settings + Trip History.
- Resize browser to mobile width — rail disappears, bottom bar shows 5 primary tabs + More.
- Tap More — sheet slides up with the other 7 tabs.

If any visual differs from the spec (`docs/superpowers/specs/2026-05-06-trip-nav-redesign-design.md` § 5), fix before continuing.

- [ ] **Step 3.6: Commit**

```bash
git add apps/web/app/\(dashboard\)/trip/\[id\]/trip-layout-inner.tsx
git commit -m "Wire TripRail into trip layout, expand padding to 240px"
```

---

## Task 4: Update remaining `pl-[100px]` callsites

**Files:**
- Modify: `apps/web/components/trip/CompactTripHeader.tsx`
- Modify: `apps/web/components/dashboard/TripTabBar.tsx` (import path only)

- [ ] **Step 4.1: Update CompactTripHeader padding**

In `apps/web/components/trip/CompactTripHeader.tsx` line 125:

```typescript
// before
<div className="relative z-10 flex flex-col justify-end max-w-7xl mx-auto px-6 sm:px-10 md:pl-[100px] pb-5" style={{ minHeight: 300 }}>

// after
<div className="relative z-10 flex flex-col justify-end max-w-7xl mx-auto px-6 sm:px-10 md:pl-[240px] pb-5" style={{ minHeight: 300 }}>
```

- [ ] **Step 4.2: Update TripTabBar import path**

In `apps/web/components/dashboard/TripTabBar.tsx` line 6:

```typescript
// before
import { getTabMeta } from '@/components/trip-tabs'

// after
import { getTabMeta } from '@/components/trip-rail'
```

- [ ] **Step 4.3: Verify zero stale references**

```bash
grep -rn "components/trip-tabs\|from '@/components/trip-tabs'" apps/web --include="*.tsx" --include="*.ts"
grep -rn "pl-\[100px\]" apps/web --include="*.tsx" --include="*.ts"
```

Expected: both grep commands return empty.

- [ ] **Step 4.4: Typecheck + visual check**

```bash
npm run typecheck --workspace=@travyl/web 2>&1 | tail -20
```

Visit a trip page in the browser. Confirm the compact header no longer hugs the rail edge — there's the new 240px gutter on md+ screens.

- [ ] **Step 4.5: Commit**

```bash
git add apps/web/components/trip/CompactTripHeader.tsx apps/web/components/dashboard/TripTabBar.tsx
git commit -m "Update remaining callsites: pl-[100px] -> pl-[240px], import path"
```

---

## Task 5: Delete the old `trip-tabs.tsx`

**Files:**
- Delete: `apps/web/components/trip-tabs.tsx`

- [ ] **Step 5.1: Confirm no remaining references**

```bash
grep -rn "trip-tabs" apps/web --include="*.tsx" --include="*.ts"
```

Expected: empty. (If any hits show up, fix them first — do not delete with stale references.)

- [ ] **Step 5.2: Delete the file (staged for commit)**

```bash
git rm apps/web/components/trip-tabs.tsx
```

- [ ] **Step 5.3: Typecheck + run dev**

```bash
npm run typecheck --workspace=@travyl/web 2>&1 | tail -20
```

Visit a trip page. Should look identical to after Task 4 (this is just removing dead code).

- [ ] **Step 5.4: Commit**

```bash
git commit -m "Remove old trip-tabs component (replaced by trip-rail)"
```

---

## Task 6: Manual QA pass against the spec's acceptance criteria

This is non-code verification. Walk through every acceptance criterion in `docs/superpowers/specs/2026-05-06-trip-nav-redesign-design.md` § 8, checking the live dev build.

- [ ] **Step 6.1: Trip page renders the rail at 220px on md+ viewports**

Open dev tools, measure the rail's `getBoundingClientRect().width` — should be 220.

- [ ] **Step 6.2: All 11 tabs visible with labels — no scroll, no overflow, no hover required**

Inspect: count `<a>` tags inside the rail's `<nav>` plus the Settings link in the footer. Should be 11.

- [ ] **Step 6.3: Active tab is unambiguous**

Navigate to `/trip/<id>/hotels`. The Hotels row should have:
- A theme-color background tint (~8% opacity).
- A thin accent bar on its left edge.
- Bold label.

Navigate to `/trip/<id>` (overview). The Overview row should have those properties; Hotels should be plain.

- [ ] **Step 6.4: Settings page tab color editor still works**

Open `/trip/<id>/settings`, click the Appearance section. The existing `ThemePicker` lets you override per-tab colors. Change a tab's color, save, and verify the rail's accent bar / active tint reflects the override after refetch.

- [ ] **Step 6.5: Customize button + drag handle + inline color popover are gone**

Visually scan the rail. None of: drag-handle bar, gear-shaped customize button at the bottom of the spine, or color swatch popover.

- [ ] **Step 6.6: Mobile bottom bar shows exactly 5 primary tabs + "More"**

Resize browser to mobile width (e.g. 375px). Bottom bar shows: Overview, Itinerary, Hotels, Flights, Explore, More.

- [ ] **Step 6.7: Mobile More sheet shows the other 7 + Settings + History**

Tap More. Sheet contains: Calendar, Cars, Packing, Budget, Favorites, Settings, Trip History. (That's 5 hidden tabs + 1 hidden tab Calendar + Settings + History — 7 rows.) Tap any row — navigates and closes the sheet.

- [ ] **Step 6.8: Calendar page hover-reveal still works with dark variant**

Navigate to `/trip/<id>/calendar`. Move cursor to the very-left edge of the screen — rail slides in. Background is dark (black + blur), text is white.

- [ ] **Step 6.9: Per-tab color overrides still work**

In Settings → Appearance, set Hotels to bright pink. Save. Navigate to `/trip/<id>/hotels`. The accent bar + active tint should be pink, not the default theme color.

- [ ] **Step 6.10: No regressions in trip theme application**

Open a trip with a non-default theme (e.g. one of the 16 quick-color presets). Verify the rail's active state uses the theme's `base` color, not always navy.

If any criterion fails, return to the relevant Task and fix. If all pass, proceed to Task 7.

---

## Task 7: Run the test suite + lint + typecheck

- [ ] **Step 7.1: Run web tests**

```bash
cd apps/web && npx vitest run
```

Expected: all tests pass (the rail tests + any pre-existing tests).

- [ ] **Step 7.2: Run typecheck across the workspace**

```bash
npm run typecheck
```

Expected: no errors (or no *new* errors compared to the develop baseline).

- [ ] **Step 7.3: Run lint**

```bash
npm run lint
```

Expected: no errors. Fix any lint issues introduced by the new code (probably accessibility lint rules around `aria-current`, key warnings — these should already be handled by the implementation).

- [ ] **Step 7.4: Commit any final fixes**

If steps 7.1-7.3 surfaced fixes:

```bash
git add -A
git commit -m "Fix lint/typecheck issues from rail redesign"
```

---

## Task 8: Push branch and open PR

- [ ] **Step 8.1: Confirm branch + push**

```bash
git push -u origin feature/trip-nav-rail
```

- [ ] **Step 8.2: Open PR targeting `develop`**

```bash
gh pr create --base develop --title "Redesign Trip Page Nav As Always-On Left Rail" --body "$(cat <<'EOF'
## Summary

Replace the 56px icon-only floating spine on the trip page with a 220px always-on left rail. Labels visible at all times, three groups (Plan / Book / Explore), subtle active state with a 3px theme-color accent bar, trip context header (destination + dates) at the top of the rail, Settings + Trip History pinned to the bottom.

Drops drag-to-reposition, the inline customize popover (color overrides already live in Settings → Appearance), the dark magazine variant on the standard layout, and the standalone TripHistoryToggle icon button. Mobile collapses to a 5-tab bottom bar + "More" sheet. Calendar page keeps its hover-reveal pattern but uses the rail's dark variant.

Spec: \`docs/superpowers/specs/2026-05-06-trip-nav-redesign-design.md\`
Plan: \`docs/superpowers/plans/2026-05-06-trip-nav-redesign.md\`

## Test Plan

- [ ] Open \`/trip/<id>/settings\` on desktop — rail is 220px, Settings is the active row
- [ ] Click each of the 11 tabs — active state matches, no broken links
- [ ] Set a per-tab color override in Settings → Appearance — rail accent bar reflects it
- [ ] Open \`/trip/<id>/calendar\` — hover-reveal sidebar still works with dark variant
- [ ] Resize to mobile — bottom bar shows 5 primary tabs + More
- [ ] Tap More — sheet shows the other tabs; tapping any closes the sheet and navigates
- [ ] Open Trip History from the rail footer + from the More sheet — both work
- [ ] Run \`npm run typecheck && npm run lint && cd apps/web && npx vitest run\` — clean
EOF
)"
```

(Branch will be renamed to `feature/TRA-XXX` once Linear is unblocked. Update the PR title/branch then.)

---

## Task 9: Rename branch + update PR (only after Linear is unblocked)

- [ ] **Step 9.1: Create the Linear issue** in the Travyl workspace, get the TRA-XXX number.

- [ ] **Step 9.2: Rename branch locally + remotely**

`git push origin --delete <branch>` is destructive and removes the remote branch — confirm with the user before running it. Sequence:

```bash
git branch -m feature/trip-nav-rail feature/TRA-<NNN>
git push origin -u feature/TRA-<NNN>
# Confirm with user before this final step:
git push origin --delete feature/trip-nav-rail
```

- [ ] **Step 9.3: Update the PR's branch reference** via the GitHub UI or `gh pr edit`. (The PR may auto-close when its source branch is deleted; some setups require recreating the PR against the renamed branch instead. Check before deleting the old remote branch.)

---

## Out of Scope (deferred)

- Cmd-K command palette over the rail
- Rail collapse-to-icons toggle (defeats the always-visible-labels goal)
- Reordering / pinning of tabs
- Updating the global app navbar (separate concern)
- Restyling individual tab content pages
- Mobile gesture polish on the More sheet (drag-to-dismiss, snap points)

---

## Risk Notes

- **Theme hex+alpha assumption.** `tabColor + '14'` for 8% opacity assumes 6-digit hex. If `useTripTheme()` ever returns `rgb()` or `hsl()` strings, the rail's active-bg breaks. Mitigation: small helper `hexAlpha(hex, alpha)` in a follow-up if the format ever changes. Not required for this PR.
- **Mobile gesture interaction with HistoryPanel.** Both render via portal-ish patterns. If the More sheet and HistoryPanel can both be open simultaneously, the user can end up with stacked overlays. Mitigation: opening History from the More sheet closes the sheet first (already in the plan in Step 2.11).
- **`useItineraryScreen(tripId)` is called twice in the layout.** Once in `TripLayoutInner`, once in `TripRail`. React Query dedupes by key so this is fine, but worth noting.
- **Calendar page's hover-reveal width.** The reveal strip currently has `w-3 hover:w-auto`. With a 220px rail (vs 56px), the hover-target → hover-revealed transition might feel different. Manually QA on the calendar page; if it feels off, narrow the reveal strip's hover-detection logic. Not a blocker.

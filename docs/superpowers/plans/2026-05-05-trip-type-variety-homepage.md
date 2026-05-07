# Trip Type Variety on Homepage — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand homepage suggestion surfaces to feature trip types, travel styles, and activities alongside destinations.

**Architecture:** Three independent changes to two files — (1) replace single-category pill rotation with 4-category rotation in page.tsx, (2) expand the cycling placeholder phrases array, (3) add 3 more rows to the comparison table.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, lucide-react

---

## Chunk 1: Categorized Rotating Pills

**Files:**
- Modify: `apps/web/app/(main)/page.tsx`

### Step 1: Add static pill data + replace rotation logic

Add the static pill data arrays after `PLACEHOLDER_PHRASES`, then replace the existing
`allSuggestions`/`pillGroup` logic with multi-category rotation:

```ts
// ─── Static pill data (add after PLACEHOLDER_PHRASES) ──────────
const TRIP_TYPE_PILLS = [
  { id: "tt-1", label: "Beach vacation" },
  { id: "tt-2", label: "Solo backpacking" },
  { id: "tt-3", label: "Honeymoon" },
  { id: "tt-4", label: "Road trip" },
  { id: "tt-5", label: "Family trip" },
];

const TRAVEL_STYLE_PILLS = [
  { id: "ts-1", label: "Luxury escape" },
  { id: "ts-2", label: "Budget adventure" },
  { id: "ts-3", label: "Cultural immersion" },
  { id: "ts-4", label: "Wellness retreat" },
];

const ACTIVITY_PILLS = [
  { id: "ac-1", label: "Food & wine tour" },
  { id: "ac-2", label: "Ski holiday" },
  { id: "ac-3", label: "Surf trip" },
  { id: "ac-4", label: "Scuba diving" },
];

const PILLS_VISIBLE = 4;
```

Then replace the trending-destinations state/effect section:

```ts
const allDestinationPills = (trendingDestinations ?? []).map((d, i) => ({ id: `td-${i}`, label: d.name }));
const hasDestinations = allDestinationPills.length > 0;
const destGroupCount = Math.ceil(allDestinationPills.length / PILLS_VISIBLE);
const categoryCount = hasDestinations ? 4 : 3;

// Categories array — first entry is dynamic, rest are static
const CATEGORIES = hasDestinations
  ? [
      { label: "Destination", pills: allDestinationPills },
      { label: "Trip Type",  pills: TRIP_TYPE_PILLS },
      { label: "Style",      pills: TRAVEL_STYLE_PILLS },
      { label: "Activity",   pills: ACTIVITY_PILLS },
    ]
  : [
      { label: "Trip Type",  pills: TRIP_TYPE_PILLS },
      { label: "Style",      pills: TRAVEL_STYLE_PILLS },
      { label: "Activity",   pills: ACTIVITY_PILLS },
    ];

const [pillCategory, setPillCategory] = useState(0);
const [pillGroup, setPillGroup] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    if (pillCategory === 0 && hasDestinations && destGroupCount > 1) {
      // Destinations: advance group within category
      setPillGroup((prev) => {
        const next = prev + 1;
        if (next >= destGroupCount) {
          setPillCategory((pc) => (pc + 1) % categoryCount);
          return 0;
        }
        return next;
      });
    } else {
      // Static category or single destination group: advance category
      setPillCategory((pc) => (pc + 1) % categoryCount);
    }
  }, 3500);
  return () => clearInterval(interval);
}, [pillCategory, hasDestinations, destGroupCount, categoryCount]);

// Resolve current pills to show
const currentCategory = CATEGORIES[pillCategory];
const visiblePills = currentCategory.pills.slice(
  pillGroup * PILLS_VISIBLE,
  pillGroup * PILLS_VISIBLE + PILLS_VISIBLE
);
```

- [ ] **Add static pill data arrays after PLACEHOLDER_PHRASES**
- [ ] **Replace pill state/effect/logic with multi-category version**

### Step 3: Update pill rendering JSX

Replace the condition `planner.state.phase === 'idle' && allSuggestions.length > 0` (line 780) and the pill rendering block:

```tsx
{/* Suggestion Pills — only show when idle */}
{planner.state.phase === 'idle' && CATEGORIES.some((c) => c.pills.length > 0) && (
  <div className="flex flex-col items-center gap-2 mt-4 min-h-[56px]">
    {/* Category label */}
    <span className="text-[10px] text-[#9a7b5a] uppercase tracking-widest font-semibold">
      {currentCategory.label}
    </span>
    {/* Pills */}
    <div className="flex justify-center gap-1.5 sm:gap-2">
      <div
        key={`${pillCategory}-${pillGroup}`}
        className="flex justify-center gap-1.5 sm:gap-2 animate-[fadeSlideIn_0.4s_ease-out]"
      >
        {visiblePills.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              const promptForCategory = pillCategory === 0
                ? `Plan a trip to ${s.label}`
                : `Plan a ${s.label.toLowerCase()}`;
              if (requireAuth(promptForCategory)) return;
              skipQuestionsRef.current = true;
              skipRetryCountRef.current = 0;
              planner.submitPrompt(promptForCategory);
            }}
            className="text-[10px] sm:text-xs text-white font-semibold border border-white/50 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 hover:bg-white/30 transition-colors backdrop-blur-md bg-white/20 shadow-md drop-shadow-md whitespace-nowrap"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

Key changes from current:
- `allSuggestions.length > 0` → `CATEGORIES.some(...)` (works when destinations are empty)
- Added category label above pills
- Added `pillCategory` to the animation key so it re-triggers on category change
- Click handler uses `promptForCategory` logic

- [ ] **Update pill rendering JSX with category label and dynamic prompt**

### Step 4: Type check

- [ ] **Run `npm run typecheck` and fix any errors**

---

## Chunk 2: Expanded Placeholder Phrases

**Files:**
- Modify: `apps/web/app/(main)/page.tsx`

### Step 1: Replace PLACEHOLDER_PHRASES array

Replace lines 61-67 with the expanded array:

```ts
const PLACEHOLDER_PHRASES = [
  "7 days in Paris with my partner...",
  "A week in Tokyo exploring street food...",
  "Family beach vacation in Bali...",
  "Weekend getaway to the Swiss Alps...",
  "Solo backpacking through Southeast Asia...",
  "Honeymoon in Santorini...",
  "Road trip along the Amalfi Coast...",
  "Surf trip to Costa Rica...",
  "Wine tour through Tuscany...",
  "Digital nomad trip to Lisbon...",
  "Wellness retreat in Bali...",
  "Ski holiday in the French Alps...",
];
```

- [ ] **Replace PLACEHOLDER_PHRASES with 12-entries**

### Step 2: Type check

- [ ] **Run `npm run typecheck` and verify no errors**

---

## Chunk 3: Expanded Comparison Table

**Files:**
- Modify: `apps/web/components/home/ComparisonSection.tsx`

### Step 1: Add new icon imports + POINTS

Update the lucide-react import to include new icons:

```ts
import { X, Check, FileText, MessageCircle, Search, Calculator, CalendarDays, Users, Share2, Sparkles, BookOpen, LayoutDashboard } from "lucide-react";
```

Add 3 new rows at the end of the POINTS array (after line 12):

```ts
  { bad: { text: "Static PDFs & screenshots", icon: FileText }, good: { text: "Live, shareable itineraries", icon: Share2 } },
  { bad: { text: "Asking friends for recommendations", icon: MessageCircle }, good: { text: "AI + local expertise", icon: Sparkles } },
  { bad: { text: "Forgotten booking details", icon: BookOpen }, good: { text: "Everything in one dashboard", icon: LayoutDashboard } },
```

- [ ] **Add new icon imports and POINTS entries**

### Step 2: Type check

- [ ] **Run `npm run typecheck` and verify no errors**

---

## Verification

- [ ] **Build check:** Run `npm run build` on the web app (or `next build` equivalent) and confirm no errors
- [ ] **Visual check:** Start the dev server with `npm run web` and verify:
  - Pills cycle through 4 categories with labels
  - Trip type pills prompt correctly ("Plan a beach vacation")
  - 12 placeholder phrases cycle in the search bar
  - Comparison table shows 7 rows with all icons rendering

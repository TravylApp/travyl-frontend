# Trip Type Variety on Homepage

Expand the homepage suggestion surfaces to feature not just destinations but also trip
types, travel styles, and activities, making the site feel richer and more inspiring.

---

## 1. Categorized Rotating Pills

The existing pill carousel below the search bar currently cycles through groups of 4
destination names. Replace it with a 4-category rotation.

### Categories

| Category | Source | Label | Example pills |
|----------|--------|-------|--------------|
| Destinations | SerpAPI (existing) | `Destination` | Paris, Tokyo, Bali, Rome |
| Trip Types | Static data | `Trip Type` | Beach vacation, Solo backpacking, Honeymoon, Road trip, Family trip |
| Travel Styles | Static data | `Style` | Luxury escape, Budget adventure, Cultural immersion, Wellness retreat |
| Activities | Static data | `Activity` | Food & wine tour, Ski holiday, Surf trip, Scuba diving |

### Static data

```ts
const TRIP_TYPE_PILLS = [
  "Beach vacation",
  "Solo backpacking",
  "Honeymoon",
  "Road trip",
  "Family trip",
];

const TRAVEL_STYLE_PILLS = [
  "Luxury escape",
  "Budget adventure",
  "Cultural immersion",
  "Wellness retreat",
];

const ACTIVITY_PILLS = [
  "Food & wine tour",
  "Ski holiday",
  "Surf trip",
  "Scuba diving",
];

const CATEGORY_LABELS = ["Destination", "Trip Type", "Style", "Activity"];
```

### Rotation behavior

- 4 pills visible at a time (same as now)
- `pillCategory` state (0–3) advances every 3.5s, wraps back to 0 after 3
- When `pillCategory === 0` (Destinations): `pillGroup` advances every 3.5s as before,
  cycling through groups from the SerpAPI data (which may have 8–12 destinations)
- When `pillCategory > 0` (static categories): `pillGroup` is always 0, and 4 pills
  are selected from the static array (or fewer if the array has fewer than 4)
- A category label chip appears centered above the pill row:
  ```
  DESTINATION
  Paris · Tokyo · Bali · Rome
  ```
- The label uses `text-[10px] text-[#9a7b5a] uppercase tracking-widest` center-aligned
  above the pill row
- The pills themselves keep the existing white-on-translucent-dark style
- Transition: when the category changes, the pill row uses the existing
  `animate-[fadeSlideIn_0.4s_ease-out]` animation (same key the current rotation uses)

### Click behavior

All non-destination pills use a simple deterministic formula: `"Plan a [label]"`.

Example mappings:
- `"Beach vacation"` → `"Plan a beach vacation"`
- `"Solo backpacking"` → `"Plan a solo backpacking trip"`
- `"Food & wine tour"` → `"Plan a food & wine tour"`

Destination pills keep the existing behavior: `"Plan a trip to [name]"`.

### Empty destinations fallback

When `trendingDestinations` returns an empty array (API failure, no data):
- Skip the Destinations category entirely
- Reduce rotation to 3 categories (Trip Types → Style → Activity → Trip Types)
- The `pillCategory` state stays 0–2 (maps to categories 1–3 in the array) in this case

### Pill data resolution

Which pills to show at any moment is resolved from the current `pillCategory`:

```ts
const CATEGORIES = [
  { label: "Destination", pills: allSuggestions }, // dynamic
  { label: "Trip Type",  pills: TRIP_TYPE_PILLS },  // static
  { label: "Style",      pills: TRAVEL_STYLE_PILLS },// static
  { label: "Activity",   pills: ACTIVITY_PILLS },    // static
];

// Resolve current category
const category = CATEGORIES[pillCategory];
// Slice 4 pills from category.pills at pillGroup offset
const visiblePills = category.pills.slice(pillGroup * 4, pillGroup * 4 + 4);
```

When Destinations are empty, `CATEGORIES[0]` is omitted and indices shift by 1.

### State changes

```ts
const [pillCategory, setPillCategory] = useState(0); // 0=Destinations, 1=Trip Types, 2=Styles, 3=Activities
const [pillGroup, setPillGroup] = useState(0);        // subgroup within current category

// Single interval advances both:
useEffect(() => {
  const interval = setInterval(() => {
    if (pillCategory === 0 && pillGroupCount > 1) {
      // Destinations: advance group, and if we've shown all groups, move to next category
      setPillGroup((prev) => {
        const next = prev + 1;
        if (next >= pillGroupCount) {
          setPillCategory((pc) => (pc + 1) % categoryCount);
          return 0;
        }
        return next;
      });
    } else {
      // Static categories: advance category
      setPillCategory((pc) => (pc + 1) % categoryCount);
    }
  }, 3500);
  return () => clearInterval(interval);
}, [pillCategory, pillGroupCount]);
```

---

## 2. Expanded Placeholder Phrases

Replace the 5 existing `PLACEHOLDER_PHRASES` with 12 covering more trip variety:

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

---

## 3. Expanded Comparison Table

Add 3 more rows to the `POINTS` array in `ComparisonSection.tsx` using `lucide-react`
icons:

| # | bad (icon) | bad (text) | good (icon) | good (text) |
|---|-----------|------------|-------------|-------------|
| 5 | FileText | Static PDFs & screenshots | Share2 | Live, shareable itineraries |
| 6 | MessageCircle | Asking friends for recs | Sparkles | AI + local expertise |
| 7 | BookOpen | Forgotten booking details | LayoutDashboard | Everything in one dashboard |

The new entries follow the same shape:
```ts
{ bad: { text: "Static PDFs & screenshots", icon: FileText }, good: { text: "Live, shareable itineraries", icon: Share2 } },
{ bad: { text: "Asking friends for recommendations", icon: MessageCircle }, good: { text: "AI + local expertise", icon: Sparkles } },
{ bad: { text: "Forgotten booking details", icon: BookOpen }, good: { text: "Everything in one dashboard", icon: LayoutDashboard } },
```

---

## Files to modify

1. `apps/web/app/(main)/page.tsx` — pill rotation logic, placeholder phrases, static pill data
2. `apps/web/components/home/ComparisonSection.tsx` — comparison POINTS array + icon imports

## What not to change

- No changes to the SerpAPI trending-destinations API route
- No changes to the Get Inspired carousel
- No changes to the search bar styling or hero section layout
- No changes to the pill button styling (keeps existing white-on-dark look)

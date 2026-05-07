# Trip Command Bar — AI-Powered Floating Command Bar

**Date:** 2026-05-07
**Status:** Draft

## Overview

An always-visible floating command bar at the bottom of the trip dashboard that accepts natural language input. A backend Bedrock Claude endpoint parses the input into structured tool calls, which are then executed client-side against Supabase (respecting RLS) and Yjs (real-time calendar updates).

## Architecture

```
┌──────────────────────────────────────────────┐
│  Floating Command Bar (client component)      │
│  Sits above TripRail, always visible          │
└──────────────┬───────────────────────────────┘
               │ POST /api/trip/command
               ▼
┌──────────────────────────────────────────────┐
│  Next.js API Route (server-side)             │
│  - Validates JWT from cookie                 │
│  - Builds system prompt with trip context    │
│  - Calls Bedrock Claude 3.5 Haiku           │
│  - Returns { reply: string, toolCalls: [] } │
└──────────────┬───────────────────────────────┘
               │ toolCalls returned to client
               ▼
┌──────────────────────────────────────────────┐
│  Client-side executor                         │
│  - Iterates toolCalls array                  │
│  - addActivity → useActivityMutations        │
│  - moveActivity → useActivityMutations       │
│  - navigateTo → useRouter().push()           │
│  - askQuestion → display reply text          │
│  - Executes all against Supabase (JWT → RLS) │
└──────────────────────────────────────────────┘
```

### Key properties

- **RLS is respected** — the API route never touches Supabase. It only parses natural language into tool calls. All mutations go through the browser's Supabase client with the user's JWT.
- **Yjs stays in sync** — mutations use `useActivityMutations`, which updates Yjs + Supabase exactly like drag-and-drop or manual creation.
- **API is independently testable** — `POST /api/trip/command` with a valid JWT cookie returns structured JSON. No client-side rendering needed to verify parsing.
- **Always visible** — the bar is pinned to the bottom of the trip layout, above the TripRail.

## API Design

### `POST /api/trip/command`

**Request:**
```json
{
  "tripId": "uuid",
  "message": "add dinner at Nobu tomorrow at 8pm",
  "context": {
    "destination": "Tokyo, Japan",
    "tripStartDate": "2026-05-10",
    "tripEndDate": "2026-05-17",
    "currentDayOffset": 3,
    "existingActivityTitles": ["Flight to Tokyo", "Hotel Check-in"]
  }
}
```

**Response:**
```json
{
  "reply": "Added dinner at Nobu to Day 3 (Tuesday) at 8pm",
  "toolCalls": [
    {
      "tool": "addActivity",
      "args": {
        "title": "Dinner at Nobu",
        "day": 3,
        "startHour": 20,
        "duration": 2,
        "type": "food",
        "location": "Tokyo, Japan"
      }
    }
  ]
}
```

The `toolCalls` array supports multiple actions in one response. The client iterates and executes each sequentially, so a message like "move the flight to the next day and add a nearby hotel" returns two tool calls.

### Error handling

- **Parsing failure**: `{ reply: "I couldn't understand that. Try phrasing it as an action like 'add lunch at...'", toolCalls: [] }`
- **Validation failure**: If tool args are missing required fields, the API catches it server-side and returns a parsing-level error rather than a malformed tool call
- **Auth failure**: Returns 401 if the JWT is missing or invalid

## Component Design

### File: `apps/web/components/trip/CommandBar.tsx`

A client component rendered inside `TripLayoutContent`, below the children content area but above the TripRail.

### States

| State | Visual | Behavior |
|-------|--------|----------|
| Idle | Compact pill badge at bottom-center: sparkle icon + "Ask or do anything..." placeholder | Click to focus |
| Focused | Input expands to full available width, shows cursor + placeholder text | Type to compose |
| Submitting | Input shows animated loading dots, disabled state | POST in flight |
| Result | Reply text appears below input with action confirmation + undo hint | Auto-dismiss after 5s |
| Error | Inline error message with retry button | Tap to retry |

### Positioning

- **Desktop**: Fixed at bottom-center, sits above the TripRail sidebar. `bottom-4 left-1/2 -translate-x-1/2`
- **Mobile**: Fixed at bottom-center, above the mobile rail. `bottom-16` (above the rail)
- Slide-in animation on mount, minimal/compact when idle

## Tool Catalog (v1)

| Tool | Args | Client-side executor |
|------|------|---------------------|
| `addActivity` | `title: string, day: number, startHour: number, duration: number, type: string, location?: string, notes?: string` | `useActivityMutations().addActivity()` |
| `moveActivity` | `activityQuery: string` (fuzzy match title), `newDay?: number, newStartHour?: number` | `useActivityMutations().moveActivity()` |
| `removeActivity` | `activityQuery: string` (fuzzy match title) | `useActivityMutations().removeActivity()` |
| `navigateTo` | `tab: "calendar" \| "hotels" \| "flights" \| "cars" \| "activities" \| "packing" \| "budget" \| "settings"` | `useRouter().push()` |
| `addFlight` | `airline: string, flightNumber: string, day: number, departureTime: number, arrivalTime: number, from: string, to: string` | `addActivity()` with flight type |
| `addHotel` | `name: string, checkInDay: number, checkOutDay: number, address?: string` | `addActivity()` with hotel type |
| `suggestAndAdd` | `description: string, day: number, startHour: number` | Places API search → pick best → `addActivity()` |
| `askQuestion` | `question: string` | Returns text reply only, no mutation |

### Fuzzy activity matching

For `moveActivity` and `removeActivity`, the client uses Levenshtein distance to match `activityQuery` against the titles of all existing activities on the trip. The best match (if above a threshold) is used.

## Implementation Plan

### Phase 1: API Route + Bedrock Integration
1. Create `apps/web/app/api/trip/command/route.ts`
2. Define JSON schemas for each tool (for Claude structured output)
3. Wire up Bedrock Claude 3.5 Haiku invocation with system prompt + trip context
4. Return `{ reply, toolCalls }` response
5. Test via curl with JWT cookie

### Phase 2: Command Bar Component
1. Create `apps/web/components/trip/CommandBar.tsx`
2. Implement all UI states (idle, focused, submitting, result, error)
3. POST to `/api/trip/command` on submit
4. Display reply text with action confirmation

### Phase 3: Client-Side Tool Executor
1. Implement executor that maps tool calls to mutations
2. Fuzzy match activity titles for move/remove
3. Wire up `navigateTo` to Next.js router
4. Wire up `suggestAndAdd` to existing Places API
5. Add undo support (using existing `useUndoRedo`)

### Phase 4: Integration into Trip Layout
1. Render `CommandBar` inside `TripLayoutContent`
2. Handle positioning (desktop vs mobile, rail collapsed vs expanded)
3. Visual polish — animations, transitions, dark mode

### Phase 5: Testing
1. Test each tool against the API with various phrasings
2. Verify RLS enforcement (API returns tool calls, client executes with JWT)
3. Verify Yjs sync after mutations
4. Test error states and edge cases

## Open Questions

- Should `suggestAndAdd` use the existing Places API (SerpAPI) or should Claude generate the suggestion directly?
- Rate limiting — how many requests per minute should the API allow?
- Should we add a `/api/trip/command/test` variant that returns tool calls without executing them?

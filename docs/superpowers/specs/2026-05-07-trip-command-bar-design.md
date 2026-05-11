# Trip Command Bar — AI-Powered Floating Command Bar

**Date:** 2026-05-07
**Status:** Draft v2

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

### Context population (client-side)

The `context` object is built by the CommandBar component before POSTing:

- **destination**: Read from the Yjs trip data (from `useTripActivities` → trip row's `destination` field)
- **tripStartDate / tripEndDate**: Read from Yjs trip data
- **currentDayOffset**: Computed as `daysBetween(tripStartDate, new Date())` — represents today's 0-based day index within the trip. If today is before the trip, value is 0. If after, value is the last day.
- **existingActivityTitles**: Read from the `activities` array (from `useYjsSync`'s reactive state) — maps each activity to its `title`. This ensures the list is always current regardless of which tab the user is on.

All context data comes from the same Yjs-driven state that the calendar uses, so it's always consistent with what the user sees.

### Guardrails

- **Max input length**: 500 characters. Longer messages are rejected with 413.
- **Request timeout**: Bedrock call has a 10-second timeout. On timeout, returns `{ reply: "Request timed out. Try a simpler request.", toolCalls: [] }`.
- **Rate limiting**: Not enforced in v1 (Lambda cold starts make in-memory rate limiting unreliable). Future: API Gateway usage plans or DynamoDB TTL-based counters if abuse becomes an issue.

### System prompt

The API route constructs the following system prompt for Claude 3.5 Haiku:

```
You are a trip command assistant. Your job is to parse the user's natural language
request and return a list of tool calls to execute.

Trip context: {destination}, {tripStartDate} to {tripEndDate}
Current day offset (0-based): {currentDayOffset}
Existing activities: {existingActivityTitles}

Rules:
Date patterns (map to 0-based day offset):
  - "today" = day {currentDayOffset}
  - "tomorrow" = day {currentDayOffset + 1}
  - "day after tomorrow" = day {currentDayOffset + 2}
  - "day N" = day N-1 (e.g. "day 1" = day 0)
  - "first/last day" = day 0 / last day
  - Relative day names resolve from trip start (e.g. day 0 = {tripStartDate} day of week)
- Days are 0-based (day 0 = trip start date)
- startHour is a 24h float (9 AM = 9, 1:30 PM = 13.5, 8 PM = 20)
- duration is in fractional hours (1 hour = 1, 90 min = 1.5)
- Activity types: food, sightseeing, entertainment, shopping, outdoor, culture, travel, stay, transit, flight, car
- For moveActivity/removeActivity, use fuzzy matching against existing activity titles
- addFlight tool has its own args (airline, flightNumber, day, departureTime, arrivalTime, from, to)
- addHotel tool has its own args (name, checkInDay, checkOutDay, address)
- Use addActivity when the user knows exactly what they want ("add dinner at Nobu")
- Use suggestAndAdd when the user wants a recommendation ("suggest a good ramen place for lunch")
  suggestAndAdd generates all details from your knowledge of the destination
- NEVER suggest accessing a database or API directly — only return tool calls

Respond with a JSON object:
{
  "reply": "A brief, friendly confirmation of what was done",
  "toolCalls": [
    { "tool": "toolName", "args": { ... } }
  ]
}
```

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
| Idle | Compact pill badge at bottom-center: sparkle icon + "Ask or do anything..." | Click/tap to expand |
| Focused | Input expands to full available width with cursor + placeholder | Type to compose. Enter to submit. Escape to collapse. |
| Submitting | Input shows animated loading dots, disabled state | POST to API in flight |
| Executing | Input shows progress — "Adding activity..." text below input | Tool calls being executed client-side one by one. Shows each action as it completes. |
| Result | Reply text appears below input with action confirmation | Auto-dismiss after 5s. Tap to dismiss sooner. Hover pauses auto-dismiss. |
| Error | Inline error message with retry button. Keeps input text intact. | Tap retry to re-submit. Edit message and re-submit. |

### Multi-tool execution behavior

When the API returns multiple tool calls, the client executes them **sequentially and stops on first failure**:

1. Execute tool call #1 → success → update progress display
2. Execute tool call #2 → success → update progress display
3. Execute tool call #3 → failure → stop. Show partial success reply: "Added dinner and moved the flight, but couldn't add the hotel."

The `undo` (from `useUndoRedo`) records the entire batch as a single undoable action, so one undo reverts all tools that succeeded.

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
| `addFlight` | `airline: string, flightNumber: string, day: number, departureTime: number, arrivalTime: number, from: string, to: string` | Dedicated handler: builds title "AA 123: JFK → NRT", computes duration from departure→arrival (for overnight flights where arrival is next calendar day, duration is set to e.g. 14h and `day` refers to departure day), calls `addActivity()` with type="flight" |
| `addHotel` | `name: string, checkInDay: number, checkOutDay: number, address?: string` | Dedicated handler: builds title "Hotel Name (check-in Day N)", duration = checkOutDay - checkInDay days, calls `addActivity()` with type="stay" |
| `suggestAndAdd` | `title: string, day: number, startHour: number, duration: number, type: string, location?: string, notes?: string` | `addActivity()` directly (Claude generates suggestion details from its knowledge of the destination) |
| `askQuestion` | `question: string` | Reply text only, no mutation. Result does NOT auto-dismiss — persists until user dismisses or enters a new command. |

Note: `suggestAndAdd` and `addActivity` have the same args. They exist as separate tools so Claude can distinguish between "the user already knows what they want" (addActivity) vs "suggest something good at this spot" (suggestAndAdd). The reply text differs accordingly. No external Places API call is needed — Claude generates reasonable activity details from its training data.

### Fuzzy activity matching

For `moveActivity` and `removeActivity`, the client uses Levenshtein distance to match `activityQuery` against the titles of all existing activities on the trip. The best match (if above a threshold of 0.6) is used. If no match is found, the tool call is skipped and the reply is updated to indicate the failure.

## Implementation Plan

### Prerequisite: IAM Permissions

Add `bedrock:InvokeModel` to the `TravylWeb` Lambda's permissions block in `infra/web.ts`:

```ts
permissions: [
  new PolicyStatements({
    actions: ['bedrock:InvokeModel'],
    resources: ['*'], // or scope to the specific Claude model ARN
  }),
],
```

This is required because the API route runs inside the `TravylWeb` Lambda (not in the standalone `api.ts` services that already have Bedrock permissions).

### Phase 1: API Route + Bedrock Integration
1. Create `apps/web/app/api/trip/command/route.ts`
2. Define JSON schemas for each tool (for Claude structured output)
3. Wire up Bedrock Claude 3.5 Haiku invocation with system prompt + trip context
4. Return `{ reply, toolCalls }` response
5. Test via curl with JWT cookie
6. Add a `/api/trip/command/test` variant (same route, query param `?dry_run=true`) that returns the parsed tool calls without executing them client-side — useful for debugging NL parsing in isolation

### Phase 2: Command Bar Component
1. Create `apps/web/components/trip/CommandBar.tsx`
2. Implement all UI states (idle, focused, submitting, result, error)
3. POST to `/api/trip/command` on submit
4. Display reply text with action confirmation

### Phase 3: Client-Side Tool Executor
1. Define TypeScript types for each tool's args (mirrors API schemas)
2. Implement executor with client-side validation (Zod) before each tool call
3. Fuzzy match activity titles for move/remove (Levenshtein, 0.6 threshold)
4. Wire up `navigateTo` to Next.js router
5. Sequential execution with stop-on-first-failure
6. Batch undo support: wrap multi-tool execution in a single `useUndoRedo` undoable action
7. Update progress display ("Executing...") between each tool call

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

None. All decisions resolved in v2 of this spec.

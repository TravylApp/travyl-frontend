# Spotlight Intent Parsing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-phase query intent parser to Spotlight Search so that queries like "bakersfield restaurants" correctly extract a clean location + entity type instead of passing the raw string to the discover backend.

**Architecture:** A new `parseQueryIntent(query, token)` function runs before any search API calls. Phase 1 uses regex + a synonym table (zero latency, synchronous). Phase 2 falls back to Claude Haiku via a new Next.js API route when Phase 1 doesn't match. `useSpotlightSearch` consumes the parsed intent to pass a clean location to discover, auto-set the scope pill, and surface create-trip/route actions.

**Tech Stack:** TypeScript, Vitest (new for apps/web), `@anthropic-ai/sdk`, React Query (`useQuery`), Next.js App Router API route.

**Spec:** `docs/superpowers/specs/2026-03-25-spotlight-intent-parsing-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/lib/parseQueryIntent.ts` | Create | Phase 1 sync parser + Phase 2 LLM fallback |
| `apps/web/lib/__tests__/parseQueryIntent.test.ts` | Create | Unit tests for Phase 1 logic |
| `apps/web/vitest.config.ts` | Create | Vitest config for apps/web |
| `apps/web/app/api/parse-intent/route.ts` | Create | Next.js route: calls Haiku, returns ParsedIntent |
| `apps/web/hooks/useSpotlightSearch.ts` | Modify | Wire parsedIntent, update discover, replace memos |
| `apps/web/package.json` | Modify | Add `@anthropic-ai/sdk`, `vitest`, test script |

---

## Chunk 1: Phase 1 Parser + Tests

### Task 1: Install dependencies and set up Vitest for apps/web

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`

- [ ] **Step 1: Add vitest and @anthropic-ai/sdk to apps/web**

```bash
npm install --workspace=apps/web --save-dev vitest@^4.0.18
npm install --workspace=apps/web @anthropic-ai/sdk
```

- [ ] **Step 2: Add test script to apps/web/package.json**

In `apps/web/package.json`, add to the `"scripts"` block:
```json
"test": "vitest run"
```

- [ ] **Step 3: Create apps/web/vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Anchor to this package only — avoids picking up shared/node_modules tests
    include: [
      'lib/**/__tests__/**/*.test.ts',
      'hooks/**/__tests__/**/*.test.ts',
      'app/**/__tests__/**/*.test.ts',
    ],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 4: Verify vitest runs (no tests yet — just check it starts)**

```bash
cd apps/web && npx vitest run --reporter=verbose
```

Expected: exits cleanly with "No test files found" or similar (no error).

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts
git commit -m "chore(web): add vitest + @anthropic-ai/sdk for intent parsing"
```

---

### Task 2: Write parseQueryIntent Phase 1 (TDD)

**Files:**
- Create: `apps/web/lib/__tests__/parseQueryIntent.test.ts`
- Create: `apps/web/lib/parseQueryIntent.ts`

- [ ] **Step 1: Create the test file with failing tests**

Create `apps/web/lib/__tests__/parseQueryIntent.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { parseQueryIntentSync } from '../parseQueryIntent'

describe('parseQueryIntentSync — Pattern 1: trip to X', () => {
  it('matches "trip to paris"', () => {
    const r = parseQueryIntentSync('trip to paris')
    expect(r?.intent).toBe('create-trip')
    expect(r?.location).toBe('Paris')
  })

  it('matches "trip to new york"', () => {
    const r = parseQueryIntentSync('trip to new york')
    expect(r?.intent).toBe('create-trip')
    expect(r?.location).toBe('New York')
  })

  it('is case-insensitive', () => {
    const r = parseQueryIntentSync('TRIP TO LONDON')
    expect(r?.intent).toBe('create-trip')
    expect(r?.location).toBe('London')
  })
})

describe('parseQueryIntentSync — Pattern 2: new/create trip', () => {
  it('matches "new trip"', () => {
    const r = parseQueryIntentSync('new trip')
    expect(r?.intent).toBe('create-trip')
    expect(r?.location).toBeUndefined()
  })

  it('matches "create trip"', () => {
    const r = parseQueryIntentSync('create trip')
    expect(r?.intent).toBe('create-trip')
  })
})

describe('parseQueryIntentSync — Pattern 3: [entity] in [city]', () => {
  it('matches "restaurants in bakersfield"', () => {
    const r = parseQueryIntentSync('restaurants in bakersfield')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('restaurant')
    expect(r?.location).toBe('Bakersfield')
  })

  it('matches "food in chicago"', () => {
    const r = parseQueryIntentSync('food in chicago')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('restaurant')
    expect(r?.location).toBe('Chicago')
  })

  it('matches "hotels in miami"', () => {
    const r = parseQueryIntentSync('hotels in miami')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('hotel')
    expect(r?.location).toBe('Miami')
  })

  it('matches "flights in denver"', () => {
    const r = parseQueryIntentSync('flights in denver')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('flight')
    expect(r?.location).toBe('Denver')
  })

  it('matches "attractions in rome"', () => {
    const r = parseQueryIntentSync('attractions in rome')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('activity')
    expect(r?.location).toBe('Rome')
  })
})

describe('parseQueryIntentSync — Pattern 4: things to do in [city]', () => {
  it('matches "things to do in nyc"', () => {
    const r = parseQueryIntentSync('things to do in nyc')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('activity')
    expect(r?.location).toBe('Nyc')
  })

  it('matches "thing to do in seattle"', () => {
    const r = parseQueryIntentSync('thing to do in seattle')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('activity')
    expect(r?.location).toBe('Seattle')
  })

  it('does NOT misclassify as route (priority over Pattern 6)', () => {
    const r = parseQueryIntentSync('things to do in nyc')
    expect(r?.intent).not.toBe('route')
  })
})

describe('parseQueryIntentSync — Pattern 5: [city] [entity]', () => {
  it('matches "bakersfield restaurants"', () => {
    const r = parseQueryIntentSync('bakersfield restaurants')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('restaurant')
    expect(r?.location).toBe('Bakersfield')
  })

  it('matches "miami hotels"', () => {
    const r = parseQueryIntentSync('miami hotels')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('hotel')
    expect(r?.location).toBe('Miami')
  })

  it('matches "london flights"', () => {
    const r = parseQueryIntentSync('london flights')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('flight')
    expect(r?.location).toBe('London')
  })

  it('matches "paris museums"', () => {
    const r = parseQueryIntentSync('paris museums')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('activity')
    expect(r?.location).toBe('Paris')
  })
})

describe('parseQueryIntentSync — Pattern 6: X to Y (route)', () => {
  it('matches "la to sf"', () => {
    const r = parseQueryIntentSync('la to sf')
    expect(r?.intent).toBe('route')
    expect(r?.location).toBe('Sf')
  })

  it('matches "new york to boston"', () => {
    const r = parseQueryIntentSync('new york to boston')
    expect(r?.intent).toBe('route')
    expect(r?.location).toBe('Boston')
  })
})

describe('parseQueryIntentSync — Pattern 7: bare single-word location', () => {
  it('matches a single city name', () => {
    const r = parseQueryIntentSync('bakersfield')
    expect(r?.intent).toBe('discover')
    expect(r?.location).toBe('Bakersfield')
  })

  it('matches another single city name', () => {
    const r = parseQueryIntentSync('paris')
    expect(r?.intent).toBe('discover')
    expect(r?.location).toBe('Paris')
  })
})

describe('parseQueryIntentSync — no match → null (Phase 2)', () => {
  it('returns null for "good vibes only" (multi-word, no pattern)', () => {
    expect(parseQueryIntentSync('good vibes only')).toBeNull()
  })

  it('returns null for "somewhere to eat in bakersfield"', () => {
    expect(parseQueryIntentSync('somewhere to eat in bakersfield')).toBeNull()
  })
})

describe('parseQueryIntentSync — rawQuery is always preserved', () => {
  it('preserves the original raw query', () => {
    const r = parseQueryIntentSync('restaurants in Bakersfield')
    expect(r?.rawQuery).toBe('restaurants in Bakersfield')
  })
})

describe('parseQueryIntent (async) — Phase 2 not called when Phase 1 matches', () => {
  it('does not call fetch when Phase 1 matches', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    const { parseQueryIntent } = await import('../parseQueryIntent')
    await parseQueryIntent('bakersfield restaurants', 'test-token')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
cd apps/web && npx vitest run --reporter=verbose
```

Expected: All tests FAIL with "Cannot find module '../parseQueryIntent'".

- [ ] **Step 3: Create apps/web/lib/parseQueryIntent.ts with Phase 1 implementation**

```ts
// apps/web/lib/parseQueryIntent.ts

export type SearchIntent =
  | 'discover'
  | 'entity-search'
  | 'create-trip'
  | 'route'
  | 'unknown'

export interface ParsedIntent {
  intent: SearchIntent
  /** Title-cased place name, e.g. "Bakersfield". Normalized at parse time. */
  location?: string
  entityType?: 'restaurant' | 'hotel' | 'activity' | 'flight'
  rawQuery: string
}

// ---------------------------------------------------------------------------
// Synonym map — maps query words to canonical entity types
// ---------------------------------------------------------------------------

const ENTITY_SYNONYMS: Record<string, ParsedIntent['entityType']> = {
  // restaurant
  restaurant: 'restaurant', restaurants: 'restaurant',
  food: 'restaurant', dining: 'restaurant', eat: 'restaurant',
  eats: 'restaurant', cafe: 'restaurant', cafes: 'restaurant',
  bar: 'restaurant', bars: 'restaurant', brunch: 'restaurant',
  lunch: 'restaurant', dinner: 'restaurant',
  // hotel
  hotel: 'hotel', hotels: 'hotel', stay: 'hotel',
  lodging: 'hotel', accommodation: 'hotel', accommodations: 'hotel',
  hostel: 'hotel', hostels: 'hotel', motel: 'hotel', motels: 'hotel',
  airbnb: 'hotel', resort: 'hotel', resorts: 'hotel',
  // activity
  activity: 'activity', activities: 'activity',
  attraction: 'activity', attractions: 'activity',
  sights: 'activity', sightseeing: 'activity',
  tour: 'activity', tours: 'activity',
  museum: 'activity', museums: 'activity', park: 'activity', parks: 'activity',
  // flight
  flight: 'flight', flights: 'flight', fly: 'flight',
  airline: 'flight', airlines: 'flight',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Try each synonym as a prefix: "[synonym] in [city]" */
function matchEntityInCity(q: string): { entityType: ParsedIntent['entityType']; location: string } | null {
  for (const [synonym, entityType] of Object.entries(ENTITY_SYNONYMS)) {
    const re = new RegExp(`^${escapeRegex(synonym)}\\s+in\\s+(.+)$`)
    const m = q.match(re)
    if (m) return { entityType, location: toTitleCase(m[1].trim()) }
  }
  return null
}

/** Try each synonym as a suffix: "[city] [synonym]" */
function matchCityEntity(q: string): { entityType: ParsedIntent['entityType']; location: string } | null {
  for (const [synonym, entityType] of Object.entries(ENTITY_SYNONYMS)) {
    const re = new RegExp(`^(.+?)\\s+${escapeRegex(synonym)}$`)
    const m = q.match(re)
    if (m) return { entityType, location: toTitleCase(m[1].trim()) }
  }
  return null
}

// ---------------------------------------------------------------------------
// Phase 1: synchronous regex parser (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Synchronously parse a search query into a structured intent.
 * Returns null if no pattern matches — caller should fall back to Phase 2 (LLM).
 */
export function parseQueryIntentSync(rawQuery: string): ParsedIntent | null {
  const q = rawQuery.trim().toLowerCase()

  // Pattern 1: "trip to [destination]"
  const tripTo = q.match(/^trip\s+to\s+(.+)$/)
  if (tripTo) {
    return { intent: 'create-trip', location: toTitleCase(tripTo[1].trim()), rawQuery }
  }

  // Pattern 2: "new trip" / "create trip"
  if (/^(?:new|create)\s+trip$/.test(q)) {
    return { intent: 'create-trip', rawQuery }
  }

  // Pattern 3: "[entity] in [city]"
  const entityInCity = matchEntityInCity(q)
  if (entityInCity) {
    return { intent: 'entity-search', ...entityInCity, rawQuery }
  }

  // Pattern 4: "things to do in [city]" — must come before generic "X to Y"
  const thingsToDo = q.match(/^things?\s+to\s+do\s+in\s+(.+)$/)
  if (thingsToDo) {
    return { intent: 'entity-search', entityType: 'activity', location: toTitleCase(thingsToDo[1].trim()), rawQuery }
  }

  // Pattern 5: "[city] [entity]"
  const cityEntity = matchCityEntity(q)
  if (cityEntity) {
    return { intent: 'entity-search', ...cityEntity, rawQuery }
  }

  // Pattern 6: "X to Y" (generic route)
  const route = q.match(/^(.+?)\s+to\s+(.+)$/)
  if (route) {
    return { intent: 'route', location: toTitleCase(route[2].trim()), rawQuery }
  }

  // Pattern 7: bare single word — treat as destination discovery
  // Multi-word queries that don't match any pattern above go to Phase 2 (LLM).
  if (!q.includes(' ')) {
    return { intent: 'discover', location: toTitleCase(q), rawQuery }
  }

  // No match — caller falls back to Phase 2 (LLM)
  return null
}

// ---------------------------------------------------------------------------
// Phase 2: LLM fallback via /api/parse-intent (client-side, session-cached)
// ---------------------------------------------------------------------------

const CACHE_KEY = (q: string) => `parse-intent:${q.toLowerCase().trim()}`

async function parseViaLLM(query: string, token: string): Promise<ParsedIntent> {
  const cacheKey = CACHE_KEY(query)

  // Check session cache first
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) return JSON.parse(cached) as ParsedIntent
  } catch {
    // sessionStorage unavailable (SSR) — continue
  }

  // Call /api/parse-intent
  try {
    const res = await fetch(`/api/parse-intent?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json() as ParsedIntent

    // Cache the result
    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)) } catch { /* ignore */ }

    return data
  } catch {
    // Network failure or parse error — degrade gracefully
    return { intent: 'unknown', rawQuery: query }
  }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Parse a search query into structured intent.
 * Phase 1 (sync, zero latency) → Phase 2 (async LLM) if no pattern matched.
 */
export async function parseQueryIntent(query: string, token: string): Promise<ParsedIntent> {
  const syncResult = parseQueryIntentSync(query)
  if (syncResult) return syncResult
  return parseViaLLM(query, token)
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
cd apps/web && npx vitest run --reporter=verbose
```

Expected: All tests PASS. If any fail, fix the regex/synonym before continuing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/parseQueryIntent.ts apps/web/lib/__tests__/parseQueryIntent.test.ts
git commit -m "feat(web): add parseQueryIntent Phase 1 regex parser with tests"
```

---

## Chunk 2: API Route (Phase 2)

### Task 3: Create /api/parse-intent Next.js route

**Files:**
- Create: `apps/web/app/api/parse-intent/route.ts`

- [ ] **Step 1: Create the route file**

```ts
// apps/web/app/api/parse-intent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Lazy — avoids throwing at module load time when ANTHROPIC_API_KEY is absent
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic()
  return _client
}

const PROMPT = `You are a travel search intent parser. Extract structured intent from a search query.

Return ONLY valid JSON — no explanation, no markdown, no code fences.

Schema:
{
  "intent": "discover" | "entity-search" | "create-trip" | "route" | "unknown",
  "location": string | null,
  "entityType": "restaurant" | "hotel" | "activity" | "flight" | null
}

Rules:
- "discover": user wants to explore a destination with no specific entity type
- "entity-search": user wants a specific category of place in a location
- "create-trip": user wants to plan or start a trip
- "route": user mentions two places (origin to destination)
- "unknown": none of the above apply
- location should be in Title Case (e.g. "Bakersfield", "New York")

Query: `

function fallback(q: string) {
  return NextResponse.json({ intent: 'unknown', location: null, entityType: null, rawQuery: q })
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  // Auth check — must have a Bearer token (keeps open internet from burning API quota)
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return fallback(q)

  if (!q.trim()) return fallback(q)
  if (!process.env.ANTHROPIC_API_KEY) return fallback(q)

  try {
    const msg = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: `${PROMPT}"${q}"` }],
    })

    const text = (msg.content[0] as { type: 'text'; text: string }).text.trim()
    const parsed = JSON.parse(text) as {
      intent: string
      location: string | null
      entityType: string | null
    }

    return NextResponse.json({
      intent: parsed.intent ?? 'unknown',
      location: parsed.location ?? undefined,
      entityType: parsed.entityType ?? undefined,
      rawQuery: q,
    })
  } catch (err) {
    console.error('[parse-intent] error:', err)
    return fallback(q)
  }
}
```

- [ ] **Step 2: Set ANTHROPIC_API_KEY in .env.local**

Add to `apps/web/.env.local` (do not commit this file):
```
ANTHROPIC_API_KEY=<your-key-here>
```

The user will provide the key value. Only add this line — don't overwrite other vars.

- [ ] **Step 3: Manual smoke test**

With the dev server running (`npm run web`), get your session token from browser devtools (Application → Local Storage → `sb-*-auth-token` → `access_token`), then:

```bash
curl "http://localhost:3000/api/parse-intent?q=somewhere+nice+to+eat+in+bakersfield" \
  -H "Authorization: Bearer <your-token>"
```

Expected response:
```json
{ "intent": "entity-search", "location": "Bakersfield", "entityType": "restaurant", "rawQuery": "somewhere nice to eat in bakersfield" }
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/parse-intent/route.ts
git commit -m "feat(web): add /api/parse-intent route (Haiku LLM intent fallback)"
```

---

## Chunk 3: Wire into useSpotlightSearch

### Task 4: Update useSpotlightSearch.ts

**Files:**
- Modify: `apps/web/hooks/useSpotlightSearch.ts`

This task replaces three memos (`routeIntent`, `createTripIntent`, `actionResults`) and updates the discover query. Make each step a focused edit.

- [ ] **Step 1: Add the parsedIntent import**

At the top of `useSpotlightSearch.ts`, add the import after the existing imports:

```ts
import { parseQueryIntent, type ParsedIntent } from '@/lib/parseQueryIntent'
```

- [ ] **Step 2: Add the parsedIntent useQuery after `shouldSearch`**

Find this line (around line 180):
```ts
const shouldSearch = debouncedQuery.length >= 3 && !!token
```

Add directly after it:
```ts
// Intent parsing — Phase 1 (sync) or Phase 2 (Haiku LLM) before any search fires
const { data: parsedIntent, isLoading: intentLoading } = useQuery<ParsedIntent>({
  queryKey: ['parse-intent', debouncedQuery],
  queryFn: () => parseQueryIntent(debouncedQuery, token!),
  enabled: shouldSearch,
  staleTime: Infinity, // intent for a given query string never changes
})
```

- [ ] **Step 3: Update the discover query**

Find this block (around lines 194–199):
```ts
// Live discover for destination queries (restaurants, attractions, activities)
const { data: discoverData, isLoading: discoverLoading } = useQuery({
  queryKey: ['discover', debouncedQuery],
  queryFn: () => fetchDiscover(debouncedQuery, token!),
  enabled: shouldSearch && !scope, // only when no scope filter active
  staleTime: 60_000, // 1 minute (server caches for 1 hour)
})
```

Replace with:
```ts
// Use parsed location if available, fall back to raw query
const discoverLocation = parsedIntent?.location ?? debouncedQuery

// Live discover for destination queries (restaurants, attractions, activities)
const { data: discoverData, isLoading: discoverLoading } = useQuery({
  queryKey: ['discover', discoverLocation],
  queryFn: () => fetchDiscover(discoverLocation, token!),
  // Wait for intent to resolve; disable when scope is active
  enabled: shouldSearch && !scope && parsedIntent !== undefined,
  staleTime: 60_000,
})
```

- [ ] **Step 4: Replace routeIntent, createTripIntent, and actionResults memos**

Find and delete these three memo blocks (approximately lines 322–365):
```ts
// Detect route pattern "X to Y" from discover response
const routeIntent = useMemo((): SpotlightResult | null => {
  ...
}, [discoverData])

// Detect trip creation intent
const createTripIntent = useMemo((): SpotlightResult | null => {
  ...
}, [query])

// Inject create-trip action into results
const actionResults = useMemo((): Record<string, SpotlightResult[]> => {
  ...
}, [createTripIntent, routeIntent])
```

Replace all three with this single memo:
```ts
// Action results derived from parsed intent (replaces createTripIntent + routeIntent memos)
const actionResults = useMemo((): Record<string, SpotlightResult[]> => {
  if (!parsedIntent) return {}
  const actions: SpotlightResult[] = []

  if (parsedIntent.intent === 'create-trip') {
    actions.push({
      id: 'create-trip',
      type: 'action' as const,
      title: parsedIntent.location
        ? `Create trip to ${parsedIntent.location}`
        : 'Create New Trip',
      subtitle: 'Start planning a new adventure',
      href: '',
      score: 100,
      metadata: { prefillDestination: parsedIntent.location ?? '' },
    })
  }

  if (parsedIntent.intent === 'route' && discoverData?.route) {
    const { origin, destination } = discoverData.route
    actions.push({
      id: 'create-trip-route',
      type: 'action' as const,
      title: `Plan trip: ${origin} to ${destination}`,
      subtitle: 'Start planning with destinations pre-filled',
      href: '',
      score: 100,
      metadata: { prefillDestination: destination, origin },
    })
  }

  return actions.length ? { action: actions } : {}
}, [parsedIntent, discoverData?.route])
```

- [ ] **Step 5: Add the auto-scope effect**

After the `actionResults` memo, add:
```ts
// Auto-set scope from parsed entity type (only when user hasn't set one manually)
const ENTITY_TYPE_TO_SCOPE: Partial<Record<string, SearchScope>> = {
  restaurant: 'restaurants',
  activity: 'activities',
}

useEffect(() => {
  if (parsedIntent?.entityType && scope === null) {
    const autoScope = ENTITY_TYPE_TO_SCOPE[parsedIntent.entityType]
    if (autoScope) setScope(autoScope)
  }
}, [parsedIntent?.entityType, scope])
```

- [ ] **Step 6: Update isLoading in the return statement**

Find:
```ts
isLoading: tripSearchLoading || entityLoading || discoverLoading,
```

Replace with:
```ts
isLoading: tripSearchLoading || entityLoading || discoverLoading || intentLoading,
```

- [ ] **Step 7: Run typecheck to confirm no TypeScript errors**

```bash
npm run typecheck
```

Expected: No errors. Fix any type issues before continuing (common: `parsedIntent` may be `undefined` in some paths — the `parsedIntent?.` optional chaining should handle this).

- [ ] **Step 8: Commit**

```bash
git add apps/web/hooks/useSpotlightSearch.ts
git commit -m "feat(web): wire parsedIntent into useSpotlightSearch — clean discover location + auto-scope"
```

---

## Chunk 4: Verification

### Task 5: Manual QA

- [ ] **Step 1: Start the dev server**

```bash
npm run web
```

- [ ] **Step 2: Open Spotlight (Ctrl+K) and test each case**

| Query | Expected scope pill | Expected destination card title |
|---|---|---|
| `bakersfield restaurants` | Restaurants | Bakersfield |
| `restaurants in bakersfield` | Restaurants | Bakersfield (same cache as above) |
| `things to do in nyc` | Activities | Nyc |
| `hotel in miami` | (none) | Miami |
| `flights to london` | (none) | London |
| `somewhere to eat in bakersfield` | Restaurants (via Haiku) | Bakersfield (via Haiku) |
| `trip to paris` | (none) | Create trip to Paris action card |
| `la to sf` | (none) | Plan trip: La to Sf action card |

- [ ] **Step 3: Verify existing flows are not broken**

| Query | Expected behavior |
|---|---|
| `rome` (existing trip name) | Trip results still appear |
| `duplicate activity` | Command result still appears |
| `settings` | Navigation result still appears |

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git status  # review — should be clean or only have .env.local (which is gitignored)
git commit -m "feat(web): spotlight intent parsing — regex Phase 1 + Haiku Phase 2 fallback" --allow-empty
git push origin feature/tra-279
```

---

## Deployment Checklist

Before merging to develop, the following must be done in the production environment:

- [ ] Set `ANTHROPIC_API_KEY` environment variable in the production deployment (user provides value)
- [ ] Verify the `/api/parse-intent` route is reachable in production
- [ ] Smoke test "bakersfield restaurants" in production Spotlight after deploy

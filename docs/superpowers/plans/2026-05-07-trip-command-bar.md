# Trip Command Bar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an always-visible floating AI command bar to the trip dashboard that parses natural language into tool calls (add activity, move, remove, navigate, add flight/hotel, ask questions) via Bedrock Claude 3.5 Haiku.

**Architecture:** A floating `<CommandBar>` component sits above the TripRail in `TripLayoutContent`. On submit, it POSTs to `/api/trip/command` which calls Bedrock Claude. Claude returns structured tool calls. The client executes them sequentially against Supabase (RLS-respecting via browser JWT) and Yjs (real-time calendar). Mutations are bridged via a module-level store that `CalendarShell` populates on mount — so `CommandBar` always has access to `useActivityMutations` regardless of which tab is active.

**Tech Stack:** Next.js 16 API route, AWS Bedrock (Claude 3.5 Haiku), Yjs (activitiesMap), Supabase (RLS via browser client), `useActivityMutations`, `useUndoRedo`

---

## Chunk 1: IAM Permissions + API Route

**Files:**
- Modify: `infra/web.ts`
- Create: `apps/web/app/api/trip/command/route.ts`

### Step 1: Add Bedrock permission to TravylWeb Lambda

In `infra/web.ts`, add a `permissions` block to the `site` definition, right after the `server: { timeout: '60 seconds' }` block and before `domain:`:

```ts
export const site = new sst.aws.Nextjs('TravylWeb', {
  path: 'apps/web',
  server: {
    timeout: '60 seconds',
  },
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    },
  ],
  domain: {
    // ...
  },
```

- [ ] **Add permissions block to `infra/web.ts`**

### Step 2: Create the API route

Create `apps/web/app/api/trip/command/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const MODEL_ID = 'anthropic.claude-3-5-haiku-20241022-v1:0'
const MAX_INPUT_LENGTH = 500
const TIMEOUT_MS = 10_000
const bedrockClient = new BedrockRuntimeClient({})

interface ToolCall {
  tool: string
  args: Record<string, unknown>
}

interface Context {
  destination: string
  tripStartDate: string
  tripEndDate: string
  currentDayOffset: number
  existingActivityTitles: string[]
}

interface RequestBody {
  tripId: string
  message: string
  context: Context
}

function buildSystemPrompt(context: Context): string {
  return `You are a trip command assistant. Your job is to parse the user's natural language
request and return a list of tool calls to execute.

Trip context: ${context.destination}, ${context.tripStartDate} to ${context.tripEndDate}
Current day offset (0-based): ${context.currentDayOffset}
Existing activities: ${context.existingActivityTitles.join(', ') || 'None yet'}

Rules:
Date patterns (map to 0-based day offset):
  - "today" = day ${context.currentDayOffset}
  - "tomorrow" = day ${context.currentDayOffset + 1}
  - "day after tomorrow" = day ${context.currentDayOffset + 2}
  - "day N" = day N-1 (e.g. "day 1" = day 0)
  - "first/last day" = day 0 / last day
  - Relative day names resolve from trip start (e.g. day 0 = trip start date day of week)
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
}`
}

function parseResponse(text: string): { reply: string; toolCalls: ToolCall[] } {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply : 'Done.',
      toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [],
    }
  } catch {
    return {
      reply: "I couldn't understand that. Try phrasing it as an action like 'add lunch at...'",
      toolCalls: [],
    }
  }
}

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing environment variable: ${key}`)
  return val
}

export async function POST(req: NextRequest) {
  try {
    // Auth — validate JWT from Supabase auth cookie
    const supabase = createServerClient(
      getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll() {},
        },
      },
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: RequestBody
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!body.tripId || typeof body.tripId !== 'string') {
      return NextResponse.json({ error: 'tripId required' }, { status: 400 })
    }
    if (!body.message || typeof body.message !== 'string' || body.message.length > MAX_INPUT_LENGTH) {
      return NextResponse.json({ error: `message required (max ${MAX_INPUT_LENGTH} chars)` }, { status: 413 })
    }

    const isDryRun = req.nextUrl.searchParams.get('dry_run') === 'true'
    const systemPrompt = buildSystemPrompt(body.context)

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        system: systemPrompt,
        messages: [{ role: 'user', content: `User request: "${body.message}"\n\nParse the user's request into tool calls.` }],
        max_tokens: 1024,
      }),
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await bedrockClient.send(command, { abortSignal: controller.signal })
      clearTimeout(timeout)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))
      const text: string = responseBody.content?.[0]?.text ?? ''
      const parsed = parseResponse(text)
      if (isDryRun) return NextResponse.json({ rawResponse: text, parsed, toolCalls: parsed.toolCalls })
      return NextResponse.json(parsed)
    } catch (err: any) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        return NextResponse.json({ reply: 'Request timed out. Try a simpler request.', toolCalls: [] })
      }
      throw err
    }
  } catch (err) {
    console.error('[trip/command] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Create `apps/web/app/api/trip/command/route.ts`**

### Step 3: Commit

```bash
git add infra/web.ts apps/web/app/api/trip/command/route.ts
git commit -m "feat: add trip command API route with Bedrock integration"
```

- [ ] **Commit chunk 1**

## Chunk 2: Command Types + Client Executor

**Files:**
- Create: `apps/web/lib/command-tools.ts`
- Create: `apps/web/lib/command-mutations-store.ts`

### Step 1: Create the mutation store

This module-level store bridges the gap between CalendarShell (which has access to `useActivityMutations`) and CommandBar (which is rendered at the layout level).

Create `apps/web/lib/command-mutations-store.ts`:

```typescript
import type { CalendarActivity } from '@/components/calendar/types'

export interface CommandMutations {
  addActivity: (activity: CalendarActivity) => Promise<void>
  moveActivity: (id: string, newDay: number, newStartHour: number) => void
  removeActivity: (id: string) => Promise<void>
  getAllActivities: () => CalendarActivity[]
  getActivityByTitle: (title: string) => CalendarActivity | undefined
  /** Start a batch for atomic undo. All operations in a batch are wrapped
   *  in a single undo entry when commitBatch() is called. */
  startBatch: () => void
  /** Commit the current batch, creating one undo entry for all operations.*/
  commitBatch: () => void
}

let _mutations: CommandMutations | null = null

export function setCommandMutations(m: CommandMutations) {
  _mutations = m
}

export function getCommandMutations(): CommandMutations | null {
  return _mutations
}
```

- [ ] **Create `apps/web/lib/command-mutations-store.ts`**

### Step 2: Define tool types and executor

Create `apps/web/lib/command-tools.ts`:

```typescript
import type { CalendarActivity } from '@/components/calendar/types'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { getCommandMutations } from './command-mutations-store'

// ─── Tool call types ─────────────────────────────────────────

export interface AddActivityArgs {
  title: string; day: number; startHour: number; duration: number
  type: string; location?: string; notes?: string
}
export interface MoveActivityArgs { activityQuery: string; newDay?: number; newStartHour?: number }
export interface RemoveActivityArgs { activityQuery: string }
export interface NavigateToArgs { tab: 'calendar' | 'hotels' | 'flights' | 'cars' | 'activities' | 'packing' | 'budget' | 'settings' }
export interface AddFlightArgs { airline: string; flightNumber: string; day: number; departureTime: number; arrivalTime: number; from: string; to: string }
export interface AddHotelArgs { name: string; checkInDay: number; checkOutDay: number; address?: string }
export interface SuggestAndAddArgs { title: string; day: number; startHour: number; duration: number; type: string; location?: string; notes?: string }
export interface AskQuestionArgs { question: string }

export type ToolCall =
  | { tool: 'addActivity'; args: AddActivityArgs }
  | { tool: 'moveActivity'; args: MoveActivityArgs }
  | { tool: 'removeActivity'; args: RemoveActivityArgs }
  | { tool: 'navigateTo'; args: NavigateToArgs }
  | { tool: 'addFlight'; args: AddFlightArgs }
  | { tool: 'addHotel'; args: AddHotelArgs }
  | { tool: 'suggestAndAdd'; args: SuggestAndAddArgs }
  | { tool: 'askQuestion'; args: AskQuestionArgs }

// ─── Fuzzy activity matching ─────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function bestMatch(query: string, titles: string[]): string | null {
  const THRESHOLD = 0.6
  let best: string | null = null
  let bestScore = 0
  for (const title of titles) {
    const maxLen = Math.max(query.length, title.length)
    if (maxLen === 0) continue
    const dist = levenshtein(query.toLowerCase(), title.toLowerCase())
    const score = 1 - dist / maxLen
    if (score > bestScore && score >= THRESHOLD) {
      bestScore = score
      best = title
    }
  }
  return best
}

// ─── Tool executor ───────────────────────────────────────────

export interface ExecutionResult { success: boolean; message: string }

// ─── Runtime arg validation ──────────────────────────────────

function validateRequired(obj: Record<string, unknown>, required: string[], toolName: string): string | null {
  for (const key of required) {
    if (obj[key] === undefined || obj[key] === null) return `${toolName}: missing required field "${key}"`
  }
  return null
}

export async function executeToolCall(
  toolCall: ToolCall,
  router: AppRouterInstance,
  reply: string,
): Promise<ExecutionResult> {
  const mutations = getCommandMutations()

  try {
    switch (toolCall.tool) {
      case 'addActivity':
      case 'suggestAndAdd': {
        const err = validateRequired(toolCall.args as any, ['title', 'day', 'startHour', 'duration', 'type'], toolCall.tool)
        if (err) return { success: false, message: err }
        if (!mutations) return { success: false, message: 'Calendar not loaded yet' }
        const a = toolCall.args
        const { v4: uuidv4 } = await import('uuid')
        const activity: CalendarActivity = {
          id: uuidv4(), title: a.title, type: a.type, day: a.day,
          startHour: a.startHour, duration: a.duration,
          location: a.location, notes: a.notes,
        }
        await mutations.addActivity(activity)
        return { success: true, message: `Added "${a.title}" to day ${a.day + 1}` }
      }

      case 'moveActivity': {
        const err = validateRequired(toolCall.args as any, ['activityQuery'], 'moveActivity')
        if (err) return { success: false, message: err }
        if (!mutations) return { success: false, message: 'Calendar not loaded yet' }
        const a = toolCall.args
        const titles = mutations.getAllActivities().map(act => act.title)
        const match = bestMatch(a.activityQuery, titles)
        if (!match) return { success: false, message: `Could not find "${a.activityQuery}"` }
        const activity = mutations.getActivityByTitle(match)
        if (!activity) return { success: false, message: `"${match}" not found` }
        mutations.moveActivity(activity.id, a.newDay ?? activity.day, a.newStartHour ?? activity.startHour)
        return { success: true, message: `Moved "${match}"` }
      }

      case 'removeActivity': {
        const err = validateRequired(toolCall.args as any, ['activityQuery'], 'removeActivity')
        if (err) return { success: false, message: err }
        if (!mutations) return { success: false, message: 'Calendar not loaded yet' }
        const a = toolCall.args
        const titles = mutations.getAllActivities().map(act => act.title)
        const match = bestMatch(a.activityQuery, titles)
        if (!match) return { success: false, message: `Could not find "${a.activityQuery}"` }
        const activity = mutations.getActivityByTitle(match)
        if (!activity) return { success: false, message: `"${match}" not found` }
        await mutations.removeActivity(activity.id)
        return { success: true, message: `Removed "${match}"` }
      }

      case 'navigateTo': {
        const errNav = validateRequired(toolCall.args as any, ['tab'], 'navigateTo')
        if (errNav) return { success: false, message: errNav }
        const tripId = typeof window !== 'undefined'
          ? window.location.pathname.match(/\/trip\/([^/]+)/)?.[1] : ''
        router.push(`/trip/${tripId}/${toolCall.args.tab}`)
        return { success: true, message: `Navigated to ${toolCall.args.tab}` }
      }

      case 'addFlight': {
        const errF = validateRequired(toolCall.args as any, ['airline', 'flightNumber', 'day', 'departureTime', 'arrivalTime', 'from', 'to'], 'addFlight')
        if (errF) return { success: false, message: errF }
        if (!mutations) return { success: false, message: 'Calendar not loaded yet' }
        const a = toolCall.args
        const { v4: uuidv4 } = await import('uuid')
        const title = `${a.airline} ${a.flightNumber}: ${a.from} → ${a.to}`
        const duration = a.arrivalTime > a.departureTime
          ? a.arrivalTime - a.departureTime
          : (24 - a.departureTime) + a.arrivalTime
        const activity: CalendarActivity = {
          id: uuidv4(), title, type: 'flight', day: a.day,
          startHour: a.departureTime, duration,
          location: `${a.from} → ${a.to}`,
          notes: `${a.airline} ${a.flightNumber}`,
        }
        await mutations.addActivity(activity)
        return { success: true, message: `Added flight ${title}` }
      }

      case 'addHotel': {
        const errH = validateRequired(toolCall.args as any, ['name', 'checkInDay', 'checkOutDay'], 'addHotel')
        if (errH) return { success: false, message: errH }
        if (!mutations) return { success: false, message: 'Calendar not loaded yet' }
        const a = toolCall.args
        const { v4: uuidv4 } = await import('uuid')
        const activity: CalendarActivity = {
          id: uuidv4(), title: a.name, type: 'stay', day: a.checkInDay,
          startHour: 15, duration: (a.checkOutDay - a.checkInDay) * 24,
          location: a.address,
        }
        await mutations.addActivity(activity)
        return { success: true, message: `Added hotel "${a.name}"` }
      }

      case 'askQuestion':
        return { success: true, message: reply }

      default:
        return { success: false, message: `Unknown tool` }
    }
  } catch (err) {
    return { success: false, message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` }
  }
}

/**
 * Execute a batch of tool calls sequentially. Stops on first failure.
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  router: AppRouterInstance,
  reply: string,
  onProgress?: (msg: string) => void,
): Promise<string> {
  if (toolCalls.length === 0) return reply

  // Start a batch so all operations share one undo entry
  const mutations = getCommandMutations()
  mutations?.startBatch()

  for (let i = 0; i < toolCalls.length; i++) {
    const result = await executeToolCall(toolCalls[i], router, reply)
    onProgress?.(result.message)
    if (!result.success) {
      mutations?.commitBatch()
      return `Partially done: ${result.message}`
    }
  }
  mutations?.commitBatch()
  return reply
}
```

- [ ] **Create `apps/web/lib/command-tools.ts`**

### Step 3: Wire mutations store into CalendarShell

In `apps/web/components/calendar/CalendarShell.tsx`, import and call `setCommandMutations` with the wrapped mutations (that include undo/redo). Add this somewhere after `useUndoRedo` is initialized:

```typescript
import { setCommandMutations } from '@/lib/command-mutations-store'

// Inside CalendarShell, after undoRedo hooks are defined:
useEffect(() => {
  setCommandMutations({
    addActivity,
    moveActivity,
    removeActivity,
    getAllActivities: () => activities,
    getActivityByTitle: (title: string) => activities.find(a => a.title === title),
    // startBatch/commitBatch are stubs for v1 — individual operations
    // each create their own undo entry. Future: wrap in a single undo entry.
    startBatch: () => {},
    commitBatch: () => {},
  })
  return () => setCommandMutations(null)
}, [addActivity, moveActivity, removeActivity, activities])
```

- [ ] **Add `setCommandMutations` call to `CalendarShell.tsx`**

### Step 4: Commit

```bash
git add apps/web/lib/command-mutations-store.ts apps/web/lib/command-tools.ts apps/web/...
git commit -m "feat: add command tool types, executor, and mutation bridge"
```

- [ ] **Commit chunk 2**

## Chunk 3: CommandBar Component

**Files:**
- Create: `apps/web/components/trip/CommandBar.tsx`

### Step 1: Create the floating CommandBar

Create `apps/web/components/trip/CommandBar.tsx`:

```tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Spark, Xmark, Refresh, NavArrowUp, NavArrowDown } from 'iconoir-react'
import type { ToolCall } from '@/lib/command-tools'
import { executeToolCalls } from '@/lib/command-tools'
import { useRouter } from 'next/navigation'

type BarState = 'idle' | 'focused' | 'submitting' | 'executing' | 'result' | 'error'

interface CommandBarProps {
  tripId: string
  context: {
    destination: string
    tripStartDate: string
    tripEndDate: string
    currentDayOffset: number
    existingActivityTitles: string[]
  }
}

export default function CommandBar({ tripId, context }: CommandBarProps) {
  const [barState, setBarState] = useState<BarState>('idle')
  const [input, setInput] = useState('')
  const [replyText, setReplyText] = useState('')
  const [progressText, setProgressText] = useState('')
  const [errorText, setErrorText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const resultTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const isHoveringResult = useRef(false)

  useEffect(() => {
    if (barState === 'focused' && inputRef.current) inputRef.current.focus()
  }, [barState])

  const clearResultTimer = useCallback(() => {
    if (resultTimerRef.current) { clearTimeout(resultTimerRef.current); resultTimerRef.current = undefined }
  }, [])

  const startResultTimer = useCallback(() => {
    clearResultTimer()
    resultTimerRef.current = setTimeout(() => {
      if (!isHoveringResult.current) { setBarState('idle'); setInput(''); setReplyText('') }
    }, 5000)
  }, [clearResultTimer])

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setBarState('submitting')
    setErrorText('')

    try {
      const res = await fetch('/api/trip/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, message: trimmed, context }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setErrorText(err.error || 'Request failed')
        setBarState('error')
        return
      }

      const data = await res.json()
      const { reply, toolCalls }: { reply: string; toolCalls: ToolCall[] } = data

      // askQuestion results persist until dismissed — no auto-dismiss
      const isQuestionOnly = toolCalls.length === 1 && toolCalls[0].tool === 'askQuestion'

      if (toolCalls.length === 0 || isQuestionOnly) {
        setReplyText(reply)
        setBarState('result')
        if (!isQuestionOnly) startResultTimer()
        return
      }

      setBarState('executing')
      const finalReply = await executeToolCalls(toolCalls, router, reply, (msg) => setProgressText(msg))
      setReplyText(finalReply)
      setBarState('result')
      startResultTimer()
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Something went wrong')
      setBarState('error')
    }
  }, [input, tripId, context, router, startResultTimer])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    else if (e.key === 'Escape') { setBarState('idle'); setInput(''); setErrorText('') }
  }, [handleSubmit])

  const handleRetry = useCallback(() => {
    setBarState('focused'); setErrorText('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
         style={{ bottom: 'calc(env(safe-area-inset-bottom, 16px) + 4px)' }}>
      <AnimatePresence mode="wait">
        {barState === 'idle' ? (
          <motion.button
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => setBarState('focused')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          >
            <Spark size={14} className="text-[var(--trip-base)]" />
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Ask or do anything...</span>
            <NavArrowDown size={12} className="text-gray-400" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 10, scaleX: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleX: 1 }}
            exit={{ opacity: 0, y: -10, scaleX: 0.9 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden min-w-[320px] max-w-[600px] w-[90vw]"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Spark size={14} className="text-[var(--trip-base)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add an activity, ask a question..."
                disabled={barState === 'submitting' || barState === 'executing'}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
              />
              {barState === 'submitting' || barState === 'executing' ? (
                <Refresh size={14} className="animate-spin text-gray-400 shrink-0" />
              ) : barState === 'focused' && input.trim() ? (
                <button onClick={handleSubmit}
                  className="w-6 h-6 rounded-full bg-[var(--trip-base)] flex items-center justify-center hover:opacity-80 transition-opacity shrink-0">
                  <NavArrowUp size={12} className="text-white" />
                </button>
              ) : null}
              {(barState === 'result' || barState === 'error') ? (
                <button onClick={() => { setBarState('idle'); setInput(''); setReplyText(''); setErrorText('') }} className="shrink-0">
                  <Xmark size={14} className="text-gray-400 hover:text-gray-600" />
                </button>
              ) : null}
            </div>

            <AnimatePresence>
              {barState === 'executing' && progressText && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 pb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{progressText}</p>
                </motion.div>
              )}
              {barState === 'result' && replyText && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 pb-2"
                  onMouseEnter={() => { isHoveringResult.current = true; clearResultTimer() }}
                  onMouseLeave={() => { isHoveringResult.current = false; startResultTimer() }}>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{replyText}</p>
                </motion.div>
              )}
              {barState === 'error' && errorText && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 pb-2 flex items-center gap-2">
                  <p className="text-xs text-red-500 flex-1">{errorText}</p>
                  <button onClick={handleRetry} className="text-xs text-[var(--trip-base)] font-medium hover:underline">Retry</button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Create `apps/web/components/trip/CommandBar.tsx`**

### Step 2: Commit

```bash
git add apps/web/components/trip/CommandBar.tsx
git commit -m "feat: add floating command bar component with all UI states"
```

- [ ] **Commit chunk 3**

## Chunk 4: Integration into TripLayout

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx`

### Step 1: Import and render CommandBar in TripLayoutContent

In `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx`:

1. Add the import at the top:
```typescript
import CommandBar from '@/components/trip/CommandBar'
```

2. Inside `TripLayoutContent`, right before the `</motion.div>` closing tag (line ~544), add the CommandBar:

```tsx
      {/* Floating command bar */}
      <CommandBar
        tripId={tripId}
        context={{
          destination: trip?.destination || '',
          tripStartDate: trip?.start_date || '',
          tripEndDate: trip?.end_date || '',
          currentDayOffset: trip?.start_date
            ? Math.max(0, Math.min(
                Math.floor((Date.now() - new Date(trip.start_date + 'T00:00:00Z').getTime()) / 86400000),
                trip?.end_date ? Math.floor((new Date(trip.end_date + 'T00:00:00Z').getTime() - new Date(trip.start_date + 'T00:00:00Z').getTime()) / 86400000) : 0
              ))
            : 0,
          existingActivityTitles: [],
        }}
      />
```

The `existingActivityTitles` starts empty because TripLayoutContent doesn't have direct access to the Yjs activities list. When `CalendarShell` mounts, the mutation store populates and the CommandBar will have access via `getAllActivities()` at execution time. For the API prompt context, we pass an empty array — acceptable for v1 because the prompt still works for relative-day commands without it.

- [ ] **Import CommandBar and render it in TripLayoutContent**

### Step 2: Commit

```bash
git add apps/web/app/\(dashboard\)/trip/\[id\]/trip-layout-inner.tsx
git commit -m "feat: integrate command bar into trip layout"
```

- [ ] **Commit chunk 4**

## Chunk 5: Testing

### Step 1: Test the API route directly

Run the dev server and test with curl:

```bash
curl -X POST http://localhost:3000/api/trip/command?dry_run=true \
  -H 'Content-Type: application/json' \
  -d '{"tripId":"test","message":"add dinner at Nobu tomorrow at 8pm","context":{"destination":"Tokyo","tripStartDate":"2026-05-10","tripEndDate":"2026-05-17","currentDayOffset":3,"existingActivityTitles":["Flight to Tokyo"]}}'
```

Expected: Returns JSON with `rawResponse`, `parsed`, and `toolCalls` containing one `addActivity` call.

- [ ] **Test API with dry_run**

### Step 2: Test various phrasings

Test with: "move the flight to day 2", "remove the hotel", "what's the weather like?", "navigate to calendar", "add a flight AA 123 from JFK to NRT tomorrow at 9am"

- [ ] **Test multiple command phrasings**

### Step 3: Verify the UI renders

Navigate to any trip page. Verify:
- The floating pill shows at bottom center
- Clicking it expands the input
- Typing and pressing Enter submits
- The result/error state displays correctly

- [ ] **Verify CommandBar renders in trip layout**

### Step 4: Verify mutation store bridge

Navigate to the calendar page. The CalendarShell should call `setCommandMutations`. Verify by checking that `addActivity` works through the command bar when on the calendar page.

- [ ] **Verify mutation bridge works from calendar page**

### Step 5: Commit

```bash
git commit -m "test: verify command bar API and UI integration"
```

- [ ] **Commit chunk 5**

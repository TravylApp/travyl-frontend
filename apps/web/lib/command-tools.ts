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

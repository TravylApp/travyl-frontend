import { supabase } from './supabase'
import type { EnrichedAuditEntry, ItineraryEditRow, TimelineGroup } from '../types'

export interface FetchAuditOptions {
  limit?: number
}

/**
 * Fetches itinerary edit entries with profile display name resolution.
 */
export async function fetchAuditEntries(
  tripId: string,
  options: FetchAuditOptions = {},
): Promise<EnrichedAuditEntry[]> {
  const { data: edits, error } = await supabase
    .from('itinerary_edits')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 100)

  if (error) {
    console.error('[historyService] Error fetching audit entries:', error.message, error.details)
    return []
  }
  if (!edits) return []

  const userIds = [...new Set(edits.map((e) => e.user_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)

  const nameMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    nameMap[p.id] = p.display_name ?? 'Unknown'
  }

  return edits.map((e) => ({
    ...e,
    displayName: e.user_id ? (nameMap[e.user_id] ?? 'Unknown') : 'Unknown',
    activityName:
      (e.new_data as any)?.title ??
      (e.original_data as any)?.title ??
      (e.new_data as any)?.activity_name ??
      (e.original_data as any)?.activity_name ??
      (e.activity_id ? 'Activity' : 'Trip'),
  }))
}

/**
 * Groups audit entries into timeline windows.
 * Entries within `windowMinutes` of each other are bundled together.
 */
export function groupAuditEntries(
  entries: EnrichedAuditEntry[],
  windowMinutes: number = 3,
): TimelineGroup[] {
  if (entries.length === 0) return []

  const groups: TimelineGroup[] = []
  let currentEntries: EnrichedAuditEntry[] = []
  let currentStart: Date | null = null

  for (const entry of entries) {
    const ts = new Date(entry.created_at)

    if (!currentStart) {
      currentStart = ts
      currentEntries = [entry]
      continue
    }

    const diffMs = currentStart.getTime() - ts.getTime()
    if (diffMs <= windowMinutes * 60 * 1000) {
      currentEntries.push(entry)
    } else {
      groups.push(buildGroup(currentEntries))
      currentStart = ts
      currentEntries = [entry]
    }
  }

  if (currentEntries.length > 0) {
    groups.push(buildGroup(currentEntries))
  }

  return groups
}

function buildGroup(entries: EnrichedAuditEntry[]): TimelineGroup {
  const ts = entries[0].created_at
  const date = new Date(ts)
  const label = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return {
    id: `group-${entries[0].id}`,
    entries,
    label,
    timestamp: ts,
    earliestId: entries[0].id,
  }
}

/**
 * Builds a restore plan: for each entry after `targetTimestamp`,
 * returns the reverse operation needed. The plan is ordered from
 * most recent to oldest, so executing in order reverses state
 * back to the target point.
 */
export function buildRestorePlan(
  entries: EnrichedAuditEntry[],
  targetTimestamp: string,
): EnrichedAuditEntry[] {
  const target = new Date(targetTimestamp).getTime()

  // Collect entries that happened AFTER the target point
  const after = entries
    .filter((e) => new Date(e.created_at).getTime() > target)
    // Process from most recent to oldest
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Filter out revert entries — they shouldn't be re-reverted as part of bulk restore
  return after.filter((e) => e.edit_type !== 'revert')
}

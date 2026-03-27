import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'

export interface AuditEntry {
  id: string
  activity_id: string
  edit_type: 'create' | 'delete' | 'move' | 'edit' | 'revert'
  original_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  user_id: string | null
  created_at: string
  displayName: string   // merged from profiles
  activityName: string  // best-effort from new_data or original_data
}

async function fetchHistory(tripId: string): Promise<AuditEntry[]> {
  const { data: edits, error } = await supabase!
    .from('itinerary_edits')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !edits) return []

  const userIds = [...new Set(edits.map((e) => e.user_id).filter(Boolean))]
  const { data: profiles } = await supabase!
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
      'Activity',
  }))
}

export function useActivityHistory(tripId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['activity-history', tripId],
    queryFn: () => fetchHistory(tripId),
    enabled,
    staleTime: 0,
  })
}

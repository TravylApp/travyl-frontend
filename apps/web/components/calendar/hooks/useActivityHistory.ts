import { useQuery } from '@tanstack/react-query'
import { fetchAuditEntries } from '@travyl/shared'
import type { EnrichedAuditEntry } from '@travyl/shared'

export type AuditEntry = EnrichedAuditEntry
export type { EnrichedAuditEntry }

export function useActivityHistory(tripId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['activity-history', tripId],
    queryFn: () => fetchAuditEntries(tripId),
    enabled,
    staleTime: 0,
  })
}

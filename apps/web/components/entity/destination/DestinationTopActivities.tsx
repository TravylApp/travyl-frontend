'use client'

import { useQuery } from '@tanstack/react-query'
import { NearbySection } from '@/components/entity/NearbySection'
import type { SuggestionCard } from '@travyl/shared'

interface Props {
  destinationName: string
}

export function DestinationTopActivities({ destinationName }: Props) {
  const { data } = useQuery({
    queryKey: ['destination-activities', destinationName],
    queryFn: async () => {
      const params = new URLSearchParams({
        destination: destinationName,
        category: 'sightseeing',
      })
      const res = await fetch(`/api/suggest?${params}`)
      if (!res.ok) return []
      const json = await res.json() as { suggestions?: SuggestionCard[] }
      return json.suggestions ?? []
    },
    staleTime: 1000 * 60 * 60,
  })

  if (!data?.length) return null

  const items = data.map((s) => ({
    id: s.id,
    name: s.name,
    image: s.imageUrl || s.imageUrls?.[0] || '',
    type: s.category ?? 'Activity',
    rating: s.rating ?? null,
    href: `/activity/${s.id}`,
  }))

  return <NearbySection title="Top Activities" items={items} />
}

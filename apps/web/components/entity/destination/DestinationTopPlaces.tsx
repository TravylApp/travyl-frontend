'use client'

import { useQuery } from '@tanstack/react-query'
import { NearbySection } from '@/components/entity/NearbySection'
import type { PlaceItem } from '@travyl/shared'

interface Props {
  destinationName: string
  latitude: number
  longitude: number
}

export function DestinationTopPlaces({ destinationName, latitude, longitude }: Props) {
  const { data: places } = useQuery({
    queryKey: ['destination-places', destinationName, latitude, longitude],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: destinationName,
        lat: String(latitude),
        lng: String(longitude),
        limit: '8',
        category: 'sightseeing',
      })
      const res = await fetch(`/api/places?${params}`)
      if (!res.ok) return []
      return res.json() as Promise<PlaceItem[]>
    },
    staleTime: 1000 * 60 * 60,
  })

  if (!places?.length) return null

  const items = places.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.image,
    type: p.category ?? p.type ?? 'Attraction',
    rating: p.rating ?? null,
    href: `/place/${p.id}`,
  }))

  return <NearbySection title="Top Places to See" items={items} />
}

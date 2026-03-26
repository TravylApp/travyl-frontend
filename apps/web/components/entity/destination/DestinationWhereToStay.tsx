'use client'

import { useQuery } from '@tanstack/react-query'
import { NearbySection } from '@/components/entity/NearbySection'
import type { PlaceItem } from '@travyl/shared'

interface Props {
  destinationName: string
  latitude: number
  longitude: number
}

export function DestinationWhereToStay({ destinationName, latitude, longitude }: Props) {
  const { data: hotels } = useQuery({
    queryKey: ['destination-hotels', destinationName, latitude, longitude],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: `${destinationName} hotel`,
        lat: String(latitude),
        lng: String(longitude),
        limit: '8',
        category: 'hotel',
      })
      const res = await fetch(`/api/places?${params}`)
      if (!res.ok) return []
      return res.json() as Promise<PlaceItem[]>
    },
    staleTime: 1000 * 60 * 60,
  })

  if (!hotels?.length) return null

  const items = hotels.map((h) => ({
    id: h.id,
    name: h.name,
    image: h.image,
    type: 'Hotel',
    rating: h.rating ?? null,
    href: `/hotel/${h.id}`,
  }))

  return <NearbySection title="Where to Stay" items={items} />
}

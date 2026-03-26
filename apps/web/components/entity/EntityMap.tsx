'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'iconoir-react'
import { EntitySection } from './EntitySection'

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false })

interface Props {
  latitude: number
  longitude: number
  address?: string | null
  name: string
}

export function EntityMap({ latitude, longitude, address, name }: Props) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address ?? name
  )}&query_place_id=`

  return (
    <EntitySection title="Location">
      {address && (
        <div className="flex items-start gap-2 mb-4">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700">{address}</p>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-gray-200 h-64 md:h-80">
        <LeafletMap lat={latitude} lng={longitude} label={name} height="100%" />
      </div>

      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#003594] hover:text-[#002B7A] transition-colors"
      >
        <MapPin className="w-3.5 h-3.5" />
        Open in Google Maps
      </a>
    </EntitySection>
  )
}

'use client'

import dynamic from 'next/dynamic'

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false })

interface Props {
  latitude: number
  longitude: number
  label?: string
  className?: string
}

export function EntityMap({ latitude, longitude, label, className }: Props) {
  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 ${className ?? 'h-[200px]'}`}>
      <LeafletMap lat={latitude} lng={longitude} label={label} />
    </div>
  )
}
